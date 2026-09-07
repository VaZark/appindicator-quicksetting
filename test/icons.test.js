import assert from "node:assert/strict";
import test from "node:test";
import { normalizeIconName } from "../src/utils/iconNames.js";
import { loadGiModule } from "./helpers/giModule.js";

test("normalizeIconName removes supported file extensions", () => {
  assert.equal(normalizeIconName("example.svg"), "example");
  assert.equal(normalizeIconName("example.PNG"), "example");
  assert.equal(normalizeIconName("example.SvG"), "example");
  assert.equal(normalizeIconName("example.status.svg"), "example.status");
});

test("normalizeIconName preserves paths and ordinary icon names", () => {
  assert.equal(normalizeIconName("/opt/example/icon.svg"), "/opt/example/icon.svg");
  assert.equal(normalizeIconName("example-symbolic"), "example-symbolic");
  assert.equal(normalizeIconName("example.jpeg"), "example.jpeg");
  assert.equal(normalizeIconName(""), null);
  assert.equal(normalizeIconName(null), null);
});

function harness({ available = [], files = [] } = {}) {
  class ImageContent {
    set_bytes() {}
  }
  const { setSniIcon } = loadGiModule(
    new URL("../src/utils/iconUtils.js", import.meta.url),
    {
      normalizeIconName,
      Gio: {
        ThemedIcon: class {
          constructor({ name }) {
            this.name = name;
          }
        },
        File: {
          new_for_path: (path) => ({
            query_exists: () => files.includes(path),
            get_path: () => path,
          }),
        },
        FileIcon: class {
          constructor({ file }) {
            this.file = file;
          }
        },
      },
      St: {
        IconTheme: class {
          has_icon(name) {
            return available.includes(name);
          }
        },
        ImageContent,
      },
      GLib: { Variant: class {}, Bytes: class {} },
      Cogl: { PixelFormat: { ARGB_8888: 1 } },
      Clutter: { ContentGravity: { RESIZE_ASPECT: 1 } },
      global: { stage: { context: { get_backend: () => ({ get_cogl_context: () => ({}) }) } } },
      logError: (error) => {
        throw error;
      },
    },
    "setSniIcon",
  );
  const actor = {
    set(values) {
      Object.assign(this, values);
    },
  };
  return { actor, set: (icon) => setSniIcon(actor, icon), ImageContent };
}
const pixmaps = [[1, 1, new Uint8Array([255, 10, 20, 30])]];
const appIcon = { name: "org.telegram.desktop" };

test("an available tray icon takes priority over pixmaps and the desktop icon", () => {
  const h = harness({ available: ["telegram-unread"] });
  assert.equal(h.set({ name: "telegram-unread", pixmaps, appIcon }), true);
  assert.equal(h.actor.gicon.name, "telegram-unread");
  assert.equal(h.actor.content, null);
});

test("a missing symbolic icon falls back to its pixmap before the desktop icon", () => {
  const h = harness();
  assert.equal(h.set({ name: "org.telegram.desktop-symbolic", pixmaps, appIcon }), true);
  assert.ok(h.actor.content instanceof h.ImageContent);
  assert.equal(h.actor.gicon, null);
});

test("missing or invalid tray artwork falls back to the Flatpak desktop icon", () => {
  for (const invalid of [null, [], [[0, 0, []]], [[2, 2, [255]]]]) {
    const h = harness();
    assert.equal(h.set({ name: "missing", pixmaps: invalid, appIcon }), true);
    assert.equal(h.actor.gicon, appIcon);
    assert.equal(h.actor.content, null);
  }
});

test("a sandbox-only icon path can fall back to the exported desktop icon", () => {
  const h = harness();
  assert.equal(h.set({ name: "/app/share/icons/telegram.png", appIcon }), true);
  assert.equal(h.actor.gicon, appIcon);
});

test("a readable icon file is preferred over the desktop fallback", () => {
  const path = "/opt/telegram/icon.png";
  const h = harness({ files: [path] });
  assert.equal(h.set({ name: path, appIcon }), true);
  assert.equal(h.actor.gicon.file.get_path(), path);
});

test("switching from a pixmap to a desktop icon clears the previous image", () => {
  const h = harness();
  h.set({ pixmaps });
  assert.ok(h.actor.content);
  assert.equal(h.set({ appIcon }), true);
  assert.equal(h.actor.content, null);
  assert.equal(h.actor.gicon, appIcon);
});

test("no usable artwork returns failure so the row can show its generic icon", () => {
  const h = harness();
  h.set({ appIcon });
  assert.equal(h.set({ name: "missing" }), false);
  assert.equal(h.actor.gicon, null);
  assert.equal(h.actor.content, null);
});
