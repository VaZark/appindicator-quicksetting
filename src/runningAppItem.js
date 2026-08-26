import GObject from 'gi://GObject';
import St from 'gi://St';

import * as PopupMenu
    from 'resource:///org/gnome/shell/ui/popupMenu.js';

import {
    DBusMenuClient,
} from './dbusMenu.js';

import {
    SNIStatus,
} from './statusNotifierItem.js';


export const RunningAppItem =
GObject.registerClass(
class RunningAppItem
extends PopupMenu.PopupSubMenuMenuItem {
    _init(indicator) {
        super._init(
            getName(indicator)
        );

        this._indicator =
            indicator;

        this._dbusMenu =
            null;

        this._signals =
            [];

        this._icon =
            new St.Icon({
                iconName:
                    'application-x-executable-symbolic',

                styleClass:
                    'popup-menu-icon',

                iconSize:
                    20,
            });

        this.insert_child_at_index(
            this._icon,
            1
        );

        this._signals.push(
            indicator.connect(
                'changed',
                () => {
                    this._sync();
                }
            )
        );

        this._signals.push(
            indicator.connect(
                'status-changed',
                () => {
                    this._sync();
                }
            )
        );

        this._signals.push(
            indicator.connect(
                'icon-changed',
                () => {
                    this._syncIcon();
                }
            )
        );

        this._signals.push(
            indicator.connect(
                'menu-changed',
                () => {
                    this._setupMenu();
                }
            )
        );

        this._sync();
        this._setupMenu();
    }


    _sync() {
        this.label.text =
            getName(
                this._indicator
            );

        this.visible =
            this._indicator.status !==
            SNIStatus.PASSIVE;

        this._syncIcon();
    }


    _syncIcon() {
        const name =
            this._indicator.status ===
            SNIStatus.NEEDS_ATTENTION
                ? this._indicator
                    .attentionIconName
                : this._indicator
                    .iconName;

        this._icon.iconName =
            name ||
            'application-x-executable-symbolic';
    }


    _setupMenu() {
        this._dbusMenu?.destroy();

        this._dbusMenu =
            null;

        this.menu.removeAll();

        const path =
            this._indicator.menuPath;

        if (!path)
            return;

        try {
            this._dbusMenu =
                new DBusMenuClient(
                    this._indicator.busName,
                    path
                );

            this._dbusMenu.attachToMenu(
                this.menu
            );
        } catch (e) {
            logError(
                e,
                `Unable to attach menu for ${this._indicator.id}`
            );
        }
    }


    destroy() {
        this._dbusMenu?.destroy();

        this._dbusMenu =
            null;

        for (
            const id
            of this._signals
        ) {
            try {
                this._indicator
                    ?.disconnect(id);
            } catch {
                // item may already be destroyed
            }
        }

        this._signals = [];

        this._indicator =
            null;

        super.destroy();
    }
});


function getName(indicator) {
    return (
        indicator.title ||
        indicator.label ||
        indicator.id ||
        'Application'
    );
}
