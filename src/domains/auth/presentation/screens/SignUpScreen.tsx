import { useRouter } from 'expo-router';
import { type ReactElement, useEffect, useState } from 'react';

import { Button } from '@/design-system/components/Button/Button';
import { Screen } from '@/design-system/components/Screen/Screen';
import { Text } from '@/design-system/components/Text/Text';
import { useAuthStore } from '@/domains/auth/presentation/stores/authStore';
import { postAuthHref } from '@/domains/auth/presentation/stores/pendingQrLoginStore';
import { isEmail } from '../../domain/value-objects/Email';
import { AuthForm } from '../components/AuthForm';
import { useAuthActions } from '../hooks/useAuthActions';

const MIN_PASSWORD_LENGTH = 8;

export function SignUpScreen(): ReactElement {
  const router = useRouter();
  const auth = useAuthActions();
  const status = useAuthStore((state) => state.status);
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  useEffect(() => {
    if (status === 'authenticated') router.replace(postAuthHref());
  }, [router, status]);

  const canSubmit =
    displayName.trim().length > 0 && isEmail(email) && password.length >= MIN_PASSWORD_LENGTH;

  return (
    <Screen
      title="Создать аккаунт"
      subtitle="Личное пространство создастся само"
      reserveTabBar={false}
    >
      <AuthForm
        fields={[
          {
            id: 'name',
            label: 'Как вас называть',
            value: displayName,
            onChange: setDisplayName,
            placeholder: 'Имя',
            autoComplete: 'name',
          },
          {
            id: 'email',
            label: 'Почта',
            value: email,
            onChange: setEmail,
            placeholder: 'you@example.com',
            autoComplete: 'email',
            keyboardType: 'email-address',
          },
          {
            id: 'password',
            label: 'Пароль',
            value: password,
            onChange: setPassword,
            placeholder: 'Минимум 8 символов',
            secure: true,
            autoComplete: 'new-password',
          },
        ]}
      />
      <Button
        label="Создать"
        disabled={!canSubmit}
        loading={auth.isPending}
        onPress={() => auth.signUp({ email, password, displayName: displayName.trim() })}
      />
      <Button
        label="У меня есть аккаунт"
        variant="ghost"
        onPress={() => router.replace('/sign-in')}
      />
      <Text variant="caption" align="center">
        Мы не публикуем ничего и не показываем ваши моменты другим.
      </Text>
    </Screen>
  );
}
