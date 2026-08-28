import * as Config from "resource:///org/gnome/shell/misc/config.js";

export const SHELL_VERSION = Config.PACKAGE_VERSION;
export const SHELL_MAJOR_VERSION = Number.parseInt(SHELL_VERSION, 10);

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
