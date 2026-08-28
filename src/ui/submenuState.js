export function setOpenedSubMenu(rootMenu, submenu) {
  const current = rootMenu._openedSubMenu;

  if (!submenu) {
    if (current && !current.isOpen) rootMenu._openedSubMenu = null;
    return;
  }

  if (!current) {
    rootMenu._openedSubMenu = submenu;
    return;
  }

  if (current === submenu || isDescendantMenu(submenu, current)) return;

  if (isDescendantMenu(current, submenu)) {
    closeMenu(current);
    rootMenu._openedSubMenu = submenu;
    return;
  }

  closeMenu(current);
  rootMenu._openedSubMenu = submenu;
}

export function isDescendantMenu(menu, ancestor) {
  let current = menu?._parent ?? null;

  while (current) {
    if (current === ancestor) return true;
    current = current._parent ?? null;
  }

  return false;
}

function closeMenu(menu) {
  try {
    menu.close(true);
  } catch {
    // Already closed/disposed.
  }
}
