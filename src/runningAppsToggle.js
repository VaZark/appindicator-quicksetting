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

        this.connect(
            'popup-menu',
            () => {
                this.menu.open();
            }
        );
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


    destroy() {
        for (
            const item
            of this._items.values()
        ) {
            item.destroy();
        }

        this._items.clear();

        super.destroy();
    }
});
