export const Appearance = {
  getColorScheme: (): 'light' => 'light',
  addChangeListener: (): { remove: () => void } => ({ remove: () => undefined }),
};

export const Platform = {
  OS: 'ios' as 'ios' | 'android' | 'web',
};
