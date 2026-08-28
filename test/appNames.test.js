import assert from "node:assert/strict";
import test from "node:test";

import { getIndicatorName } from "../src/appNames.js";

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
