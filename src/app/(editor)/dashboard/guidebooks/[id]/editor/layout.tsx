import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Editor",
};

export default function EditorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="brand-refresh-scope fixed inset-0 flex min-h-0 min-w-0 flex-col overflow-hidden bg-background">
      {children}
    </div>
  );
}
