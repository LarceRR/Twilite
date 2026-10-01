import { create } from 'zustand';

type PendingQrLoginState = {
  readonly token: string | null;
  setToken: (token: string | null) => void;
};

export const usePendingQrLoginStore = create<PendingQrLoginState>()((set) => ({
  token: null,
  setToken: (token) => set({ token }),
}));

export function postAuthHref(): '/qr-confirm' | '/' {
  return usePendingQrLoginStore.getState().token !== null ? '/qr-confirm' : '/';
}
