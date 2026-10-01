export const useRouter = (): { replace: () => void } => ({ replace: () => undefined });
export const useSegments = (): readonly string[] => [];
export const useFocusEffect = (_effect: () => void): void => undefined;
