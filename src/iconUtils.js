import Clutter from 'gi://Clutter';
import Cogl from 'gi://Cogl';
import GdkPixbuf from 'gi://GdkPixbuf';
import Gio from 'gi://Gio';
import GLib from 'gi://GLib';
import St from 'gi://St';

import {
    normalizeIconName,
} from './iconNames.js';


export {normalizeIconName} from './iconNames.js';


Gio._promisify(
    GdkPixbuf.Pixbuf,
    'new_from_stream_async'
);


/*
 * Resolve the icon exported by a StatusNotifierItem/AppIndicator.
 *
 * Real AppIndicators commonly use one of these forms:
 *
 *   1. IconName = "discord"
 *   2. IconName = "my-icon", IconThemePath = "/opt/app/icons"
 *   3. IconName = "/absolute/path/to/icon.svg"
 *   4. IconPixmap = a(iiay)
 *
 * Vocalinux uses form #3 outside Flatpak and also exports
 * IconThemePath. Ubuntu's AppIndicator extension explicitly supports
 * the absolute-path form as a compatibility extension.
 */
export function setSniIcon(
    actor,
    {
        name = null,
        themePath = null,
        pixmaps = null,
    },
    preferredSize = 20
) {
    resetIcon(actor);

    if (name?.startsWith('/')) {
        if (setFileIcon(actor, Gio.File.new_for_path(name)))
            return true;
    }

    if (name && themePath) {
        const file = lookupIconInThemePath(
            name,
            themePath,
            preferredSize
        );

        if (file && setFileIcon(actor, file))
            return true;
    }

    if (name) {
        actor.gicon = new Gio.ThemedIcon({
            name: normalizeIconName(name),
        });

        return true;
    }

    if (pixmaps && setSniPixmap(actor, pixmaps, preferredSize))
        return true;

    return false;
}


export function setFileIcon(actor, fileOrPath) {
    if (!fileOrPath)
        return false;

    const file =
        typeof fileOrPath === 'string'
            ? Gio.File.new_for_path(fileOrPath)
            : fileOrPath;

    try {
        if (!file.query_exists(null))
            return false;

        actor.gicon = new Gio.FileIcon({file});
        return true;
    } catch (e) {
        logError(
            e,
            `Unable to use StatusNotifierItem icon file ${file.get_path()}`
        );
        return false;
    }
}


/*
 * Do not modify Shell's global icon theme.  Resolve an application's
 * private IconThemePath with a private St.IconTheme, like Ubuntu's
 * implementation does.
 */
export function lookupIconInThemePath(
    name,
    themePath,
    size = 20
) {
    if (!name || !themePath)
        return null;

    try {
        const theme = new St.IconTheme();
        theme.set_search_path([themePath]);

        const scale =
            St.ThemeContext
                .get_for_stage(global.stage)
                .scale_factor;

        const info = theme.lookup_icon_for_scale(
            normalizeIconName(name),
            size,
            scale,
            St.IconLookupFlags.GENERIC_FALLBACK
        );

        const filename = info?.get_filename();
        if (!filename)
            return null;

        return Gio.File.new_for_path(filename);
    } catch (e) {
        logError(
            e,
            `Unable to look up icon '${name}' in IconThemePath '${themePath}'`
        );
        return null;
    }
}


/*
 * SNI IconPixmap has type a(iiay):
 *
 *   width, height, raw ARGB32 bytes
 */
export function setSniPixmap(
    actor,
    pixmaps,
    preferredSize = 20
) {
    const pixmap = chooseBestPixmap(pixmaps, preferredSize);
    if (!pixmap)
        return false;

    const {
        width,
        height,
        bytes,
    } = pixmap;

    if (width <= 0 || height <= 0 || !bytes)
        return false;

    const data =
        bytes instanceof Uint8Array
            ? bytes
            : Uint8Array.from(bytes);

    if (data.length < width * height * 4)
        return false;

    try {
        const imageContent = new St.ImageContent({
            preferredWidth: width,
            preferredHeight: height,
        });

        /*
         * GNOME < 48 and >= 48 have different set_bytes signatures.
         * This is the same compatibility check used by Ubuntu's
         * AppIndicator extension.
         */
        const coglContext = [];
        const backend =
            global.stage?.context?.get_backend?.();

        if (
            imageContent.set_bytes.length === 6 &&
            backend?.get_cogl_context
        ) {
            coglContext.push(backend.get_cogl_context());
        }

        imageContent.set_bytes(
            ...coglContext,
            new GLib.Bytes(data),
            Cogl.PixelFormat.ARGB_8888,
            width,
            height,
            width * 4
        );

        actor.set({
            content: imageContent,
            width: preferredSize,
            height: preferredSize,
            contentGravity: Clutter.ContentGravity.RESIZE_ASPECT,
        });

        return true;
    } catch (e) {
        logError(
            e,
            'Unable to render StatusNotifierItem IconPixmap'
        );
        return false;
    }
}


/*
 * DBusMenu icon-data is *not* SNI IconPixmap. It is an encoded image
 * byte stream (normally PNG). Ubuntu decodes it with GdkPixbuf and
 * assigns the resulting pixbuf as the St.Icon's gicon.
 */
export async function setDbusMenuIconData(
    actor,
    iconData
) {
    if (!iconData)
        return false;

    try {
        const bytes = iconData instanceof GLib.Variant
            ? iconData.get_data_as_bytes()
            : new GLib.Bytes(
                iconData instanceof Uint8Array
                    ? iconData
                    : Uint8Array.from(iconData)
            );

        const stream =
            Gio.MemoryInputStream.new_from_bytes(bytes);

        actor.gicon =
            await GdkPixbuf.Pixbuf.new_from_stream_async(
                stream,
                null
            );

        return true;
    } catch (e) {
        logError(
            e,
            'Unable to decode DBusMenu icon-data'
        );
        return false;
    }
}


function resetIcon(actor) {
    actor.content = null;
    actor.gicon = null;
    actor.iconName = null;
    actor.width = -1;
    actor.height = -1;
}


function chooseBestPixmap(
    pixmaps,
    preferredSize
) {
    const candidates = unpackPixmaps(pixmaps);
    if (!candidates.length)
        return null;

    candidates.sort(
        (a, b) =>
            (a.width * a.height) -
            (b.width * b.height)
    );

    return (
        candidates.find(
            candidate =>
                candidate.width >= preferredSize &&
                candidate.height >= preferredSize
        ) ??
        candidates[candidates.length - 1]
    );
}


function unpackPixmaps(value) {
    value = deepUnpack(value);

    if (!Array.isArray(value))
        return [];

    return value
        .map(entry => {
            entry = deepUnpack(entry);

            if (!Array.isArray(entry) || entry.length < 3)
                return null;

            const [width, height, rawBytes] = entry;
            const bytes = deepUnpack(rawBytes);

            return {
                width,
                height,
                bytes,
            };
        })
        .filter(Boolean);
}


function deepUnpack(value) {
    while (value instanceof GLib.Variant)
        value = value.deep_unpack();

    return value;
}
