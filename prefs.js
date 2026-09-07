import { ExtensionPreferences } from "resource:///org/gnome/Shell/Extensions/js/extensions/prefs.js";
import { AppPreferences } from "./src/ui/preferences/appPreferences.js";
import { addGeneralPage } from "./src/ui/preferences/generalPage.js";

export default class AppIndicatorQuickSettingsPreferences extends ExtensionPreferences {
  fillPreferencesWindow(window) {
    const settings = this.getSettings();
    addGeneralPage(window, settings);
    const apps = new AppPreferences(window, settings);
    window.connect("close-request", () => apps.destroy());
  }
}
