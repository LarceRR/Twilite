import { createContext, type ReactElement, type ReactNode, useContext, useMemo } from 'react';
import { useAuthStore } from '@/domains/auth/presentation/stores/authStore';
import { UnknownError } from '@/shared/errors';

import { createContainer } from '../container/createContainer';
import type { Container } from '../container/types';

const ContainerContext = createContext<Container | null>(null);

/**
 * Deliberately thin: it exposes the composition root and nothing else. Feature
 * state stays in its own store rather than growing a giant provider.
 */
export function ContainerProvider({ children }: { readonly children: ReactNode }): ReactElement {
  const container = useMemo(
    () =>
      createContainer({
        onSessionChange: (session) => {
          useAuthStore.getState().setSession(session);
        },
      }),
    [],
  );

  return <ContainerContext.Provider value={container}>{children}</ContainerContext.Provider>;
}

export function useContainer(): Container {
  const container = useContext(ContainerContext);

  if (container === null) {
    throw new UnknownError('ContainerProvider отсутствует в дереве компонентов');
  }

  return container;
}

export function useUseCases(): Container['useCases'] {
  return useContainer().useCases;
}

export function useServices(): Container['services'] {
  return useContainer().services;
}
