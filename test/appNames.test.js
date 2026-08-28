import assert from "node:assert/strict";
import test from "node:test";

import { getIndicatorName, lookupFlatpakAppInfo } from "../src/appNames.js";

test("prefers the desktop application's display name", () => {
  assert.equal(
    getIndicatorName({
      appName: "Discord",
      title: "discord1",
      label: "3 unread",
      id: "chrome_status_icon_1",
    }),
    "Discord",
  );
});

test("falls back through the StatusNotifierItem names", () => {
  assert.equal(getIndicatorName({ title: "Nextcloud", label: "Syncing", id: "nextcloud" }), "Nextcloud");
  assert.equal(getIndicatorName({ label: "CopyQ", id: "copyq" }), "CopyQ");
  assert.equal(getIndicatorName({ id: "safeeyes" }), "safeeyes");
  assert.equal(getIndicatorName({}), "Application");
});

test("looks up LocalSend using its Flatpak desktop ID", () => {
  const appInfo = { displayName: "LocalSend" };
  const lookedUpIds = [];

  const result = lookupFlatpakAppInfo("org.localsend.localsend_app", (desktopId) => {
    lookedUpIds.push(desktopId);
    return { appInfo };
  });

  assert.deepEqual(lookedUpIds, ["org.localsend.localsend_app.desktop"]);
  assert.equal(result, appInfo);
});

test("handles missing Flatpak metadata or desktop entries", () => {
  const unexpectedLookup = () => assert.fail("empty Flatpak IDs must not be looked up");

  assert.equal(lookupFlatpakAppInfo(null, unexpectedLookup), null);
  assert.equal(lookupFlatpakAppInfo("  ", unexpectedLookup), null);
  assert.equal(lookupFlatpakAppInfo("org.example.Missing", () => null), null);
});
