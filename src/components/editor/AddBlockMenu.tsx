"use client";

import { useMemo, useState } from "react";
import {
  AlertTriangle,
  Banknote,
  CircleHelp,
  Clock,
  CloudSun,
  Code2,
  Contact,
  ExternalLink,
  FileText,
  Grid2X2,
  Heading1,
  Image as ImageIcon,
  Images,
  Languages,
  LibraryBig,
  ListChecks,
  Lock,
  LayoutGrid,
  MapPinned,
  MousePointer2,
  PanelTop,
  PanelsTopLeft,
  Plus,
  ShieldAlert,
  SplitSquareHorizontal,
  Table2,
  Tv,
  Video,
  Wifi,
} from "lucide-react";
import { toast } from "sonner";
import { apiFetch } from "@/lib/api-fetch";
import { toastApiError } from "@/lib/toast-error";
import {
  getAssetBlockContent,
  getAssetBlockType,
} from "@/lib/assets-hub";
import { randomUUID } from "@/lib/utils";
import { useAssetsHubContentBlocks } from "@/hooks/use-assets-hub-content-blocks";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useEditorStore } from "@/stores/editor-store";
import { BlockPickerCommand, groupBlockOptions } from "./BlockOptionPicker";

type Props = {
  sectionId: string;
};

export type BlockOption = {
  id: string;
  type: string;
  label: string;
  category: "Content" | "Media" | "Layout" | "Widgets";
  icon: React.ComponentType<{ className?: string }>;
  defaultContent: Record<string, unknown>;
  source?: "assets_hub";
  assetId?: string;
};

export const BLOCK_OPTIONS: BlockOption[] = [
  {
    id: "text-rich",
    type: "text",
    label: "Rich Text",
    category: "Content",
    icon: FileText,
    defaultContent: {
      html: "<p>Welcome {{guest_name}}. Write rich guest-facing content here.</p>",
    },
  },
  {
    id: "text-info-card",
    type: "text",
    label: "Info Card",
    category: "Content",
    icon: PanelTop,
    defaultContent: {
      variant: "callout",
      html: "<p>Add focused details in a card-style surface.</p>",
      callout: {
        eyebrow: "Details",
        icon: "",
        title: "Important details",
        subtitle: "",
        action_label: "",
        action_href: "",
        cta_enabled: false,
        card_style: "simple",
        body_enabled: true,
        icon_size: 1,
        mobile_stack: false,
        accent_role: "secondary",
        style_id: "",
        style_customized: true,
      },
    },
  },
  {
    id: "text-list",
    type: "text",
    label: "List",
    category: "Content",
    icon: ListChecks,
    defaultContent: {
      variant: "checklist",
      label: "List",
      checklist: {
        style: "soft_icon_bullets",
        icon: "",
        icon_size: 1,
        label_enabled: false,
        heading_enabled: false,
        heading: "",
        accent_role: "secondary",
        number_font: "playfair",
      },
      checklist_items: [
        { icon: "ph:sparkle-fill", text: "Item one", note: "" },
        { icon: "ph:sparkle-fill", text: "Item two", note: "" },
        { icon: "ph:sparkle-fill", text: "Item three", note: "" },
      ],
    },
  },
  {
    id: "text-facts",
    type: "text",
    label: "Facts Grid",
    category: "Content",
    icon: Table2,
    defaultContent: {
      variant: "facts",
      facts_style: "basic",
      facts_config: {
        icon_size: 1,
        accent_role: "secondary",
      },
      facts: [
        {
          label: "Item A",
          value: "Value",
          note: "",
          icon: "",
          image_url: "",
          badge: "",
        },
        {
          label: "Item B",
          value: "Value",
          note: "",
          icon: "",
          image_url: "",
          badge: "",
        },
      ],
    },
  },
  {
    id: "text-contacts",
    type: "text",
    label: "Contact Rows",
    category: "Content",
    icon: Contact,
    defaultContent: {
      variant: "contacts",
      contacts_style: "clean_cards",
      contacts_config: {
        icon_size: 1,
        accent_role: "secondary",
      },
      contacts: [{ icon: "", label: "Contact", value: "", href: "" }],
    },
  },
  {
    id: "text-alert",
    type: "text",
    label: "Alert Banner",
    category: "Content",
    icon: AlertTriangle,
    defaultContent: {
      variant: "alert",
      alert_style: "classic",
      alert_config: {
        icon_size: 1,
        accent_role: "secondary",
      },
      alert: {
        label: "Important",
        value: "Add the key alert here.",
        icon: "",
        href: "",
      },
    },
  },
  {
    id: "heading",
    type: "heading",
    label: "Heading",
    category: "Content",
    icon: Heading1,
    defaultContent: {
      text: "New heading",
      level: 2,
      alignment: "left",
      style: "display",
      show_divider: false,
      advanced_enabled: false,
      advanced_style: "tapered_end",
      accent_role: "secondary",
      decor_position: "center",
      decor_width: "wide",
      decor_weight: "normal",
      decor_offset: "normal",
      decor_motion: true,
      decor_angle: -2,
      taper_mode: "center",
      node_shape: "diamond",
      marker_variant: "marker",
      marker_height: "medium",
      orbit_shape: "circle",
      orbit_count: 1,
      orbit_taper: false,
      crosshair_corners: "two",
      crosshair_direction: "tl-br",
      sidebar_variant: "rule",
      sidebar_height: "text",
      sidebar_width: "medium",
    },
  },
  {
    id: "icon-grid",
    type: "icon_grid",
    label: "Icon Grid",
    category: "Content",
    icon: LayoutGrid,
    defaultContent: {
      style: "numbered_minimal",
      config: {
        accent_role: "primary",
        animation: "style_default",
      },
      items: [
        {
          icon: "",
          title: "Feature 1",
          description: "Description for feature 1",
        },
        {
          icon: "",
          title: "Feature 2",
          description: "Description for feature 2",
        },
      ],
    },
  },
  {
    id: "image-cards",
    type: "image_cards",
    label: "Image Cards",
    category: "Content",
    icon: PanelsTopLeft,
    defaultContent: {
      style: "classic",
      config: {
        accent_role: "primary",
        animation: "style_default",
        image_fit: "cover",
        image_position: "center",
      },
      cards: [
        {
          image_url: "",
          alt: "",
          title: "Fast Check-In",
          description:
            "Skip the line and enter with your personal smart-lock code.",
          icon: "",
          cta_enabled: false,
          cta_label: "Learn more",
          cta_href: "",
        },
      ],
    },
  },
  {
    id: "tile-set",
    type: "tile_set",
    label: "Tile Set",
    category: "Content",
    icon: Grid2X2,
    defaultContent: {
      title: "What's Included",
      style: "basic",
      config: {
        icon_size: 1,
        accent_role: "secondary",
      },
      tiles: [
        { icon: "", label: "Coffee" },
        { icon: "", label: "Body Wash" },
        { icon: "", label: "Extra TP" },
      ],
    },
  },
  {
    id: "custom-html",
    type: "custom_html",
    label: "HTML Code",
    category: "Content",
    icon: Code2,
    defaultContent: {
      html: "<div>Custom HTML</div>",
    },
  },
  {
    id: "faq",
    type: "faq",
    label: "FAQ / Accordion",
    category: "Content",
    icon: CircleHelp,
    defaultContent: {
      style: "basic",
      config: {
        accent_role: "secondary",
      },
      items: [{ question: "Question", answer: "Answer" }],
    },
  },
  {
    id: "image-photo",
    type: "image",
    label: "Photo",
    category: "Media",
    icon: ImageIcon,
    defaultContent: { url: "", alt: "", caption: "", fit: "cover" },
  },
  {
    id: "video",
    type: "video",
    label: "Video",
    category: "Media",
    icon: Video,
    defaultContent: { source: "service", url: "" },
  },
  {
    id: "gallery",
    type: "gallery",
    label: "Gallery",
    category: "Media",
    icon: Images,
    defaultContent: { images: [], layout: "grid" },
  },
  {
    id: "divider",
    type: "divider",
    label: "Divider / Spacer",
    category: "Layout",
    icon: SplitSquareHorizontal,
    defaultContent: {
      style: "flourish",
      spacing: "medium",
      config: {
        accent_role: "secondary",
      },
    },
  },

  // ─── Widgets ─────────────────────────────────────────────
  {
    id: "wifi",
    type: "wifi",
    label: "Wi-Fi + QR",
    category: "Widgets",
    icon: Wifi,
    defaultContent: {
      network_name: "{{wifi_network_name}}",
      password: "{{wifi_password}}",
      show_qr: true,
      notes: "{{wifi_note}}",
      style: "brand_card",
      title: "Stay connected",
      eyebrow: "Wi-Fi Access",
      config: {
        accent_role: "accent",
        qr_size: "medium",
        layout: "stacked",
        password_display: "code",
        animation: "style_default",
      },
    },
  },
  {
    id: "container",
    type: "container",
    label: "Block Container",
    category: "Layout",
    icon: PanelsTopLeft,
    defaultContent: {
      title: "Arrival and departure",
      subtitle: "Grouped guest instructions",
      icon: "ph:squares-four-fill",
      style: "section_card",
      config: {
        accent_role: "secondary",
        layout: "stacked",
        width: "full",
        padding: "medium",
        radius: "medium",
        child_spacing: "normal",
        child_surface: "blend",
        inherit_accent: true,
        inherit_typography: false,
        show_header: true,
        animation: "style_default",
      },
      children: [
        {
          id: "container-child-heading",
          type: "heading",
          orderIndex: 0,
          isVisible: true,
          content: {
            text: "Arrival details",
            level: 2,
            alignment: "left",
            style: "display",
            show_divider: false,
          },
        },
        {
          id: "container-child-smart-lock",
          type: "smart_lock",
          orderIndex: 1,
          isVisible: true,
          content: {
            title: "Door code",
            subtitle: "Access details for your stay",
            code: "{{door_code}}",
            reveal_at: "{{access_reveal_time}}",
            instructions: "Use the code when it is available.",
            icon: "",
            style: "secure_card",
            config: {
              accent_role: "primary",
              layout: "stacked",
              code_display: "large_code",
              show_copy: true,
              animation: "style_default",
            },
            items: [
              {
                type: "door",
                label: "Front door",
                code: "{{door_code}}",
                reveal_at: "{{access_reveal_time}}",
                instructions: "Use the code when it is available.",
                icon: "",
              },
            ],
          },
        },
        {
          id: "container-child-checkout",
          type: "text",
          orderIndex: 2,
          isVisible: true,
          content: {
            variant: "checklist",
            label: "Before checkout",
            checklist: {
              style: "soft_icon_bullets",
              icon: "",
              icon_size: 1,
              label_enabled: true,
              heading_enabled: false,
              heading: "",
              accent_role: "secondary",
              number_font: "playfair",
            },
            checklist_items: [
              {
                icon: "ph:check-circle-fill",
                text: "Return keys and remotes",
                note: "",
              },
              {
                icon: "ph:check-circle-fill",
                text: "Take out trash",
                note: "",
              },
            ],
          },
        },
      ],
    },
  },
  {
    id: "button",
    type: "button",
    label: "Button / CTA",
    category: "Content",
    icon: MousePointer2,
    defaultContent: {
      label: "Tap me",
      action: "url",
      value: "",
      style: "primary",
      icon: "",
      config: {
        accent_role: "primary",
        size: "medium",
        width: "auto",
        align: "left",
        icon_position: "left",
        animation: "style_default",
      },
    },
  },
  {
    id: "booking_link",
    type: "booking_link",
    label: "Booking Link",
    category: "Widgets",
    icon: ExternalLink,
    defaultContent: {
      label: "Book your next stay",
      url: "",
      platform: "direct",
      subtitle: "",
      style: "clean_card",
      icon: "",
      config: {
        accent_role: "platform",
        layout: "horizontal",
        show_platform: true,
        show_icon: true,
        animation: "style_default",
      },
    },
  },
  {
    id: "streaming",
    type: "streaming",
    label: "Streaming / TV Guide",
    category: "Widgets",
    icon: Tv,
    defaultContent: {
      services: [
        {
          service: "netflix",
          login_mode: "account",
          instructions: "",
        },
      ],
    },
  },
  {
    id: "world_clock",
    type: "world_clock",
    label: "World Clock",
    category: "Widgets",
    icon: Clock,
    defaultContent: {
      title: "World clocks",
      subtitle: "Helpful times for international guests",
      style: "clean_cards",
      icon: "",
      config: {
        accent_role: "secondary",
        layout: "grid",
        time_format: "12h",
        show_date: true,
        show_timezone: true,
        animation: "style_default",
      },
      clocks: [
        { label: "Local", timezone: "UTC" },
      ],
    },
  },
  {
    id: "smart_lock",
    type: "smart_lock",
    label: "Smart Lock / Access Code",
    category: "Widgets",
    icon: Lock,
    defaultContent: {
      title: "Door code",
      subtitle: "Access details for your stay",
      code: "{{door_code}}",
      reveal_at: "{{access_reveal_time}}",
      instructions: "",
      icon: "",
      style: "secure_card",
      config: {
        accent_role: "primary",
        layout: "stacked",
        code_display: "large_code",
        show_copy: true,
        animation: "style_default",
      },
      items: [
        {
          type: "door",
          label: "Front door",
          code: "{{door_code}}",
          reveal_at: "{{access_reveal_time}}",
          instructions: "",
          icon: "",
        },
      ],
    },
  },
  {
    id: "emergency_contacts",
    type: "emergency_contacts",
    label: "Local Emergency Numbers",
    category: "Widgets",
    icon: ShieldAlert,
    defaultContent: {
      country: "US",
      custom_contacts: [],
    },
  },
  {
    id: "phrasebook",
    type: "phrasebook",
    label: "Phrasebook",
    category: "Widgets",
    icon: Languages,
    defaultContent: {
      language: "es",
      title: "Phrasebook",
      subtitle: "Useful local phrases for guests",
      style: "accordion",
      icon: "",
      config: {
        accent_role: "primary",
        layout: "accordion",
        show_pronunciation: true,
        show_category_counts: true,
        animation: "style_default",
      },
      categories: ["greetings", "dining"],
      custom_phrases: [],
    },
  },
  {
    id: "currency",
    type: "currency",
    label: "Currency Converter",
    category: "Widgets",
    icon: Banknote,
    defaultContent: {
      base: "USD",
      targets: ["EUR", "GBP"],
      default_amount: 1,
    },
  },
  {
    id: "weather",
    type: "weather",
    label: "Weather",
    category: "Widgets",
    icon: CloudSun,
    defaultContent: {
      location_label: "",
      lat: 0,
      lng: 0,
      units: "celsius",
      forecast_days: 3,
    },
  },
  {
    id: "add-places",
    type: "add_places",
    label: "Add Places",
    category: "Widgets",
    icon: MapPinned,
      defaultContent: {
        title: "Places nearby",
        subtitle: "Host recommendations from saved Local Places",
        selection_mode: "all",
        place_ids: [],
        style: "clean_grid",
        config: {
        accent_role: "secondary",
        layout: "grid",
        show_images: true,
        show_category: true,
        show_description: true,
          show_address: true,
          show_actions: true,
          full_details: false,
          animation: "style_default",
        },
      },
  },
];

function createDefaultBlockContent(opt: BlockOption): Record<string, unknown> {
  const content = structuredClone(opt.defaultContent) as Record<string, unknown>;
  if (opt.type !== "container" || !Array.isArray(content.children)) {
    return content;
  }

  content.children = content.children.map((child, index) =>
    child && typeof child === "object"
      ? {
          ...(child as Record<string, unknown>),
          id: randomUUID(),
          orderIndex: index,
        }
      : child
  );
  return content;
}

export function AddBlockMenu({ sectionId }: Props) {
  const [open, setOpen] = useState(false);
  const guidebookId = useEditorStore((s) => s.guidebookId);
  const sections = useEditorStore((s) => s.sections);
  const addBlockLocal = useEditorStore((s) => s.addBlock);
  const deleteBlockLocal = useEditorStore((s) => s.deleteBlock);
  const applyDraftTouch = useEditorStore((s) => s.applyDraftTouch);
  const { assets: savedContentBlocks } = useAssetsHubContentBlocks();

  const section = useMemo(
    () => sections.find((s) => s.id === sectionId),
    [sections, sectionId]
  );
  const nextOrderIndex = section?.blocks.length ?? 0;

  const savedOptions = useMemo<BlockOption[]>(
    () =>
      savedContentBlocks.map((asset) => ({
        id: `asset:${asset.id}`,
        type: getAssetBlockType(asset),
        label: asset.name,
        category: "Content",
        icon: LibraryBig,
        defaultContent: getAssetBlockContent(asset),
        source: "assets_hub",
        assetId: asset.id,
      })),
    [savedContentBlocks]
  );

  const blockGroups = useMemo(
    () => groupBlockOptions([...savedOptions, ...BLOCK_OPTIONS]),
    [savedOptions]
  );

  const createBlock = async (opt: BlockOption) => {
    if (!guidebookId) return;
    if (!section) return;

    const blockId = randomUUID();
    const content = createDefaultBlockContent(opt);
    addBlockLocal(section.id, {
      id: blockId,
      type: opt.type,
      content,
      orderIndex: nextOrderIndex,
      isVisible: true,
    });
    setOpen(false);

    const result = await apiFetch("/api/blocks", {
      method: "POST",
      body: {
        id: blockId,
        sectionId: section.id,
        guidebookId,
        type: opt.type,
        content,
        orderIndex: nextOrderIndex,
      },
    });

    if (!result.ok) {
      deleteBlockLocal(blockId);
      toastApiError(result.error, { title: "Couldn't add block" });
      return;
    }
    applyDraftTouch(result.data);

    if (opt.assetId) {
      void apiFetch(`/api/assets-hub/${opt.assetId}/use`, { method: "POST" });
    }

    toast.success(`${opt.label} block added`);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger render={<Button size="sm" className="editor-cta" />}>
        <Plus className="mr-1.5 h-3.5 w-3.5" />
        Add block
      </PopoverTrigger>
      <PopoverContent
        className="w-[min(30rem,calc(100vw-2rem))] p-1.5"
        align="start"
        sideOffset={8}
      >
        <BlockPickerCommand
          options={blockGroups}
          onAdd={(option) => void createBlock(option)}
        />
      </PopoverContent>
    </Popover>
  );
}
