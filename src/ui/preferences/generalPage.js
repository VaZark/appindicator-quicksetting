import Adw from "gi://Adw";
import Gtk from "gi://Gtk";
import { gettext as _ } from "../../utils/translations.js";

export function addGeneralPage(window, settings) {
  const page = new Adw.PreferencesPage({
    title: _("general"),
    iconName: "preferences-system-symbolic",
  });
  window.add(page);

  const appearanceGroup = new Adw.PreferencesGroup({
    title: _("appearance"),
    description: _("appearance_description"),
  });
  page.add(appearanceGroup);

  const maxMenuHeight = new Adw.SpinRow({
    title: _("max_menu_height"),
    subtitle: _("max_menu_height_description"),
    adjustment: new Gtk.Adjustment({
      lower: 200,
      upper: 1200,
      stepIncrement: 50,
      pageIncrement: 100,
    }),
  });
  appearanceGroup.add(maxMenuHeight);

  const hidePassiveIndicators = new Adw.SwitchRow({
    title: _("hide_passive_indicators"),
    subtitle: _("hide_passive_indicators_description"),
  });
  appearanceGroup.add(hidePassiveIndicators);

  maxMenuHeight.value = settings.get_int("max-menu-height");
  maxMenuHeight.connect("notify::value", () => {
    settings.set_int("max-menu-height", Math.round(maxMenuHeight.value));
  });
  settings.bind("hide-passive-indicators", hidePassiveIndicators, "active", 0);
}
