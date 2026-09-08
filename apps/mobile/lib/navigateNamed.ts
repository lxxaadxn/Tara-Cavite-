type NavLike = {
  getState?: () => { routeNames?: string[] } | undefined;
  getParent?: () => unknown;
  navigate?: (name: string, params?: object) => void;
};

/**
 * Walks up the navigator tree until it finds one that owns `name`, so header
 * buttons reach button-less tabs (Announcements, Profile) from any stack.
 */
export function navigateNamed(navigation: unknown, name: string, params?: object): boolean {
  let nav = navigation as NavLike | undefined;
  while (nav) {
    const names = nav.getState?.()?.routeNames ?? [];
    if (names.includes(name) && nav.navigate) {
      nav.navigate(name, params);
      return true;
    }
    nav = nav.getParent?.() as NavLike | undefined;
  }
  return false;
}
