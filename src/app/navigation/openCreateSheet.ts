import { routes } from './types';

type PushableRouter = {
  push: (href: typeof routes.create) => void;
};

/** Opens the root create form sheet without selecting a tab. */
export function openCreateSheet(router: PushableRouter): void {
  router.push(routes.create);
}
