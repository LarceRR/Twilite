import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useCallback } from 'react';

import { useServices, useUseCases } from '@/app/providers/ContainerProvider';
import { useUiStore } from '@/app/stores/uiStore';
import { toAppError } from '@/shared/errors';

import { email as toEmail } from '../../domain/value-objects/Email';
import { useAuthStore } from '../stores/authStore';

export type AuthActions = {
  readonly signIn: (input: { readonly email: string; readonly password: string }) => void;
  readonly signUp: (input: {
    readonly email: string;
    readonly password: string;
    readonly displayName: string;
  }) => void;
  readonly signOut: () => void;
  readonly isPending: boolean;
  readonly error: unknown;
};

export function useAuthActions(): AuthActions {
  const useCases = useUseCases();
  const { sessions, logger } = useServices();
  const queryClient = useQueryClient();
  const showToast = useUiStore((state) => state.showToast);
  const setSession = useAuthStore((state) => state.setSession);
  const setProfile = useAuthStore((state) => state.setProfile);

  const onFailure = useCallback(
    (error: unknown) => {
      const appError = toAppError(error);
      logger.warn('Ошибка аутентификации', { message: appError.message });
      showToast(appError.message, 'negative');
    },
    [logger, showToast],
  );

  const signInMutation = useMutation({
    mutationFn: (input: { readonly email: string; readonly password: string }) => {
      console.log('[auth] sign-in pressed', {
        email: input.email,
      });

      return useCases.signIn({
        type: 'email',
        email: toEmail(input.email),
        password: input.password,
      });
    },
    onSuccess: (session) => {
      sessions.adopt(session);
      setSession(session);
      void queryClient.invalidateQueries();
    },
    onError: onFailure,
  });

  const signUpMutation = useMutation({
    mutationFn: (input: {
      readonly email: string;
      readonly password: string;
      readonly displayName: string;
    }) =>
      useCases.signUp({
        email: toEmail(input.email),
        password: input.password,
        displayName: input.displayName,
      }),
    onSuccess: (session) => {
      sessions.adopt(session);
      setSession(session);
      void queryClient.invalidateQueries();
    },
    onError: onFailure,
  });

  const signOutMutation = useMutation({
    mutationFn: () => useCases.signOut(),
    onSuccess: () => {
      sessions.adopt(null);
      setSession(null);
      setProfile(null);
      queryClient.clear();
    },
    onError: onFailure,
  });

  return {
    signIn: useCallback(
      (input) => {
        signInMutation.mutate(input);
      },
      [signInMutation],
    ),
    signUp: useCallback(
      (input) => {
        signUpMutation.mutate(input);
      },
      [signUpMutation],
    ),
    signOut: useCallback(() => {
      signOutMutation.mutate();
    }, [signOutMutation]),
    isPending: signInMutation.isPending || signUpMutation.isPending || signOutMutation.isPending,
    error: signInMutation.error ?? signUpMutation.error ?? signOutMutation.error,
  };
}
