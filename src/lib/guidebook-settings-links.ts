export const GUIDEBOOK_RENAME_MENU_LABEL = "Rename guidebook";

export function guidebookSettingsHref(guidebookId: string, sectionId?: string) {
  const href = `/dashboard/guidebooks/${guidebookId}`;
  return sectionId ? `${href}#${sectionId}` : href;
}

export function guidebookRenameSettingsHref(guidebookId: string) {
  return guidebookSettingsHref(guidebookId, "guidebook");
}
