import * as Config from "resource:///org/gnome/shell/misc/config.js";
const [major, minor] = Config.PACKAGE_VERSION.split(".").map((s) => Number(s));

/**
 * Example :
 *
 * import compat/gnome_version.js
 * export function generic_name(all_possible_args) {
 *   switch version :
 *     case v_one :
 *       return version_specific_code()
 *     default:
 *       return latest_version()
 * }
 *
 */
