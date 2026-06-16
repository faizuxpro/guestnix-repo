import assert from "node:assert/strict";
import test from "node:test";

const printReadyModule = await import("./print-ready.ts");
const { waitForPrintAssets } = printReadyModule.default ?? printReadyModule;

test("waits for fonts, pending image decodes, and a frame before printing", async () => {
  const events = [];
  let resolveFonts;
  let resolveDecode;
  const fontsReady = new Promise((resolve) => {
    resolveFonts = resolve;
  });
  const decodeReady = new Promise((resolve) => {
    resolveDecode = resolve;
  });
  const fakeDocument = {
    fonts: { ready: fontsReady },
    images: [
      {
        complete: false,
        decode() {
          events.push("decode");
          return decodeReady;
        },
      },
      {
        complete: true,
      },
    ],
  };

  let settled = false;
  const wait = waitForPrintAssets(fakeDocument, {
    nextFrame: () => {
      events.push("frame");
      return Promise.resolve();
    },
    timeoutMs: 1000,
  }).then(() => {
    settled = true;
  });

  await Promise.resolve();
  assert.equal(settled, false);
  assert.deepEqual(events, ["decode"]);

  resolveFonts();
  await Promise.resolve();
  assert.equal(settled, false);

  resolveDecode();
  await wait;
  assert.equal(settled, true);
  assert.deepEqual(events, ["decode", "frame"]);
});

