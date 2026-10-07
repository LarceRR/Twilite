/** Metro image modules. Expo's bundled types no longer declare these. */
declare module '*.png' {
  const source: number;
  export default source;
}
