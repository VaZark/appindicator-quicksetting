import Gettext from "gettext";
import { english } from "./english.js";

const DOMAIN = "appindicator-quicksetting@vazark.github.io";

// metadata.json binds this domain in both Shell and preferences. Gettext returns
// the key for missing translations, including in the C locale.
export function gettext(key) {
  const translated = Gettext.dgettext(DOMAIN, key);
  return translated && translated !== key ? translated : (english[key] ?? key);
}
