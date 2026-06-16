"use client";

const WORD_MARK_SELECTOR = "mark.sl-search-word-match";

type FocusResult = {
  target: HTMLElement;
  mark: HTMLElement | null;
};

export function clearGuidebookSearchMarks(root: ParentNode) {
  const marks = Array.from(
    root.querySelectorAll<HTMLElement>(WORD_MARK_SELECTOR)
  );

  for (const mark of marks) {
    const parent = mark.parentNode;
    if (!parent) continue;

    parent.replaceChild(document.createTextNode(mark.textContent ?? ""), mark);
    parent.normalize();
  }
}

export function focusGuidebookSearchTarget(
  root: HTMLElement,
  selector: string,
  query: string
): FocusResult | null {
  const target = root.querySelector<HTMLElement>(selector);
  if (!target) return null;

  clearGuidebookSearchMarks(root);
  const mark = highlightQueryInTarget(target, query);
  const scrollTarget = mark ?? target;

  if (mark) {
    openHiddenAncestors(mark);
  }

  scrollTarget.scrollIntoView({
    behavior: "smooth",
    block: "center",
    inline: "nearest",
  });

  return { target, mark };
}

function highlightQueryInTarget(target: HTMLElement, query: string) {
  const phrase = query.trim();
  if (phrase.length < 2) return null;

  const phraseMark = highlightCandidates(target, [phrase]);
  if (phraseMark) return phraseMark;

  const terms = phrase
    .split(/\s+/)
    .map((term) => term.trim())
    .filter((term) => term.length >= 2);

  return highlightCandidates(target, terms);
}

function highlightCandidates(target: HTMLElement, candidates: string[]) {
  const unique = Array.from(
    new Set(candidates.map((candidate) => candidate.toLowerCase()))
  ).sort((a, b) => b.length - a.length);

  if (unique.length === 0) return null;

  const walker = document.createTreeWalker(
    target,
    NodeFilter.SHOW_TEXT,
    {
      acceptNode(node) {
        const text = node.nodeValue ?? "";
        if (!text.trim()) return NodeFilter.FILTER_REJECT;

        const parent = node.parentElement;
        if (!parent || shouldSkipNode(parent)) {
          return NodeFilter.FILTER_REJECT;
        }

        const lower = text.toLowerCase();
        return unique.some((candidate) => lower.includes(candidate))
          ? NodeFilter.FILTER_ACCEPT
          : NodeFilter.FILTER_REJECT;
      },
    }
  );

  const textNodes: Text[] = [];
  while (walker.nextNode()) {
    textNodes.push(walker.currentNode as Text);
  }

  let firstMark: HTMLElement | null = null;
  for (const node of textNodes) {
    const marks = wrapMatches(node, unique);
    if (!firstMark && marks.length > 0) {
      firstMark = marks[0];
    }
  }

  return firstMark;
}

function wrapMatches(node: Text, candidates: string[]) {
  const text = node.nodeValue ?? "";
  const lower = text.toLowerCase();
  const ranges: Array<{ start: number; end: number }> = [];

  for (const candidate of candidates) {
    let index = lower.indexOf(candidate);
    while (index !== -1) {
      const range = { start: index, end: index + candidate.length };
      if (!ranges.some((existing) => overlaps(existing, range))) {
        ranges.push(range);
      }
      index = lower.indexOf(candidate, index + candidate.length);
    }
  }

  if (ranges.length === 0) return [];

  ranges.sort((a, b) => a.start - b.start);

  const fragment = document.createDocumentFragment();
  const marks: HTMLElement[] = [];
  let cursor = 0;

  for (const range of ranges) {
    if (range.start > cursor) {
      fragment.appendChild(document.createTextNode(text.slice(cursor, range.start)));
    }

    const mark = document.createElement("mark");
    mark.className = "sl-search-word-match";
    mark.textContent = text.slice(range.start, range.end);
    fragment.appendChild(mark);
    marks.push(mark);
    cursor = range.end;
  }

  if (cursor < text.length) {
    fragment.appendChild(document.createTextNode(text.slice(cursor)));
  }

  node.parentNode?.replaceChild(fragment, node);
  return marks;
}

function overlaps(
  first: { start: number; end: number },
  second: { start: number; end: number }
) {
  return first.start < second.end && second.start < first.end;
}

function shouldSkipNode(element: HTMLElement) {
  return Boolean(
    element.closest(
      [
        WORD_MARK_SELECTOR,
        "script",
        "style",
        "noscript",
        "svg",
        "input",
        "textarea",
        "select",
        "[contenteditable='true']",
      ].join(",")
    )
  );
}

function openHiddenAncestors(element: HTMLElement) {
  let current: HTMLElement | null = element;
  while (current) {
    if (current instanceof HTMLDetailsElement) {
      current.open = true;
    }
    current = current.parentElement;
  }
}
