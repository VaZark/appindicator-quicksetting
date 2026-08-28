# Source layout

- `controllers/` coordinates extension lifecycle and passes protocol messages to the UI.
- `protocol/` owns StatusNotifier DBus registration, models, interfaces, and watcher lifecycle.
- `ui/` contains GNOME Shell actors, menu items, layout, and presentation state.
- `utils/` contains stateless naming and icon helpers.
- `dbusMenu.js` remains at the root because it is the shared boundary between DBusMenu protocol calls and GNOME menu rendering.

Commands in the other direction use the explicit methods exposed by the protocol-backed indicator and DBus menu objects, such as `activate()`, `scroll()`, `event()`, and `aboutToShow()`.
