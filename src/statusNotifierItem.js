import Gio from 'gi://Gio';
import GLib from 'gi://GLib';

import * as Signals
    from 'resource:///org/gnome/shell/misc/signals.js';

import {
    STATUS_NOTIFIER_ITEM_IFACE,
} from './interfaces.js';


export const SNIStatus = Object.freeze({
    PASSIVE: 'Passive',
    ACTIVE: 'Active',
    NEEDS_ATTENTION: 'NeedsAttention',
});


export class StatusNotifierItem extends Signals.EventEmitter {
    constructor(
        busName,
        objectPath,
        service = null
    ) {
        super();

        this.busName = busName;
        this.objectPath = objectPath;
        this.service = service ?? busName;

        this._destroyed = false;
        this._properties = new Map();

        this._proxy = Gio.DBusProxy.new_for_bus_sync(
            Gio.BusType.SESSION,
            Gio.DBusProxyFlags.NONE,
            null,
            busName,
            objectPath,
            STATUS_NOTIFIER_ITEM_IFACE,
            null
        );

        this._propertiesChangedId = this._proxy.connect(
            'g-properties-changed',
            (_proxy, changed, invalidated) => {
                this._onPropertiesChanged(
                    changed,
                    invalidated
                );
            }
        );

        this._signalId = this._proxy.connect(
            'g-signal',
            (_proxy, sender, signal, params) => {
                this._onSignal(
                    sender,
                    signal,
                    params
                );
            }
        );

        this._ownerId = this._proxy.connect(
            'notify::g-name-owner',
            () => {
                if (!this._proxy?.g_name_owner)
                    this.destroy();
            }
        );

        this._loadCachedProperties();
    }


    _loadCachedProperties() {
        const names =
            this._proxy.get_cached_property_names() ?? [];

        for (const name of names) {
            const value =
                this._proxy.get_cached_property(name);

            if (value)
                this._properties.set(name, value);
        }
    }


    _onPropertiesChanged(
        changed,
        invalidated
    ) {
        const values = changed.unpack();

        for (const [name, value] of Object.entries(values))
            this._properties.set(name, value);

        for (const name of invalidated)
            this._properties.delete(name);

        this.emit('changed');

        if ('Status' in values)
            this.emit('status-changed');

        if (
            'IconName' in values ||
            'IconPixmap' in values ||
            'AttentionIconName' in values ||
            'AttentionIconPixmap' in values ||
            'IconThemePath' in values
        ) {
            this.emit('icon-changed');
        }

        if ('Menu' in values)
            this.emit('menu-changed');
    }


    _onSignal(
        _sender,
        signal,
        _params
    ) {
        /*
         * SNI implementations frequently emit NewFoo instead of
         * org.freedesktop.DBus.Properties.PropertiesChanged.
         */
        switch (signal) {
        case 'NewIcon':
            this._refreshMany([
                'IconName',
                'IconPixmap',
                'IconThemePath',
            ]);
            this.emit('icon-changed');
            break;

        case 'NewAttentionIcon':
            this._refreshMany([
                'AttentionIconName',
                'AttentionIconPixmap',
                'IconThemePath',
            ]);
            this.emit('icon-changed');
            break;

        case 'NewIconThemePath':
            this._refreshProperty('IconThemePath');
            this.emit('icon-changed');
            break;

        case 'NewStatus':
            this._refreshProperty('Status');
            this.emit('status-changed');
            break;

        case 'NewTitle':
            this._refreshProperty('Title');
            this.emit('changed');
            break;

        case 'NewToolTip':
            this._refreshProperty('ToolTip');
            this.emit('changed');
            break;

        case 'NewMenu':
            this._refreshProperty('Menu');
            this.emit('menu-changed');
            break;

        case 'XAyatanaNewLabel':
            this._refreshProperty('XAyatanaLabel');
            this.emit('changed');
            break;
        }
    }


    _refreshMany(names) {
        for (const name of names)
            this._refreshProperty(name);
    }


    _refreshProperty(name) {
        if (this._destroyed)
            return;

        try {
            const result = Gio.DBus.session.call_sync(
                this.busName,
                this.objectPath,
                'org.freedesktop.DBus.Properties',
                'Get',
                new GLib.Variant(
                    '(ss)',
                    [STATUS_NOTIFIER_ITEM_IFACE, name]
                ),
                new GLib.VariantType('(v)'),
                Gio.DBusCallFlags.NONE,
                1000,
                null
            );

            const [value] = result.deep_unpack();
            this._properties.set(name, value);
        } catch {
            /* Optional property not provided by this implementation. */
        }
    }


    _get(
        name,
        fallback = null
    ) {
        const value = this._properties.get(name);
        if (!value)
            return fallback;

        try {
            return value.deep_unpack();
        } catch {
            return fallback;
        }
    }


    _getVariant(name) {
        return this._properties.get(name) ?? null;
    }


    get uniqueId() {
        return `${this.busName}${this.objectPath}`;
    }


    get id() {
        return this._get('Id', this.service);
    }


    get title() {
        return this._get('Title', this.id);
    }


    get label() {
        return this._get('XAyatanaLabel', null);
    }


    get status() {
        return this._get('Status', SNIStatus.ACTIVE);
    }


    get category() {
        return this._get('Category', 'ApplicationStatus');
    }


    get iconName() {
        return this._get('IconName', null);
    }


    get attentionIconName() {
        return this._get('AttentionIconName', null);
    }


    get iconThemePath() {
        return this._get('IconThemePath', null);
    }


    get iconPixmap() {
        return this._getVariant('IconPixmap');
    }


    get attentionIconPixmap() {
        return this._getVariant('AttentionIconPixmap');
    }


    get menuPath() {
        const path = this._get('Menu', null);
        return path === '/NO_DBUSMENU' ? null : path;
    }


    get itemIsMenu() {
        return this._get('ItemIsMenu', false);
    }


    activate(x = 0, y = 0) {
        return this._call(
            'Activate',
            new GLib.Variant('(ii)', [x, y])
        );
    }


    secondaryActivate(x = 0, y = 0) {
        return this._call(
            'SecondaryActivate',
            new GLib.Variant('(ii)', [x, y])
        );
    }


    contextMenu(x = 0, y = 0) {
        return this._call(
            'ContextMenu',
            new GLib.Variant('(ii)', [x, y])
        );
    }


    scroll(delta, orientation) {
        return this._call(
            'Scroll',
            new GLib.Variant(
                '(is)',
                [delta, orientation]
            )
        );
    }


    _call(method, params) {
        if (this._destroyed)
            return;

        Gio.DBus.session.call(
            this.busName,
            this.objectPath,
            STATUS_NOTIFIER_ITEM_IFACE,
            method,
            params,
            null,
            Gio.DBusCallFlags.NONE,
            -1,
            null,
            (_connection, result) => {
                try {
                    Gio.DBus.session.call_finish(result);
                } catch (e) {
                    logError(
                        e,
                        `StatusNotifierItem.${method}`
                    );
                }
            }
        );
    }


    destroy() {
        if (this._destroyed)
            return;

        this._destroyed = true;
        this.emit('destroy');

        if (this._proxy) {
            if (this._propertiesChangedId)
                this._proxy.disconnect(this._propertiesChangedId);

            if (this._signalId)
                this._proxy.disconnect(this._signalId);

            if (this._ownerId)
                this._proxy.disconnect(this._ownerId);
        }

        this._propertiesChangedId = 0;
        this._signalId = 0;
        this._ownerId = 0;
        this._proxy = null;
        this._properties.clear();
    }
}
