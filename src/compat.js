import * as Config from "resource:///org/gnome/shell/misc/config.js";

export const [major, minor] = Config.PACKAGE_VERSION.split(".").map((s) => Number(s));
