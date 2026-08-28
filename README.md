# Running Apps Quick Settings Widget

A small GNOME Shell extension that shows running AppIndicator / StatusNotifier apps in a full-width Quick Settings widget styled like Background Apps.

This is still pretty experimental and mostly something I built for myself.

_Disclaimer: I have no experience with GTK or GNOME Shell code, so AI was/is heavily used._

<img width="383" height="322" alt="image" src="https://github.com/user-attachments/assets/1cc9d494-90aa-4d31-a66a-ae98c1121228" />

## Goals

- [x] Tries to behave like the normal AppIndicator tray, just inside Quick Settings
  - [x] App Icon and menu
  - [x] Submenu
  - [x] Scrollable on overflow (hardcoded to 600px atm)

> [!NOTE]
> This extension provides the `org.kde.StatusNotifierWatcher` service itself.
> It therefore cannot run alongside another AppIndicator/KStatusNotifierItem
> extension that owns the same service. Any future filtering will control which
> applications appear in this extension; it will not route excluded applications
> to a separate system tray extension.

## Credits

A lot of the implementation is based on the [AppIndicator/KStatusNotifier](https://github.com/ubuntu/gnome-shell-extension-appindicator) extension.

## Build

Create an installable GNOME Shell extension bundle with:

```sh
npm run build
```

The bundle is written to `dist/appindicator-quicksetting@vazark.github.io.shell-extension.zip`. It contains only the extension runtime files, license, and attribution; tests, package metadata, dependencies, and development configuration are excluded.

## Menu stress-test indicator

With the extension enabled, run:

```sh
npm run mock:indicator
```

This publishes a disposable NordVPN-like StatusNotifierItem with short, long, and deeply nested DBusMenu submenus.

### Alternative methods I tried and abandoned

- Using AppIndicator/KStatusNotifier as a Git submodule and adding an adapter, but the code was too tightly coupled and I was practically initializing the other extension.
- Tried altering the Background Apps implementation, but it uses GNOME internals that provide no stability guarantees and risk breaking the extension with every update.
