type DraftRevisionConflictInput = {
  incomingDraftRevision?: number;
  currentDraftRevision: number;
  hasActiveCollaborators: boolean;
};

export function shouldRejectStaleDraftRevision({
  incomingDraftRevision,
  currentDraftRevision,
  hasActiveCollaborators,
}: DraftRevisionConflictInput) {
  return (
    hasActiveCollaborators &&
    incomingDraftRevision !== undefined &&
    incomingDraftRevision !== currentDraftRevision
  );
}
