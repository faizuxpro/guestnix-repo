import { Loader2, PanelLeft, Smartphone } from "lucide-react";

function SkeletonBar({ className = "" }: { className?: string }) {
  return <div className={`rounded-md bg-muted ${className}`} />;
}

export default function EditorLoading() {
  return (
    <div
      className="flex h-full min-h-0 min-w-0 flex-col overflow-hidden bg-background"
      role="status"
      aria-live="polite"
      aria-label="Opening advanced editor"
    >
      <div className="flex h-14 shrink-0 items-center justify-between border-b bg-background px-4">
        <div className="flex items-center gap-3">
          <div className="grid size-9 place-items-center rounded-lg bg-primary/10 text-primary">
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
          </div>
          <div>
            <p className="text-sm font-semibold">Opening Advanced Editor...</p>
            <p className="text-xs text-muted-foreground">
              Loading guidebook content and preview
            </p>
          </div>
        </div>
        <div className="hidden items-center gap-2 md:flex">
          <SkeletonBar className="h-8 w-20" />
          <SkeletonBar className="h-8 w-24" />
        </div>
      </div>

      <div className="flex min-h-0 min-w-0 flex-1 overflow-hidden">
        <aside className="hidden min-h-0 w-[30%] min-w-[280px] flex-col border-r bg-background md:flex">
          <div className="flex h-full min-h-0">
            <div className="flex w-16 shrink-0 flex-col items-center gap-3 border-r bg-muted/25 py-4">
              <div className="grid size-9 place-items-center rounded-lg bg-muted">
                <PanelLeft
                  className="h-4 w-4 text-muted-foreground"
                  aria-hidden="true"
                />
              </div>
              <SkeletonBar className="size-9 rounded-lg" />
              <SkeletonBar className="size-9 rounded-lg" />
              <SkeletonBar className="size-9 rounded-lg" />
            </div>
            <div className="min-w-0 flex-1 space-y-4 p-4">
              <SkeletonBar className="h-5 w-32" />
              <div className="space-y-2">
                <SkeletonBar className="h-12 w-full" />
                <SkeletonBar className="h-12 w-full" />
                <SkeletonBar className="h-12 w-10/12" />
              </div>
              <SkeletonBar className="h-px w-full" />
              <div className="space-y-3">
                <SkeletonBar className="h-8 w-24" />
                <SkeletonBar className="h-20 w-full" />
                <SkeletonBar className="h-20 w-full" />
              </div>
            </div>
          </div>
        </aside>

        <main className="grid min-h-0 flex-1 place-items-center bg-muted/25 p-6">
          <div className="relative aspect-[9/16] h-[min(74vh,680px)] max-h-full rounded-[2rem] border bg-background p-3 shadow-sm">
            <div className="flex h-full flex-col overflow-hidden rounded-[1.5rem] border bg-card">
              <div className="flex items-center justify-between border-b px-4 py-3">
                <div className="flex items-center gap-2">
                  <Smartphone
                    className="h-4 w-4 text-muted-foreground"
                    aria-hidden="true"
                  />
                  <SkeletonBar className="h-4 w-24" />
                </div>
                <SkeletonBar className="h-6 w-14 rounded-full" />
              </div>
              <div className="space-y-4 p-4">
                <SkeletonBar className="h-36 w-full rounded-xl" />
                <SkeletonBar className="h-6 w-3/4" />
                <SkeletonBar className="h-4 w-full" />
                <SkeletonBar className="h-4 w-11/12" />
                <div className="grid grid-cols-2 gap-3 pt-2">
                  <SkeletonBar className="h-24 rounded-xl" />
                  <SkeletonBar className="h-24 rounded-xl" />
                </div>
                <SkeletonBar className="h-24 w-full rounded-xl" />
              </div>
            </div>
          </div>
        </main>
      </div>

      <span className="sr-only">Opening Advanced Editor...</span>
    </div>
  );
}
