import { useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, AppState } from 'react-native';

import { httpConfig, storageKeys } from '@/app/config/constants';
import { hasSessionTokens } from '@/domains/auth/domain/entities/AuthSession';
import { useAuthStore } from '@/domains/auth/presentation/stores/authStore';
import {
  type PersistedSettings,
  persistedSettings,
  useSettingsStore,
} from '@/domains/settings/presentation/stores/settingsStore';
import type { FieldConfigOverrides } from '@/domains/spaces/presentation/field/fieldConfig';
import {
  persistedFieldConfigOverrides,
  useFieldConfigStore,
} from '@/domains/spaces/presentation/field/fieldConfigStore';
import { toAppError } from '@/shared/errors';

import { loadNativeTabIconSources } from '../navigation/nativeTabIconSources';
import { usesNativeTabBar } from '../navigation/usesNativeTabBar';
import { useServices, useUseCases } from '../providers/ContainerProvider';

/** Fast local reads — keep the splash short. */
const BOOT_TIMEOUT_MS = 3_000;
/** Session restore may hit the network (profile / refresh); match HTTP budget. */
const SESSION_BOOT_TIMEOUT_MS = httpConfig.timeoutMs;

async function withTimeout<T>(
  promise: Promise<T>,
  label: string,
  timeoutMs: number = BOOT_TIMEOUT_MS,
): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error(`${label} timed out`)), timeoutMs);
  });
  try {
    return await Promise.race([promise, timeout]);
  } finally {
    if (timer !== undefined) clearTimeout(timer);
  }
}

export function useBootstrap(): { readonly isReady: boolean } {
  const { restoreSession, hydrateAppliedTheme } = useUseCases();
  const { sessions, sessionStorage, storage, offlineQueue, logger } = useServices();
  const [isReady, setIsReady] = useState(false);
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;

    const adoptCachedSession = async (): Promise<void> => {
      const cached = await sessionStorage.read();
      if (cached !== null && hasSessionTokens(cached)) {
        sessions.adopt(cached);
        useAuthStore.getState().setSession(cached);
        return;
      }

      useAuthStore.getState().setStatus('anonymous');
    };

    const run = async (): Promise<void> => {
      try {
        const settings = await withTimeout(
          storage.read<PersistedSettings>(storageKeys.settings),
          'settings restore',
        );
        if (settings !== null) useSettingsStore.getState().hydrate(settings);
      } catch (error) {
        logger.debug('Settings restore skipped', { error: String(error) });
      }

      try {
        const fieldConfig = await withTimeout(
          storage.read<FieldConfigOverrides>(storageKeys.fieldConfig),
          'field config restore',
        );
        if (fieldConfig !== null) useFieldConfigStore.getState().hydrate(fieldConfig);
      } catch (error) {
        logger.debug('Field config restore skipped', { error: String(error) });
      }

      try {
        const reduceMotion = await withTimeout(
          AccessibilityInfo.isReduceMotionEnabled(),
          'accessibility settings',
        );
        if (reduceMotion) useSettingsStore.getState().setReduceMotion(true);
      } catch (error) {
        logger.debug('Accessibility settings skipped', { error: String(error) });
      }

      try {
        const session = await withTimeout(
          restoreSession(),
          'session restore',
          SESSION_BOOT_TIMEOUT_MS,
        );
        sessions.adopt(session);
        useAuthStore.getState().setSession(session);
      } catch (error) {
        logger.warn('Session restore skipped; using cached tokens if present', {
          error: String(toAppError(error).message),
        });
        // Never force anonymous while SecureStore still has tokens — a slow
        // users/me must not bounce the user to sign-in on every cold start.
        await adoptCachedSession();
      }

      if (usesNativeTabBar()) {
        try {
          await withTimeout(loadNativeTabIconSources(), 'native tab icons');
        } catch (error) {
          logger.debug('Native tab icons skipped', { error: String(error) });
        }
      }

      try {
        await withTimeout(hydrateAppliedTheme(), 'theme hydrate');
      } catch (error) {
        logger.debug('Theme hydrate skipped', { error: String(error) });
      }

      void offlineQueue.flush();
      setIsReady(true);
    };

    void run();
  }, [
    restoreSession,
    hydrateAppliedTheme,
    sessions,
    sessionStorage,
    storage,
    offlineQueue,
    logger,
  ]);

  useEffect(
    () =>
      useSettingsStore.subscribe((state) => {
        void storage.write(storageKeys.settings, persistedSettings(state));
      }),
    [storage],
  );

  useEffect(
    () =>
      useFieldConfigStore.subscribe((state) => {
        void storage.write(
          storageKeys.fieldConfig,
          persistedFieldConfigOverrides(state),
        );
      }),
    [storage],
  );

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (status) => {
      if (status === 'active') void offlineQueue.flush();
    });
    return () => subscription.remove();
  }, [offlineQueue]);

  return { isReady };
}
