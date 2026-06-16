import assert from "node:assert/strict";
import test from "node:test";

import { shouldRejectStaleDraftRevision } from "./guidebook-save-conflict.ts";

test("does not reject stale draft revisions when no collaborator can edit the guidebook", () => {
  assert.equal(
    shouldRejectStaleDraftRevision({
      incomingDraftRevision: 2,
      currentDraftRevision: 3,
      hasActiveCollaborators: false,
    }),
    false
  );
});

test("rejects stale draft revisions when active collaborators can edit the guidebook", () => {
  assert.equal(
    shouldRejectStaleDraftRevision({
      incomingDraftRevision: 2,
      currentDraftRevision: 3,
      hasActiveCollaborators: true,
    }),
    true
  );
});

test("does not reject matching draft revisions during collaboration", () => {
  assert.equal(
    shouldRejectStaleDraftRevision({
      incomingDraftRevision: 3,
      currentDraftRevision: 3,
      hasActiveCollaborators: true,
    }),
    false
  );
});
