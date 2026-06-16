"use client";

import type { CSSProperties, ReactNode } from "react";
import { HostIcon } from "@/components/icons/HostIcon";
import { blockColorOverrideVars } from "@/lib/block-colors";
import type {
  ContainerChildBlock,
  ContainerChildSpacing,
  ContainerChildSurface,
  ContainerContent,
  ContainerLayout,
  ContainerPadding,
  ContainerRadius,
  ContainerStyle,
  ContainerWidth,
  TemplateBlock,
  WidgetAnimation,
  WidgetColorRole,
} from "../types";

type Props = {
  content: Partial<ContainerContent>;
  renderChild: (block: TemplateBlock) => ReactNode;
};

const CONTAINER_STYLES: ContainerStyle[] = [
  "clean_panel",
  "section_card",
  "soft_band",
  "glass_panel",
  "dark_panel",
  "outline",
  "ticket",
  "brutalist",
];

const COLOR_ROLES: WidgetColorRole[] = ["primary", "secondary", "accent"];
const LAYOUTS: ContainerLayout[] = ["stacked", "grid", "two_column", "compact"];
const WIDTHS: ContainerWidth[] = ["full", "contained", "narrow"];
const PADDING: ContainerPadding[] = ["none", "small", "medium", "large"];
const RADII: ContainerRadius[] = ["none", "small", "medium", "large"];
const CHILD_SPACING: ContainerChildSpacing[] = ["tight", "normal", "loose"];
const CHILD_SURFACES: ContainerChildSurface[] = ["original", "blend", "cards"];
const ANIMATIONS: WidgetAnimation[] = [
  "style_default",
  "none",
  "lift",
  "glow",
  "pulse",
];

function coerce<T extends string>(
  value: unknown,
  values: readonly T[],
  fallback: T
): T {
  return values.includes(value as T) ? (value as T) : fallback;
}

function clean(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function readChildren(content: Partial<ContainerContent>): ContainerChildBlock[] {
  if (!Array.isArray(content.children)) return [];
  return content.children
    .filter((child) => child.type !== "container")
    .map((child, index) => ({
      ...child,
      id: clean(child.id) || `container-child-${index}`,
      orderIndex:
        typeof child.orderIndex === "number" ? child.orderIndex : index,
      isVisible:
        typeof child.isVisible === "boolean" ? child.isVisible : true,
      content:
        typeof child.content === "object" && child.content !== null
          ? child.content
          : {},
    }))
    .sort((a, b) => a.orderIndex - b.orderIndex);
}

export function ContainerBlock({ content, renderChild }: Props) {
  const title = clean(content.title);
  const subtitle = clean(content.subtitle);
  const icon = clean(content.icon) || "ph:squares-four-fill";
  const style = coerce(content.style, CONTAINER_STYLES, "section_card");
  const config =
    typeof content.config === "object" && content.config !== null
      ? content.config
      : undefined;
  const accentRole = coerce(config?.accent_role, COLOR_ROLES, "secondary");
  const layout = coerce(config?.layout, LAYOUTS, "stacked");
  const width = coerce(config?.width, WIDTHS, "full");
  const padding = coerce(config?.padding, PADDING, "medium");
  const radius = coerce(config?.radius, RADII, "medium");
  const childSpacing = coerce(config?.child_spacing, CHILD_SPACING, "normal");
  const childSurface = coerce(config?.child_surface, CHILD_SURFACES, "blend");
  const animation = coerce(config?.animation, ANIMATIONS, "style_default");
  const inheritAccent =
    typeof config?.inherit_accent === "boolean" ? config.inherit_accent : true;
  const inheritTypography =
    typeof config?.inherit_typography === "boolean"
      ? config.inherit_typography
      : false;
  const showHeader =
    typeof config?.show_header === "boolean" ? config.show_header : true;
  const children = readChildren(content).filter((child) => child.isVisible);

  if (children.length === 0 && !title && !subtitle) return null;

  return (
    <section
      className="sl-block-container"
      data-style={style}
      data-color-role={accentRole}
      data-layout={layout}
      data-width={width}
      data-padding={padding}
      data-radius={radius}
      data-child-spacing={childSpacing}
      data-child-surface={childSurface}
      data-inherit-accent={inheritAccent ? "true" : "false"}
      data-inherit-typography={inheritTypography ? "true" : "false"}
      data-animation={animation}
      style={
        blockColorOverrideVars([
          {
            value: config?.accent_color,
            colorVar: "--sl-container-color",
            rgbVar: "--sl-container-color-rgb",
            contrastVar: "--sl-container-contrast",
          },
        ]) as CSSProperties
      }
    >
      {showHeader && (title || subtitle || icon) ? (
        <header className="sl-block-container-head">
          <span className="sl-block-container-icon" aria-hidden>
            <HostIcon value={icon} />
          </span>
          <span className="sl-block-container-copy">
            <span className="sl-block-container-eyebrow">Group</span>
            {title ? <span className="sl-block-container-title">{title}</span> : null}
            {subtitle ? (
              <span className="sl-block-container-subtitle">{subtitle}</span>
            ) : null}
          </span>
        </header>
      ) : null}

      {children.length > 0 ? (
        <div className="sl-block-container-children">
          {children.map((child) => (
            <div key={child.id} className="sl-block-container-child">
              {renderChild({
                id: child.id,
                type: child.type,
                content: child.content,
                orderIndex: child.orderIndex,
                isVisible: child.isVisible,
              })}
            </div>
          ))}
        </div>
      ) : null}
    </section>
  );
}
