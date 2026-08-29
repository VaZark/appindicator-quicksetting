# Running Apps Quick Settings Widget

A small GNOME Shell extension that shows running AppIndicator / StatusNotifier apps in a full-width Quick Settings widget styled like _Background Apps_.

This is still pretty experimental and is mostly something I built for myself.

_Disclaimer: I have no experience with GTK or GNOME Shell code, so AI was/is heavily used._

<img width="383" height="322" alt="image" src="https://github.com/user-attachments/assets/1cc9d494-90aa-4d31-a66a-ae98c1121228" />

## Goals

- [x] Tries to behave like the normal AppIndicator tray, just inside Quick Settings
  - [x] App icon and menu
  - [x] Submenus
  - [x] Scrollable on overflow with a configurable maximum height

> [!NOTE]
> This extension provides the `org.kde.StatusNotifierWatcher` service itself.
>
> It therefore cannot run alongside another AppIndicator/KStatusNotifierItem extension that owns the same service.
>
> Any future filtering will control which applications appear in this extension. It will not route excluded applications to a separate system tray extension.

## Development

### Development Environment Setup

1. Create a symlink to the extension so changes are immediately available when you restart or refresh the nested Wayland session:

```sh
ln -s path/to/appindicator-quicksetting@vazark.github.io \
  ~/.local/share/gnome-shell/extensions/appindicator-quicksetting@vazark.github.io
```

2. Compile the settings schema (and repeat this after changing it):

```sh
npm run schemas
```

3. Start a nested GNOME Shell development environment:

```sh
dbus-run-session gnome-shell --devkit --wayland
```

### Build

Create an installable GNOME Shell extension bundle with:

```sh
npm run build
```

The bundle is written to `dist/appindicator-quicksetting@vazark.github.io.shell-extension.zip`. It contains only the extension runtime files, license, and attribution. Tests, package metadata, dependencies, and development configuration are excluded.

### Preferences

Open the preferences window from an extension manager or from the command line:

```sh
gnome-extensions prefs appindicator-quicksetting@vazark.github.io
```

The maximum Running Apps menu height is stored with GSettings and applied immediately while the extension is enabled.

### Menu stress-test indicator

With the extension enabled, run:

```sh
npm run mock:indicator
```

This publishes a disposable StatusNotifierItem containing short, long, and deeply nested DBusMenu submenus for testing.

## Credits

A lot of the implementation is based on the [AppIndicator/KStatusNotifierItem](https://github.com/ubuntu/gnome-shell-extension-appindicator) extension.

## Alternative methods I tried and abandoned

- **Using AppIndicator/KStatusNotifierItem as a Git submodule with an adapter.**
  The code was too tightly coupled, and I was effectively initializing the other extension rather than cleanly reusing it.

- **Modifying GNOME's Background Apps implementation.**
  It relies on GNOME internals that provide no stability guarantees, which risks breaking the extension with every GNOME update.
