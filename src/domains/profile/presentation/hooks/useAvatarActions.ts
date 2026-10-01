import { useActionSheet } from '@expo/react-native-action-sheet';
import * as FileSystem from 'expo-file-system/legacy';
import * as ImagePicker from 'expo-image-picker';
import { useCallback, useState } from 'react';

import { useContainer, useServices } from '@/app/providers/ContainerProvider';
import { useUiStore } from '@/app/stores/uiStore';
import type { AvatarContentType } from '@/domains/auth/domain/repositories/AuthRepository';
import { useAuthStore } from '@/domains/auth/presentation/stores/authStore';
import { toAppError } from '@/shared/errors';

const AVATAR_MAX_BYTES = 2 * 1024 * 1024;
const ALLOWED_TYPES = new Set<string>(['image/jpeg', 'image/png', 'image/webp']);

type PickedAvatar = {
  readonly uri: string;
  readonly contentType: AvatarContentType;
  readonly byteSize: number;
};

export type AvatarActions = {
  readonly isBusy: boolean;
  /** One native bottom ActionSheet: update / delete / cancel. */
  readonly openAvatarMenu: () => void;
};

function normalizeContentType(
  raw: string | null | undefined,
  uri: string,
): AvatarContentType | null {
  const mime = (raw ?? '').toLowerCase().trim();

  if (ALLOWED_TYPES.has(mime)) {
    return mime as AvatarContentType;
  }

  const lower = uri.toLowerCase();

  if (lower.endsWith('.jpg') || lower.endsWith('.jpeg')) return 'image/jpeg';
  if (lower.endsWith('.png')) return 'image/png';
  if (lower.endsWith('.webp')) return 'image/webp';

  return null;
}

async function readByteSize(uri: string, reported: number | null | undefined): Promise<number> {
  if (typeof reported === 'number' && reported > 0) {
    return reported;
  }

  const info = await FileSystem.getInfoAsync(uri);

  if (!info.exists || typeof info.size !== 'number') {
    throw new Error('Не удалось определить размер файла');
  }

  return info.size;
}

async function uploadToR2(
  uploadUrl: string,
  headers: { readonly 'Content-Type': string; readonly 'Cache-Control': string },
  uri: string,
): Promise<void> {
  const result = await FileSystem.uploadAsync(uploadUrl, uri, {
    httpMethod: 'PUT',
    uploadType: FileSystem.FileSystemUploadType.BINARY_CONTENT,
    headers: {
      'Content-Type': headers['Content-Type'],
      'Cache-Control': headers['Cache-Control'],
    },
  });

  if (result.status < 200 || result.status >= 300) {
    throw new Error(`Не удалось загрузить файл (${result.status})`);
  }
}

/**
 * Profile avatar flow using Expo's cross-platform ActionSheet
 * (`@expo/react-native-action-sheet`: native UIActionSheet on iOS, JS sheet on Android)
 * + `expo-image-picker` for gallery/camera. No custom Modal / BottomSheet overlay.
 */
export function useAvatarActions(): AvatarActions {
  const { showActionSheetWithOptions } = useActionSheet();
  const { repositories } = useContainer();
  const { isSandbox, logger } = useServices();
  const auth = repositories.auth;
  const showToast = useUiStore((state) => state.showToast);
  const setProfile = useAuthStore((state) => state.setProfile);
  const profile = useAuthStore((state) => state.profile);
  const [isBusy, setBusy] = useState(false);

  const hasAvatar = typeof profile?.avatarUrl === 'string' && profile.avatarUrl.length > 0;

  const applyPicked = useCallback(
    async (picked: PickedAvatar) => {
      setBusy(true);

      try {
        if (isSandbox) {
          const next = await auth.updateProfile({ avatarUrl: picked.uri });
          setProfile(next);
          showToast('Аватар обновлён', 'positive');
          return;
        }

        const ticket = await auth.createAvatarUpload({
          contentType: picked.contentType,
          byteSize: picked.byteSize,
        });

        await uploadToR2(ticket.uploadUrl, ticket.headers, picked.uri);
        const next = await auth.confirmAvatar(ticket.assetId);
        setProfile(next);
        showToast('Аватар обновлён', 'positive');
      } catch (error) {
        const appError = toAppError(error);
        logger.warn('Не удалось обновить аватар', { message: appError.message });
        showToast(appError.message, 'negative');
      } finally {
        setBusy(false);
      }
    },
    [auth, isSandbox, logger, setProfile, showToast],
  );

  const consumeAsset = useCallback(
    async (asset: ImagePicker.ImagePickerAsset) => {
      const contentType = normalizeContentType(asset.mimeType, asset.uri);

      if (contentType === null) {
        showToast('Поддерживаются JPEG, PNG и WebP', 'negative');
        return;
      }

      const byteSize = await readByteSize(asset.uri, asset.fileSize);

      if (byteSize > AVATAR_MAX_BYTES) {
        showToast('Файл больше 2 МБ — выберите другое фото', 'negative');
        return;
      }

      await applyPicked({ uri: asset.uri, contentType, byteSize });
    },
    [applyPicked, showToast],
  );

  const pickFromLibrary = useCallback(async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (!permission.granted) {
      showToast('Нужен доступ к фото', 'negative');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.85,
    });

    if (result.canceled || result.assets[0] === undefined) {
      return;
    }

    await consumeAsset(result.assets[0]);
  }, [consumeAsset, showToast]);

  const pickFromCamera = useCallback(async () => {
    const permission = await ImagePicker.requestCameraPermissionsAsync();

    if (!permission.granted) {
      showToast('Нужен доступ к камере', 'negative');
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.85,
    });

    if (result.canceled || result.assets[0] === undefined) {
      return;
    }

    await consumeAsset(result.assets[0]);
  }, [consumeAsset, showToast]);

  const removeAvatar = useCallback(async () => {
    setBusy(true);

    try {
      const next = await auth.updateProfile({ avatarUrl: null });
      setProfile(next);
      showToast('Аватар удалён', 'neutral');
    } catch (error) {
      const appError = toAppError(error);
      logger.warn('Не удалось удалить аватар', { message: appError.message });
      showToast(appError.message, 'negative');
    } finally {
      setBusy(false);
    }
  }, [auth, logger, setProfile, showToast]);

  const openSourcePicker = useCallback(() => {
    showActionSheetWithOptions(
      {
        options: ['Выбрать из галереи', 'Сделать фото', 'Отмена'],
        cancelButtonIndex: 2,
      },
      (buttonIndex) => {
        if (buttonIndex === 0) void pickFromLibrary();
        if (buttonIndex === 1) void pickFromCamera();
      },
    );
  }, [pickFromCamera, pickFromLibrary, showActionSheetWithOptions]);

  const openAvatarMenu = useCallback(() => {
    if (isBusy) return;

    if (hasAvatar) {
      showActionSheetWithOptions(
        {
          options: ['Обновить фотографию', 'Удалить', 'Отмена'],
          destructiveButtonIndex: 1,
          cancelButtonIndex: 2,
        },
        (buttonIndex) => {
          if (buttonIndex === 0) openSourcePicker();
          if (buttonIndex === 1) void removeAvatar();
        },
      );
      return;
    }

    showActionSheetWithOptions(
      {
        options: ['Обновить фотографию', 'Отмена'],
        cancelButtonIndex: 1,
      },
      (buttonIndex) => {
        if (buttonIndex === 0) openSourcePicker();
      },
    );
  }, [hasAvatar, isBusy, openSourcePicker, removeAvatar, showActionSheetWithOptions]);

  return { isBusy, openAvatarMenu };
}
