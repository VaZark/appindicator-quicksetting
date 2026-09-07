import Adw from "gi://Adw";
import Gtk from "gi://Gtk";
import { gettext as _ } from "resource:///org/gnome/Shell/Extensions/js/extensions/prefs.js";

export function addGeneralPage(window, settings) {
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

  const hidePassiveIndicators = new Adw.SwitchRow({
    title: _("Hide passive indicators"),
    subtitle: _("Only show passive apps when they become active or need attention"),
  });
  appearanceGroup.add(hidePassiveIndicators);

  maxMenuHeight.value = settings.get_int("max-menu-height");
  maxMenuHeight.connect("notify::value", () => {
    settings.set_int("max-menu-height", Math.round(maxMenuHeight.value));
  });
  settings.bind("hide-passive-indicators", hidePassiveIndicators, "active", 0);
}
