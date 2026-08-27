# Running Apps Quick Toggle

A small GNOME Shell extension that shows running AppIndicator / StatusNotifier apps inside Quick Settings. Inspired by Background Apps.

This is still pretty experimental and mostly something I built for myself.

_Disclaimer: I have no experience with GTK or GNOME Shell code, so AI was/is heavily used._

<img width="389" height="530" alt="image" src="https://github.com/user-attachments/assets/e2f29c03-734b-4bbe-ba41-fe63dc93e947" />

## Goals

- [x] Tries to behave like the normal AppIndicator tray, just inside Quick Settings
  - [x] App Icon and menu
  - [x] Submenu
  - [x] Scrollable on overflow (hardcoded to 600px atm)
- [ ] Add per-application inclusion/exclusion settings

> [!NOTE]
> This extension provides the `org.kde.StatusNotifierWatcher` service itself.
> It therefore cannot run alongside another AppIndicator/KStatusNotifierItem
> extension that owns the same service. Any future filtering will control which
> applications appear in this extension; it will not route excluded applications
> to a separate system tray extension.

## Credits

A lot of the implementation is based on the AppIndicator/KStatusNotifier extensions.

### Alternative methods I tried and abandoned

- Using AppIndicator/KStatusNotifier as a Git submodule and adding an adapter, but the code was too tightly coupled and I was practically initializing the other extension.
- Copying the Background Apps implementation, but it uses GNOME internals that provide no stability guarantees and risk breaking the extension with every update.
