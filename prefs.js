import Adw from "gi://Adw";
import Gtk from "gi://Gtk";
import {
  ExtensionPreferences,
  gettext as _,
} from "resource:///org/gnome/Shell/Extensions/js/extensions/prefs.js";

export default class AppIndicatorQuickSettingsPreferences extends ExtensionPreferences {
  fillPreferencesWindow(window) {
    const page = new Adw.PreferencesPage({
      title: _("General"),
      iconName: "preferences-system-symbolic",
    });
    window.add(page);

    const appearanceGroup = new Adw.PreferencesGroup({
      title: _("Appearance"),
      description: _("Configure the Running Apps menu"),
    });
    page.add(appearanceGroup);

    const maxMenuHeight = new Adw.SpinRow({
      title: _("Maximum menu height"),
      subtitle: _("The menu becomes scrollable above this height"),
      adjustment: new Gtk.Adjustment({
        lower: 200,
        upper: 1200,
        stepIncrement: 50,
        pageIncrement: 100,
      }),
    });
    appearanceGroup.add(maxMenuHeight);

    window._settings = this.getSettings();
    maxMenuHeight.value = window._settings.get_int("max-menu-height");
    maxMenuHeight.connect("notify::value", () => {
      window._settings?.set_int("max-menu-height", Math.round(maxMenuHeight.value));
    });
    window.connect("close-request", () => {
      window._settings = null;
    });
  }
}
