"use client";

type Props = {
  propertyName?: string;
};

export function LoadingScreen({ propertyName }: Props) {
  return (
    <div className="sl-loader" role="status" aria-label="Loading">
      <div className="sun" />
      <div className="horizon" />
      <span className="label">{propertyName || "Welcome"}</span>
    </div>
  );
}
