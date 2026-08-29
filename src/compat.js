import * as Config from "resource:///org/gnome/shell/misc/config.js";
import { setOpenedSubMenu } from "./ui/submenuState.js";

export const [major, minor] = Config.PACKAGE_VERSION.split(".").map((s) => Number(s));

/**
 * GNOME Shell's PopupMenu tracks a single opened submenu at the top-menu
 * level. PopupSubMenuMenuItem propagates its parent to nested submenus, so a
 * nested submenu also calls the top menu's _setOpenedSubMenu(). The stock
 * implementation closes the currently tracked submenu unconditionally,
 * which collapses our outer RunningAppItem menu.
 *
 * Keep the private Shell API touchpoint here so version-specific handling can
 * be added in one place if GNOME changes submenu tracking in a future release.
 *
 * Returns a cleanup function that restores Shell's original implementation.
 */
export function enableNestedSubmenuTracking(rootMenu) {
  const originalSetOpenedSubMenu = rootMenu._setOpenedSubMenu;

  rootMenu._setOpenedSubMenu = (submenu) => {
    setOpenedSubMenu(rootMenu, submenu);
  };

  return () => {
    if (rootMenu._setOpenedSubMenu !== originalSetOpenedSubMenu) {
      rootMenu._setOpenedSubMenu = originalSetOpenedSubMenu;
    }
  };
}
