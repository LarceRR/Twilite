/** Route names, kept in one place so navigation calls are not stringly typed. */
export const routes = {
  space: '/',
  timeline: '/timeline',
  ai: '/ai',
  profile: '/profile',
  create: '/create',
  momentCatalog: '/moment-catalog',
  momentFilters: '/moment-filters',
  devices: '/devices',
  deviceSession: '/devices/[sessionId]',
  qrScan: '/qr-scan',
  settings: '/settings',
  themeCatalog: '/theme-catalog',
  billing: '/billing',
  admin: '/admin',
  adminUsers: '/admin/users',
  adminUser: '/admin/users/[id]',
  adminPermissions: '/admin/permissions',
  adminGroups: '/admin/groups',
  adminGroup: '/admin/groups/[id]',
  signIn: '/sign-in',
  signUp: '/sign-up',
} as const;

export type RouteName = keyof typeof routes;
export type RoutePath = (typeof routes)[RouteName];
