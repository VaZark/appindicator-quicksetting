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

## Preferences

> _Disclaimer: Persistence depends on the app providing a stable ID._

Open the preferences window from an extension manager or from the command line:

```sh
gnome-extensions prefs appindicator-quicksetting@vazark.github.io
```

The maximum Running Apps menu height is stored with GSettings and applied immediately while the extension is enabled.

The **Apps** preferences page has separate **Labels**, **Ordering**, and **Hide** lists containing only saved overrides. Click **Add override** in the relevant list to pick a currently running indicator app, including hidden or passive apps. Selecting an app that already has that type of override closes the picker and focuses and highlights the existing control without changing its value.

Saved overrides remain editable after an app exits. Use **Remove** to restore that setting’s default. Apply a label with **Apply** or Enter; an empty label restores the app’s name. Ordering and hiding take effect immediately. The picker updates as apps register or exit; it is empty while the extension is disabled.

Lower ordering priorities appear first, with a default of 0. Apps with equal priorities retain their registration order. Hiding an app also hides its attention indicator; turn off its switch to restore it (subject to the global passive-indicator setting).

Overrides are stored together per app in the `app-overrides` GSettings JSON object, keyed by the app’s StatusNotifierItem `Id`, with `name`, `label`, `order`, and `hidden` fields. Multiple indicators with the same ID share overrides. 

## Credits

A lot of the implementation is based on the [AppIndicator/KStatusNotifierItem](https://github.com/ubuntu/gnome-shell-extension-appindicator) extension.

## Alternative methods I tried and abandoned

- **Using AppIndicator/KStatusNotifierItem as a Git submodule with an adapter.**
  The code was too tightly coupled, and I was effectively initializing the other extension rather than cleanly reusing it.

- **Modifying GNOME's Background Apps implementation.**
  It relies on GNOME internals that provide no stability guarantees, which risks breaking the extension with every GNOME update.
