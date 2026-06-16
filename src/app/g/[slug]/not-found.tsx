import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-[color:oklch(0.145_0.02_176)] px-6 text-center text-[#faf6ef]">
      <span
        style={{
          fontSize: "0.68rem",
          letterSpacing: "0.22em",
          textTransform: "uppercase",
          color: "#e8c36a",
        }}
      >
        Guestnix
      </span>
      <h1
        style={{
          fontFamily: "var(--font-serif), Georgia, serif",
          fontSize: "clamp(2.5rem, 10vw, 4.5rem)",
          fontWeight: 300,
          letterSpacing: "-0.03em",
          lineHeight: 1.02,
          margin: 0,
        }}
      >
        Guide not found
      </h1>
      <p className="max-w-sm text-sm opacity-70">
        This guidebook may be unpublished, moved, or the link mistyped.
      </p>
      <Link
        href="/"
        className="rounded-full border border-white/20 px-5 py-2 text-xs uppercase tracking-[0.18em] transition-colors hover:bg-white/10"
      >
        Back to Guestnix
      </Link>
    </div>
  );
}
