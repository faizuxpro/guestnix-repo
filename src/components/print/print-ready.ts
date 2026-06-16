type PrintableImage = {
  complete?: boolean;
  decode?: () => Promise<unknown>;
};

type PrintableDocument = {
  fonts?: {
    ready?: Promise<unknown>;
  };
  images?: Iterable<PrintableImage>;
};

type WaitForPrintAssetsOptions = {
  timeoutMs?: number;
  nextFrame?: () => Promise<void>;
};

function timeout(ms: number) {
  return new Promise<void>((resolve) => {
    globalThis.setTimeout(resolve, ms);
  });
}

function defaultNextFrame() {
  return new Promise<void>((resolve) => {
    if (typeof window !== "undefined" && "requestAnimationFrame" in window) {
      window.requestAnimationFrame(() => resolve());
      return;
    }
    globalThis.setTimeout(resolve, 0);
  });
}

async function ignoreFailure(promise: Promise<unknown>) {
  try {
    await promise;
  } catch {
    // A broken external image should not trap the user before printing.
  }
}

export async function waitForPrintAssets(
  printableDocument: PrintableDocument = document,
  options: WaitForPrintAssetsOptions = {}
) {
  const timeoutMs = options.timeoutMs ?? 4500;
  const nextFrame = options.nextFrame ?? defaultNextFrame;
  const fontsReady = printableDocument.fonts?.ready
    ? ignoreFailure(printableDocument.fonts.ready)
    : Promise.resolve();
  const imageDecodes = Array.from(printableDocument.images ?? [])
    .filter((image) => !image.complete && typeof image.decode === "function")
    .map((image) => ignoreFailure(image.decode!()));

  await Promise.race([
    Promise.all([fontsReady, ...imageDecodes]).then(() => undefined),
    timeout(timeoutMs),
  ]);
  await nextFrame();
}
