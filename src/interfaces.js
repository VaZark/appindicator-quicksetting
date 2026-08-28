import * as UpstreamInterfaces from "../vendor/gnome-shell-extension-appindicator/interfaces.js";

export const STATUS_NOTIFIER_WATCHER_IFACE = "org.kde.StatusNotifierWatcher";

export const STATUS_NOTIFIER_ITEM_IFACE = "org.kde.StatusNotifierItem";

export const DBUS_MENU_IFACE = "com.canonical.dbusmenu";

export const WATCHER_PATH = "/StatusNotifierWatcher";

export const DEFAULT_ITEM_PATH = "/StatusNotifierItem";

export function initializeUpstream(extension) {
  UpstreamInterfaces.initialize(extension);
}

export function destroyUpstream() {
  UpstreamInterfaces.destroy();
}

export const STATUS_NOTIFIER_WATCHER_XML = `
<node>
    <interface name="org.kde.StatusNotifierWatcher">

        <method name="RegisterStatusNotifierItem">
            <arg type="s" name="service" direction="in"/>
        </method>

        <method name="RegisterStatusNotifierHost">
            <arg type="s" name="service" direction="in"/>
        </method>

        <property
            name="RegisteredStatusNotifierItems"
            type="as"
            access="read"/>

        <property
            name="IsStatusNotifierHostRegistered"
            type="b"
            access="read"/>

        <property
            name="ProtocolVersion"
            type="i"
            access="read"/>

        <signal name="StatusNotifierItemRegistered">
            <arg type="s" name="service"/>
        </signal>

        <signal name="StatusNotifierItemUnregistered">
            <arg type="s" name="service"/>
        </signal>

        <signal name="StatusNotifierHostRegistered"/>
    </interface>
</node>
`;

export const DBUS_MENU_XML = `
<node>
    <interface name="com.canonical.dbusmenu">

        <method name="GetLayout">
            <arg type="i" name="parentId" direction="in"/>
            <arg type="i" name="recursionDepth" direction="in"/>
            <arg type="as" name="propertyNames" direction="in"/>

            <arg type="u" name="revision" direction="out"/>
            <arg type="(ia{sv}av)" name="layout" direction="out"/>
        </method>

        <method name="Event">
            <arg type="i" name="id" direction="in"/>
            <arg type="s" name="eventId" direction="in"/>
            <arg type="v" name="data" direction="in"/>
            <arg type="u" name="timestamp" direction="in"/>
        </method>

        <method name="AboutToShow">
            <arg type="i" name="id" direction="in"/>
            <arg type="b" name="needUpdate" direction="out"/>
        </method>

        <signal name="LayoutUpdated">
            <arg type="u" name="revision"/>
            <arg type="i" name="parent"/>
        </signal>

        <signal name="ItemsPropertiesUpdated">
            <arg type="a(ia{sv})" name="updatedProps"/>
            <arg type="a(ias)" name="removedProps"/>
        </signal>

    </interface>
</node>
`;
