import assert from "node:assert/strict";
import test from "node:test";

const linksModule = await import("./guidebook-settings-links.ts");
const {
  GUIDEBOOK_RENAME_MENU_LABEL,
  guidebookRenameSettingsHref,
} = linksModule.default ?? linksModule;

test("rename guidebook menu item points at the guidebook settings section", () => {
  assert.equal(GUIDEBOOK_RENAME_MENU_LABEL, "Rename guidebook");
  assert.equal(
    guidebookRenameSettingsHref("gb_123"),
    "/dashboard/guidebooks/gb_123#guidebook"
  );
});
