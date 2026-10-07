import { create } from 'zustand';

export type ActiveSheet =
  | { readonly type: 'none' }
  | { readonly type: 'spacePicker' };

export type Toast = {
  readonly id: number;
  readonly message: string;
  readonly tone: 'neutral' | 'positive' | 'negative';
};

type UiState = {
  readonly sheet: ActiveSheet;
  readonly toast: Toast | null;
  openSheet: (sheet: ActiveSheet) => void;
  closeSheet: () => void;
  showToast: (message: string, tone?: Toast['tone']) => void;
  dismissToast: () => void;
};

let toastSequence = 0;

export const useUiStore = create<UiState>()((set) => ({
  sheet: { type: 'none' },
  toast: null,
  openSheet: (sheet) => set({ sheet }),
  closeSheet: () => set({ sheet: { type: 'none' } }),
  showToast: (message, tone = 'neutral') => {
    toastSequence += 1;
    set({ toast: { id: toastSequence, message, tone } });
  },
  dismissToast: () => set({ toast: null }),
}));
