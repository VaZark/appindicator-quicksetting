import Gio from 'gi://Gio';
import GLib from 'gi://GLib';
import St from 'gi://St';

import * as PopupMenu
    from 'resource:///org/gnome/shell/ui/popupMenu.js';

import {
    DBUS_MENU_IFACE,
} from './interfaces.js';


export class DBusMenuClient {
    constructor(
        busName,
        objectPath
    ) {
        this._busName =
            busName;

        this._objectPath =
            objectPath;

        this._destroyed =
            false;

        this._menu =
            null;

        this._menuSignal =
            0;

        this._proxy =
            Gio.DBusProxy.new_for_bus_sync(
                Gio.BusType.SESSION,
                Gio.DBusProxyFlags.DO_NOT_LOAD_PROPERTIES,
                null,
                busName,
                objectPath,
                DBUS_MENU_IFACE,
                null
            );

        this._signalId =
            this._proxy.connect(
                'g-signal',
                (
                    _proxy,
                    _sender,
                    signal,
                    _params
                ) => {
                    if (
                        signal ===
                            'LayoutUpdated' ||
                        signal ===
                            'ItemsPropertiesUpdated'
                    ) {
                        this.reload();
                    }
                }
            );
    }


    attachToMenu(menu) {
        this._menu =
            menu;

        this._menuSignal =
            menu.connect(
                'open-state-changed',
                (_menu, open) => {
                    if (!open)
                        return;

                    this.aboutToShow(0);
                    this.reload();
                }
            );

        this.aboutToShow(0);
        this.reload();
    }


    async reload() {
        if (
            this._destroyed ||
            !this._menu
        ) {
            return;
        }

        try {
            const result =
                await Gio.DBus.session.call(
                    this._busName,
                    this._objectPath,
                    DBUS_MENU_IFACE,
                    'GetLayout',

                    new GLib.Variant(
                        '(iias)',
                        [
                            0,
                            -1,
                            [],
                        ]
                    ),

                    null,
                    Gio.DBusCallFlags.NONE,
                    3000,
                    null
                );

            if (
                this._destroyed ||
                !this._menu
            ) {
                return;
            }

            const unpacked =
                result.deep_unpack();

            const layout =
                normalizeVariant(
                    unpacked[1]
                );

            this._render(layout);
        } catch (e) {
            if (
                e.matches?.(
                    Gio.DBusError,
                    Gio.DBusError.UNKNOWN_METHOD
                )
            ) {
                return;
            }

            logError(
                e,
                `Unable to load DBusMenu ${this._busName}${this._objectPath}`
            );
        }
    }


    _render(root) {
        if (!root || !this._menu)
            return;

        this._menu.removeAll();

        const [
            _rootId,
            _rootProperties,
            children,
        ] = root;

        for (const child of children ?? []) {
            const node =
                normalizeVariant(child);

            const item =
                this._createMenuItem(node);

            if (item)
                this._menu.addMenuItem(item);
        }
    }


    _createMenuItem(node) {
        if (!node)
            return null;

        const [
            id,
            properties,
            children,
        ] = node;

        const props =
            normalizeProperties(
                properties
            );

        if (props.visible === false)
            return null;

        if (props.type === 'separator') {
            return new PopupMenu
                .PopupSeparatorMenuItem();
        }

        const childNodes =
            (children ?? [])
                .map(normalizeVariant);

        const hasSubmenu =
            props['children-display'] ===
                'submenu' ||
            childNodes.length > 0;

        let item;

        if (hasSubmenu) {
            item =
                new PopupMenu.PopupSubMenuMenuItem(
                    cleanLabel(
                        props.label ?? ''
                    )
                );
        } else {
            item =
                new PopupMenu.PopupMenuItem(
                    cleanLabel(
                        props.label ?? ''
                    )
                );
        }

        item.setSensitive(
            props.enabled !== false
        );

        if (
            props['toggle-type'] ===
                'checkmark' &&
            props['toggle-state'] > 0
        ) {
            item.setOrnament(
                PopupMenu.Ornament.CHECK
            );
        } else if (
            props['toggle-type'] ===
                'radio' &&
            props['toggle-state'] > 0
        ) {
            item.setOrnament(
                PopupMenu.Ornament.DOT
            );
        }

        if (
            props['icon-name'] &&
            item instanceof
                PopupMenu.PopupMenuItem
        ) {
            const icon =
                new St.Icon({
                    iconName:
                        props['icon-name'],

                    styleClass:
                        'popup-menu-icon',
                });

            item.add_child(icon);
        }

        if (hasSubmenu) {
            for (const child of childNodes) {
                const childItem =
                    this._createMenuItem(
                        child
                    );

                if (childItem)
                    item.menu.addMenuItem(
                        childItem
                    );
            }

            item.menu.connect(
                'open-state-changed',
                (_menu, open) => {
                    if (!open)
                        return;

                    this.event(
                        id,
                        'opened'
                    );

                    this.aboutToShow(id);
                }
            );
        }

        if (
            item instanceof
                PopupMenu.PopupMenuItem
        ) {
            item.connect(
                'activate',
                (_item, event) => {
                    const timestamp =
                        event?.get_time?.() ??
                        0;

                    this.event(
                        id,
                        'clicked',
                        new GLib.Variant(
                            'i',
                            0
                        ),
                        timestamp
                    );
                }
            );
        }

        return item;
    }


    event(
        id,
        eventName,
        data = null,
        timestamp = 0
    ) {
        if (this._destroyed)
            return;

        data ??=
            new GLib.Variant(
                'i',
                0
            );

        Gio.DBus.session.call(
            this._busName,
            this._objectPath,
            DBUS_MENU_IFACE,
            'Event',

            new GLib.Variant(
                '(isvu)',
                [
                    id,
                    eventName,
                    data,
                    timestamp,
                ]
            ),

            null,
            Gio.DBusCallFlags.NONE,
            2000,
            null,
            (_connection, result) => {
                try {
                    Gio.DBus.session
                        .call_finish(result);
                } catch (e) {
                    logError(
                        e,
                        'DBusMenu.Event'
                    );
                }
            }
        );
    }


    async aboutToShow(id) {
        if (this._destroyed)
            return;

        try {
            const result =
                await Gio.DBus.session.call(
                    this._busName,
                    this._objectPath,
                    DBUS_MENU_IFACE,
                    'AboutToShow',

                    new GLib.Variant(
                        '(i)',
                        [id]
                    ),

                    null,
                    Gio.DBusCallFlags.NONE,
                    1000,
                    null
                );

            /*
             * Some implementations return (), despite the specification
             * requiring (b). That's why no fixed return type is used.
             */
            if (!result)
                return;

            if (
                result.is_of_type(
                    new GLib.VariantType(
                        '(b)'
                    )
                )
            ) {
                const [changed] =
                    result.deep_unpack();

                if (changed)
                    this.reload();
            }
        } catch (e) {
            /*
             * Many indicators don't implement AboutToShow correctly.
             * Treat that as optional compatibility behavior.
             */
            if (
                e.matches?.(
                    Gio.DBusError,
                    Gio.DBusError.UNKNOWN_METHOD
                ) ||
                e.matches?.(
                    Gio.DBusError,
                    Gio.DBusError.FAILED
                )
            ) {
                return;
            }

            logError(
                e,
                'DBusMenu.AboutToShow'
            );
        }
    }


    destroy() {
        if (this._destroyed)
            return;

        this._destroyed = true;

        if (
            this._menu &&
            this._menuSignal
        ) {
            try {
                this._menu.disconnect(
                    this._menuSignal
                );
            } catch {
                // menu may already be destroyed
            }
        }

        if (
            this._proxy &&
            this._signalId
        ) {
            this._proxy.disconnect(
                this._signalId
            );
        }

        this._proxy =
            null;

        this._menu =
            null;
    }
}


function normalizeVariant(value) {
    while (
        value instanceof
            GLib.Variant
    ) {
        value =
            value.deep_unpack();
    }

    if (Array.isArray(value)) {
        return value.map(
            normalizeVariant
        );
    }

    return value;
}


function normalizeProperties(values) {
    const result = {};

    for (
        const [name, value]
        of Object.entries(values ?? {})
    ) {
        result[name] =
            normalizeVariant(value);
    }

    return result;
}


function cleanLabel(label) {
    /*
     * DBusMenu uses underscore mnemonic markers.
     */
    return label.replace(
        /_([^_])/g,
        '$1'
    );
}
