import GObject from 'gi://GObject';

import {
    QuickToggle,
} from 'resource:///org/gnome/shell/ui/quickSettings.js';

import {
    gettext as _,
} from 'resource:///org/gnome/shell/extensions/extension.js';

import {
    RunningAppItem,
} from './runningAppItem.js';


export const RunningAppsToggle =
GObject.registerClass(
class RunningAppsToggle
extends QuickToggle {
    _init() {
        super._init({
            hasMenu: true,
            iconName:
                'preferences-desktop-multitasking-symbolic',
        });

      this.menu.actor.style =
            'max-height: 600px;';

      this.title =
            _('Running Apps');

        this.add_style_class_name(
            'running-apps-quick-toggle'
        );

        this.menu.setHeader(
            'preferences-desktop-multitasking-symbolic',
            _('Running Apps')
        );

        this._items =
            new Map();

        /*
         * GNOME normally assumes one submenu level:
         *
         * root
         *   -> submenu
         *
         * We have:
         *
         * root
         *   -> RunningAppItem.menu
         *      -> DBusMenu submenu
         *
         * Opening the DBusMenu submenu must not close
         * RunningAppItem.menu.
         */
        this._originalSetOpenedSubMenu =
            this.menu._setOpenedSubMenu;

        this.menu._setOpenedSubMenu =
            submenu => {
                this._setOpenedSubMenu(
                    submenu
                );
            };

        this.connect(
            'popup-menu',
            () => {
                this.menu.open();
            }
        );

        this.connect(
                   'destroy',
                   () => this._onDestroy()
               );

    }


    _setOpenedSubMenu(submenu) {
        const current =
            this.menu._openedSubMenu;

        /*
         * GNOME uses null when a submenu closes.
         */
        if (!submenu) {
            if (
                current &&
                !current.isOpen
            ) {
                this.menu._openedSubMenu =
                    null;
            }

            return;
        }

        /*
         * Nothing open yet.
         */
        if (!current) {
            this.menu._openedSubMenu =
                submenu;

            return;
        }

        if (current === submenu)
            return;

        /*
         * Critical case:
         *
         * current:
         *     RunningAppItem.menu
         *
         * submenu:
         *     NordVPN submenu
         *
         * The new submenu is inside the currently-open menu,
         * so DO NOT close current.
         *
         * Also keep _openedSubMenu pointing at the outer menu.
         * This is important: otherwise opening a sibling nested
         * submenu can cause GNOME to lose the outer branch.
         */
        if (
            this._isDescendantMenu(
                submenu,
                current
            )
        ) {
            return;
        }

        /*
         * If current is nested inside the newly opened menu,
         * close the deeper menu and make the parent current.
         */
        if (
            this._isDescendantMenu(
                current,
                submenu
            )
        ) {
            try {
                current.close(
                    true
                );
            } catch {
                // Already closed/disposed.
            }

            this.menu._openedSubMenu =
                submenu;

            return;
        }

        /*
         * Separate branches.
         *
         * Example:
         *
         * App A.menu
         * App B.menu
         *
         * Opening B should close A, matching normal GNOME
         * behaviour.
         */
        try {
            current.close(
                true
            );
        } catch {
            // Already closed/disposed.
        }

        this.menu._openedSubMenu =
            submenu;
    }


    _isDescendantMenu(
        menu,
        ancestor
    ) {
        let current =
            menu?._parent ??
            null;

        while (current) {
            if (
                current === ancestor
            ) {
                return true;
            }

            current =
                current._parent ??
                null;
        }

        return false;
    }


    get itemCount() {
        return this._items.size;
    }


    addIndicator(indicator) {
        if (
            this._items.has(
                indicator.uniqueId
            )
        ) {
            return;
        }

        const item =
            new RunningAppItem(
                indicator
            );

        this._items.set(
            indicator.uniqueId,
            item
        );

        this.menu.addMenuItem(
            item
        );
    }


    removeIndicator(indicator) {
        const item =
            this._items.get(
                indicator.uniqueId
            );

        if (!item)
            return;

        this._items.delete(
            indicator.uniqueId
        );

        item.destroy();
    }


    vfunc_clicked() {
        this.menu.open();
    }


    _onDestroy() {
        /*
         * Restore GNOME's original method.
         *
         * No super.destroy() here.
         */
        if (
            this._originalSetOpenedSubMenu
        ) {
            this.menu._setOpenedSubMenu =
                this._originalSetOpenedSubMenu;
        }

        this._originalSetOpenedSubMenu =
            null;

        for (
            const item
            of this._items.values()
        ) {
            item.destroy();
        }

        this._items.clear();
    }
});
