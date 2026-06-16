"use client";

import { useEffect, useRef } from "react";
import { toast } from "sonner";
import {
  useEditorStore,
  type EditorSection,
  type GuidebookMeta,
} from "@/stores/editor-store";
import { setCachedEditorStorefront } from "@/lib/store/editor-storefront-cache";
import type { EditorStorefrontData } from "@/lib/store/editor-storefront-types";

type Props = {
  initial: {
    guidebook: GuidebookMeta;
    sections: EditorSection[];
    storefront?: EditorStorefrontData;
  };
  children: React.ReactNode;
};

const AUTOSAVE_DEBOUNCE_MS = 5000;

function isTextEditingTarget(target: EventTarget | null) {
  if (!(target instanceof Element)) return false;
  return Boolean(
    target.closest(
      'input, textarea, select, [contenteditable="true"], [contenteditable="plaintext-only"], .ProseMirror'
    )
  );
}

export function EditorProvider({ initial, children }: Props) {
  const loadGuidebook = useEditorStore((s) => s.loadGuidebook);
  const save = useEditorStore((s) => s.save);
  const undo = useEditorStore((s) => s.undo);
  const redo = useEditorStore((s) => s.redo);
  const isDirty = useEditorStore((s) => s.isDirty);
  const sections = useEditorStore((s) => s.sections);
  const guidebookSettings = useEditorStore((s) => s.guidebookSettings);
  const branding = useEditorStore((s) => s.branding);
  const bottomNav = useEditorStore((s) => s.bottomNav);
  const saveStatus = useEditorStore((s) => s.saveStatus);
  const saveError = useEditorStore((s) => s.saveError);

  const hydratedRef = useRef(false);

  useEffect(() => {
    if (hydratedRef.current) return;
    hydratedRef.current = true;
    if (initial.storefront) {
      setCachedEditorStorefront(initial.guidebook.id, initial.storefront);
    }
    loadGuidebook(initial);
  }, [initial, loadGuidebook]);

  useEffect(() => {
    if (!isDirty) return;
    const t = setTimeout(() => {
      void save();
    }, AUTOSAVE_DEBOUNCE_MS);
    return () => clearTimeout(t);
  }, [sections, guidebookSettings, branding, bottomNav, isDirty, save]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const meta = e.ctrlKey || e.metaKey;
      if (!meta) return;
      const key = e.key.toLowerCase();
      const isUndoRedo =
        (key === "z" && !e.shiftKey) ||
        (key === "z" && e.shiftKey) ||
        key === "y";
      if (isUndoRedo && isTextEditingTarget(e.target)) return;

      if (key === "s") {
        e.preventDefault();
        void save();
      } else if (key === "z" && !e.shiftKey) {
        e.preventDefault();
        undo();
      } else if ((key === "z" && e.shiftKey) || key === "y") {
        e.preventDefault();
        redo();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [save, undo, redo]);

  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (isDirty) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [isDirty]);

  useEffect(() => {
    if (saveStatus === "error" && saveError) {
      toast.error(saveError);
    }
  }, [saveStatus, saveError]);

  return <>{children}</>;
}
