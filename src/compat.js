import * as Config from "resource:///org/gnome/shell/misc/config.js";

export const SHELL_VERSION = Config.PACKAGE_VERSION;
export const SHELL_MAJOR_VERSION = Number.parseInt(SHELL_VERSION, 10);

export function isShellVersionAtLeast(major) {
  return SHELL_MAJOR_VERSION >= major;
}

/**
 * St.ImageContent.set_bytes() gained a Cogl.Context argument in GNOME 48.
 * Prefer feature detection here because development builds do not always have
 * a conventional numeric package version.
 */
export function setImageContentBytes(imageContent, bytes, format, width, height, rowStride) {
  const args = [];
  const backend = global.stage?.context?.get_backend?.();

  if (imageContent.set_bytes.length === 6 && backend?.get_cogl_context) {
    args.push(backend.get_cogl_context());
  }

  imageContent.set_bytes(...args, bytes, format, width, height, rowStride);
}
