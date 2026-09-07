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
- [x] Preferences
  - [x] Custom labels
  - [x] Custom Ordering
  - [x] Hide select indicators
  - [x] Hide apps posting "passive" indicator

> [!NOTE]
> This extension provides the `org.kde.StatusNotifierWatcher` service itself.
>
> It therefore cannot run alongside another AppIndicator/KStatusNotifierItem extension that owns the same service.
>
> Any future filtering will control which applications appear in this extension. It will not route excluded applications to a separate system tray extension.

## Manual Installation

```bash
git clone https://github.com/VaZark/appindicator-quicksetting.git
cd appindicator-quicksetting
npm run build
gnome-extensions install  'dist/appindicator-quicksetting@vazark.github.io.shell-extension.zip'
```

## Preferences

> _Disclaimer: Persistence depends on the app providing a stable ID._

Open the preferences window from an extension manager or from the command line:

```sh
gnome-extensions prefs appindicator-quicksetting@vazark.github.io
```

**Global prefs**

1. The maximum Running Apps menu height : to handle really long menus and submenus
2. Hide passive apps

**Per-app override**

1. Labels : if you want change label (useful when app doesn't have a ui-friendly name)
2. Ordering : if you need specific ordering
3. Hide : apps to ignore

Click **Add override** in the relevant list to pick a currently running indicator app, including hidden or passive apps. Selecting an app that already has that type of override closes the picker and focuses and highlights the existing action without changing its value.

Overrides are stored together per app in the `app-overrides` GSettings JSON object, keyed by the app’s StatusNotifierItem `Id`, with `name`, `label`, `order`, and `hidden` fields. Multiple indicators with the same ID share overrides.

## Credits

A lot of the implementation is based on the [AppIndicator/KStatusNotifierItem](https://github.com/ubuntu/gnome-shell-extension-appindicator) extension.

## Alternative methods I tried and abandoned

- **Using AppIndicator/KStatusNotifierItem as a Git submodule with an adapter.**
  The code was too tightly coupled, and I was effectively initializing the other extension rather than cleanly reusing it.

- **Modifying GNOME's Background Apps implementation.**
  It relies on GNOME internals that provide no stability guarantees, which risks breaking the extension with every GNOME update.
