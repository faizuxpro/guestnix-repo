import assert from "node:assert/strict";
import test from "node:test";

const videoModule = await import("./video-embed.ts");
const { buildVideoEmbed, detectVideoProvider } =
  videoModule.default ?? videoModule;

test("builds YouTube embed URLs from watch links", () => {
  assert.deepEqual(buildVideoEmbed("https://www.youtube.com/watch?v=abc123"), {
    kind: "embed",
    provider: "youtube",
    src: "https://www.youtube.com/embed/abc123",
    aspectRatio: "16 / 9",
    allow:
      "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share",
    allowFullScreen: true,
  });
});

test("preserves pasted iframe src, query params, and dimensions", () => {
  const embed = buildVideoEmbed(
    '<iframe width="560" height="315" src="https://www.youtube-nocookie.com/embed/PTf6YCZrD0M?si=iyzeR0t1ur7fdzXD&amp;controls=0" title="YouTube video player" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" referrerpolicy="strict-origin-when-cross-origin" allowfullscreen></iframe>'
  );

  assert.deepEqual(embed, {
    kind: "embed",
    provider: "youtube",
    src: "https://www.youtube-nocookie.com/embed/PTf6YCZrD0M?si=iyzeR0t1ur7fdzXD&controls=0",
    aspectRatio: "560 / 315",
    allow:
      "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share",
    referrerPolicy: "strict-origin-when-cross-origin",
    allowFullScreen: true,
  });
});

test("supports common video services and direct video files", () => {
  assert.equal(
    buildVideoEmbed("https://www.dailymotion.com/video/x8abcde")?.src,
    "https://www.dailymotion.com/embed/video/x8abcde"
  );
  assert.equal(
    buildVideoEmbed("https://www.tiktok.com/@guestnix/video/1234567890")?.src,
    "https://www.tiktok.com/embed/v2/1234567890"
  );
  assert.equal(
    buildVideoEmbed("https://www.instagram.com/reel/Cabc123/")?.src,
    "https://www.instagram.com/reel/Cabc123/embed"
  );
  assert.equal(
    buildVideoEmbed("https://www.loom.com/share/abc123")?.src,
    "https://www.loom.com/embed/abc123"
  );
  assert.deepEqual(buildVideoEmbed("https://cdn.example.com/guide.mp4"), {
    kind: "native",
    provider: "direct",
    src: "https://cdn.example.com/guide.mp4",
    aspectRatio: "16 / 9",
  });
});

test("does not treat arbitrary websites as video embeds", () => {
  assert.equal(detectVideoProvider("https://example.com"), null);
  assert.equal(buildVideoEmbed("https://example.com"), null);
});
