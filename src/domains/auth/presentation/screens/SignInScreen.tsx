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

export function SignInScreen(): ReactElement {
  const router = useRouter();
  const auth = useAuthActions();
  const status = useAuthStore((state) => state.status);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  useEffect(() => {
    if (status === 'authenticated') router.replace(postAuthHref());
  }, [router, status]);

  const canSubmit = isEmail(email) && password.length >= MIN_PASSWORD_LENGTH;

  return (
    <Screen title="Вход" subtitle="Пространство останется на месте" reserveTabBar={false}>
      <AuthForm
        fields={[
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
            autoComplete: 'password',
          },
        ]}
      />
      <Button
        label="Войти"
        disabled={!canSubmit}
        loading={auth.isPending}
        onPress={() => auth.signIn({ email, password })}
      />
      <Button label="Создать аккаунт" variant="ghost" onPress={() => router.replace('/sign-up')} />
      <Text variant="caption" align="center">
        Входя, вы соглашаетесь с условиями использования.
      </Text>
    </Screen>
  );
}
