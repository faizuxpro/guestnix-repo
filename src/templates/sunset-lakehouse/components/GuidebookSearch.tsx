"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  BookOpen,
  Home,
  MapPin,
  ShoppingBag,
  User,
  X,
  type LucideIcon,
} from "lucide-react";
import { HostIcon } from "@/components/icons/HostIcon";
import type {
  TopbarSearchExpandBehavior,
  TopbarSearchMotion,
  TopbarSearchStyle,
} from "@/lib/topbar-settings";
import {
  searchGuidebookItems,
  type GuidebookSearchItem,
  type GuidebookSearchResult,
  type GuidebookSearchTargetType,
} from "../search";
import { editorInspectAttributes } from "@/lib/editor-inspect";

type Props = {
  items: GuidebookSearchItem[];
  onSelect: (result: GuidebookSearchResult, query: string) => void;
  icon?: string;
  styleVariant?: TopbarSearchStyle;
  expandBehavior?: TopbarSearchExpandBehavior;
  motion?: TopbarSearchMotion;
};

const TYPE_META: Record<
  GuidebookSearchTargetType,
  { label: string; Icon: LucideIcon }
> = {
  home: { label: "Home", Icon: Home },
  host: { label: "Host", Icon: User },
  section: { label: "Guide", Icon: BookOpen },
  block: { label: "Guide", Icon: BookOpen },
  place: { label: "Nearby", Icon: MapPin },
  store: { label: "Store", Icon: ShoppingBag },
};

export function GuidebookSearch({
  items,
  onSelect,
  icon,
  styleVariant = "pill",
  expandBehavior = "expand",
  motion = "normal",
}: Props) {
  const [query, setQuery] = useState("");
  const [isFocused, setIsFocused] = useState(false);
  const [isFloating, setIsFloating] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const rootRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const blurTimerRef = useRef<number | null>(null);
  const collapseTimerRef = useRef<number | null>(null);
  const trimmedQuery = query.trim();
  const canExpand = expandBehavior === "expand";

  const results = useMemo(
    () => searchGuidebookItems(items, trimmedQuery),
    [items, trimmedQuery]
  );
  const showPanel = isFocused && trimmedQuery.length >= 2;

  useEffect(() => {
    return () => {
      if (blurTimerRef.current) window.clearTimeout(blurTimerRef.current);
      if (collapseTimerRef.current) {
        window.clearTimeout(collapseTimerRef.current);
      }
    };
  }, []);

  const clearSearchTimers = () => {
    if (blurTimerRef.current) {
      window.clearTimeout(blurTimerRef.current);
      blurTimerRef.current = null;
    }
    if (collapseTimerRef.current) {
      window.clearTimeout(collapseTimerRef.current);
      collapseTimerRef.current = null;
    }
  };

  const expandSearch = () => {
    clearSearchTimers();
    const root = rootRef.current;
    const topbar = root?.closest<HTMLElement>(".sl-topbar");

    if (root && topbar) {
      const rootRect = root.getBoundingClientRect();
      const topbarRect = topbar.getBoundingClientRect();
      root.style.setProperty(
        "--sl-search-compact-left",
        `${rootRect.left - topbarRect.left}px`
      );
      root.style.setProperty(
        "--sl-search-compact-right",
        `${topbarRect.right - rootRect.right}px`
      );
    }

    setIsFocused(true);
    if (!canExpand) return;

    setIsFloating(true);
    requestAnimationFrame(() => {
      setIsExpanded(true);
    });
  };

  const collapseSearch = () => {
    blurTimerRef.current = window.setTimeout(() => {
      setIsFocused(false);
      if (!canExpand) return;

      setIsExpanded(false);
      collapseTimerRef.current = window.setTimeout(() => {
        setIsFloating(false);
      }, 260);
    }, 120);
  };

  const selectResult = (result: GuidebookSearchResult) => {
    onSelect(result, trimmedQuery);
    setQuery("");
    setIsFocused(false);
    setIsExpanded(false);
    setIsFloating(false);
    setActiveIndex(0);
    inputRef.current?.blur();
  };

  const renderedIsFloating = canExpand && isFloating;
  const renderedIsExpanded = canExpand && isExpanded;

  return (
    <div
      ref={rootRef}
      className={`sl-guide-search sl-guide-search--style-${styleVariant} sl-guide-search--motion-${motion} sl-guide-search--${expandBehavior}${
        renderedIsFloating ? " is-floating" : ""}${
        renderedIsExpanded ? " is-expanded" : ""
      }${isFocused ? " is-focused" : ""}${
        showPanel ? " is-open" : ""
      }`}
      {...editorInspectAttributes(
        { kind: "navigation", focus: "search" },
        "Edit search"
      )}
    >
      <div className="sl-guide-search-field">
        <HostIcon
          value={icon}
          className="sl-guide-search-icon"
          fallbackIconifyId="ph:magnifying-glass-bold"
        />
        <input
          ref={inputRef}
          type="search"
          value={query}
          onChange={(event) => {
            setQuery(event.target.value);
            setActiveIndex(0);
          }}
          onKeyDown={(event) => {
            if (event.key === "Escape") {
              setQuery("");
              setIsFocused(false);
              setIsExpanded(false);
              setIsFloating(false);
              setActiveIndex(0);
              return;
            }
            if (!results.length) return;
            if (event.key === "ArrowDown") {
              event.preventDefault();
              setActiveIndex((index) => (index + 1) % results.length);
            } else if (event.key === "ArrowUp") {
              event.preventDefault();
              setActiveIndex(
                (index) => (index - 1 + results.length) % results.length
              );
            } else if (event.key === "Enter") {
              event.preventDefault();
              selectResult(results[activeIndex] ?? results[0]);
            }
          }}
          className="sl-guide-search-input"
          placeholder="Search guidebook"
          role="combobox"
          aria-label="Search guidebook"
          aria-autocomplete="list"
          aria-expanded={showPanel}
          aria-controls="sl-guide-search-results"
          aria-activedescendant={
            showPanel && results[activeIndex]
              ? `sl-guide-search-result-${results[activeIndex].id}`
              : undefined
          }
          autoComplete="off"
          spellCheck={false}
          onFocus={expandSearch}
          onBlur={collapseSearch}
        />
        {query ? (
          <button
            type="button"
            className="sl-guide-search-clear"
            onMouseDown={(event) => event.preventDefault()}
            onClick={() => {
              setQuery("");
              setActiveIndex(0);
              inputRef.current?.focus();
            }}
            aria-label="Clear search"
          >
            <X aria-hidden />
          </button>
        ) : null}
      </div>

      {showPanel ? (
        <div
          id="sl-guide-search-results"
          className="sl-guide-search-results"
          role="listbox"
          aria-label="Guidebook search results"
        >
          {results.length > 0 ? (
            results.map((result, index) => {
              const meta = TYPE_META[result.type];
              const Icon = meta.Icon;
              const isActive = index === activeIndex;
              return (
                <button
                  key={result.id}
                  id={`sl-guide-search-result-${result.id}`}
                  type="button"
                  role="option"
                  aria-selected={isActive}
                  className={`sl-guide-search-result${
                    isActive ? " is-active" : ""
                  }`}
                  onMouseDown={(event) => event.preventDefault()}
                  onMouseEnter={() => setActiveIndex(index)}
                  onClick={() => selectResult(result)}
                >
                  <span className="sl-guide-search-result-icon">
                    <Icon aria-hidden />
                  </span>
                  <span className="sl-guide-search-result-copy">
                    <span className="sl-guide-search-result-title">
                      {result.title}
                    </span>
                    <span className="sl-guide-search-result-snippet">
                      {highlightSnippet(result.snippet, trimmedQuery)}
                    </span>
                    <span className="sl-guide-search-result-type">
                      {result.subtitle || meta.label}
                    </span>
                  </span>
                </button>
              );
            })
          ) : (
            <div className="sl-guide-search-empty" role="status">
              No results found
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
}

function highlightSnippet(snippet: string, query: string) {
  const trimmed = query.trim();
  if (!trimmed) return snippet;

  const index = snippet.toLowerCase().indexOf(trimmed.toLowerCase());
  if (index < 0) return snippet;

  return (
    <>
      {snippet.slice(0, index)}
      <mark>{snippet.slice(index, index + trimmed.length)}</mark>
      {snippet.slice(index + trimmed.length)}
    </>
  );
}
