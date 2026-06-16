import readingTime from "reading-time";

export type ReadingTimeResult = {
  minutes: number;
  text: string;
  words: number;
};

export function computeReadingTime(body: string): ReadingTimeResult {
  const { minutes, text, words } = readingTime(body, { wordsPerMinute: 220 });
  return {
    minutes: Math.max(1, Math.round(minutes)),
    text,
    words,
  };
}
