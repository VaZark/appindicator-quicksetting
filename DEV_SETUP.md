# Dev story

## Development Environment Setup

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

## Source layout

- `controllers/` coordinates extension lifecycle and passes protocol messages to the UI.
- `protocol/` owns StatusNotifier DBus registration, models, interfaces, and watcher lifecycle.
- `ui/` contains GNOME Shell actors, menu items, layout, and presentation state.
- `utils/` contains stateless naming and icon helpers.
- `compat.js` is the home for version-dispatched compatibility functions when supported GNOME releases differ.
- `dbusMenu.js` remains at the root because it is the shared boundary between DBusMenu protocol calls and GNOME menu rendering.

Commands in the other direction use the explicit methods exposed by the protocol-backed indicator and DBus menu objects, such as `activate()`, `scroll()`, `event()`, and `aboutToShow()`.

## Build

Create an installable GNOME Shell extension bundle with:

```sh
npm run build
```

The bundle is written to `dist/appindicator-quicksetting@vazark.github.io.shell-extension.zip`. It contains only the extension runtime files, license, and attribution. Tests, package metadata, dependencies, and development configuration are excluded.

## Testing

### Extremely long menu tests

With the extension enabled, run:

```sh
npm run mock:indicator:long-menu
```

This publishes a disposable StatusNotifierItem containing short, long, and deeply nested DBusMenu submenus for testing.

### Per-app override mock tests

With the extension enabled, run the shared fixture and open preferences → **Apps**:

```sh
npm run mock:indicator:app-override
```

Click **Add override** in the required list and select a test app. Repeat in another list to test multiple settings on the same app. Leave the control app without overrides. Select an already-overridden app again to check that the picker closes and focuses the existing row without adding a duplicate or resetting its value.

Each settings test app has a simple **Test action** menu item and a **Test submenu** containing **First action** and **Second action**. The original `mock:indicator` command retains the larger stress-test menu.

The fixture starts four apps in registration order: one shared control, then A, B, and C. The same apps exercise labels, ordering, and hiding together.

| App                              | Manual checks                                                                                                                                      |
| -------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| Override Control (active)        | Leave its label empty, priority at 0, and hiding off. Its name and visibility should stay unchanged throughout.                                    |
| Override App A (active)          | Apply a custom label and keep priority at 0. Hide and unhide it; the label should survive. Clear and apply the label to restore its original name. |
| Override App B (active)          | Set priority to -10. Leave its label and visibility at defaults to check that A’s changes are isolated.                                            |
| Override App C (needs attention) | Set priority to -20: expect C, B, A among the test apps. Hide and unhide it; attention must not bypass hiding, and its priority should survive.    |

Then set B’s priority to -20 too: expect B, C, A because registration order breaks the tie. Reset B and C to 0 to restore Control, A, B, C. Open submenus after reordering to verify placement. Other running apps may appear between the test apps.

For persistence, save a custom label on A, a priority on B, and hiding on C. Restart the fixture and verify all three overrides remain while Control stays unchanged.

The command prints the checks grouped by app and their indicator IDs. Stop it with Ctrl+C. The fixture does not change settings itself; saved overrides remain editable after it exits. Clear custom labels, reset priorities to 0, and switch hiding off to repeat from defaults.

## Translations

UI code uses symbolic keys, for example `_("running_apps")`. The English source
text lives in `po/en.po`:

```po
msgid "running_apps"
msgstr "Running Apps"
```

When adding or changing a message, edit `en.po`, use its key in the UI, and run:

```sh
npm run translations
```

This validates catalogs, regenerates the POT template with English reference
comments, and generates `src/utils/english.js`. Commit both generated files;
this keeps symlinked development installations working. `npm run pot` is an alias.
The build also runs this step. GNU gettext and the project's npm development
dependencies must be installed.

The shared translation helper first looks up the user's locale with gettext.
Missing catalogs, empty/untranslated entries, and the C locale fall back to the
English messages generated from `en.po`. No process-wide locale is changed.

### Adding a language

Create a catalog (replace `fr` with your locale):

```sh
msginit --input=po/appindicator-quicksetting@vazark.github.io.pot --locale=fr --output-file=po/fr.po
```

Keep `msgid` keys unchanged and put translated text in `msgstr`. The `English:`
comments in the template show what to translate. Preserve placeholders like `%s`.
Application names, user-defined labels, and application-provided menu text are
shown as supplied by the application.

Update an existing catalog and build:

```sh
msgmerge --update po/fr.po po/appindicator-quicksetting@vazark.github.io.pot
npm run build
```

For a symlinked installation, compile a locale locally and restart Shell/preferences:

```sh
mkdir -p locale/fr/LC_MESSAGES
msgfmt -o locale/fr/LC_MESSAGES/appindicator-quicksetting@vazark.github.io.mo po/fr.po
```
