"use client";

import { useEffect, useState } from "react";

const DEFAULT_LOOP_MS = 11_000;

type Props = {
  className?: string;
  loopMs?: number;
  src: string;
};

function getLoopedSrc(src: string, iteration: number) {
  const separator = src.includes("?") ? "&" : "?";
  return `${src}${separator}loop=${iteration}`;
}

export function BookOneLoaderImage({
  className,
  loopMs = DEFAULT_LOOP_MS,
  src,
}: Props) {
  const [iteration, setIteration] = useState(0);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setIteration((current) => current + 1);
    }, loopMs);

    return () => window.clearInterval(timer);
  }, [loopMs, src]);

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      key={`${src}-${iteration}`}
      className={className}
      src={getLoopedSrc(src, iteration)}
      alt=""
      decoding="async"
      loading="eager"
    />
  );
}
