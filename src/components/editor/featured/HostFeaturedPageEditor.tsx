"use client";

import {
  Award,
  Crop,
  Expand,
  Globe,
  Languages as LanguagesIcon,
  Mail,
  MapPin,
  Phone,
  Sparkles,
  User,
  UserCircle2,
} from "lucide-react";
import { useEditorStore } from "@/stores/editor-store";
import {
  DEFAULT_HOST_PAGE_CONFIG,
  type HeroHostPageShowFlags,
  type HeroImageFit,
  type HostPhotoSource,
} from "@/lib/hero-data";
import { ImageUploadField } from "./ImageUploadField";
import { DetailsList, type DetailsItem } from "./controls/DetailsList";
import { FeaturedNavCard } from "./controls/PanelHeader";
import {
  SegmentedControl,
  SelectRow,
  SettingsField,
  SettingsSection,
} from "./controls/SettingsField";
import { EditorPanelShell } from "../settings-ui";

const SHOW_ITEMS: ReadonlyArray<DetailsItem<keyof HeroHostPageShowFlags>> = [
  { key: "avatar", label: "Photo", icon: <UserCircle2 className="h-3.5 w-3.5" /> },
  { key: "bio", label: "Bio", icon: <User className="h-3.5 w-3.5" /> },
  { key: "languages", label: "Languages", icon: <LanguagesIcon className="h-3.5 w-3.5" /> },
  { key: "superhost", label: "Superhost", icon: <Award className="h-3.5 w-3.5" /> },
  { key: "phone", label: "Phone", icon: <Phone className="h-3.5 w-3.5" /> },
  { key: "email", label: "Email", icon: <Mail className="h-3.5 w-3.5" /> },
  { key: "address", label: "Address", icon: <MapPin className="h-3.5 w-3.5" /> },
  { key: "social", label: "Social links", icon: <Globe className="h-3.5 w-3.5" /> },
];

const PHOTO_SOURCES: Array<{
  value: HostPhotoSource;
  label: string;
  icon: React.ReactNode;
}> = [
  {
    value: "host_avatar",
    label: "Host photo",
    icon: <UserCircle2 className="h-3.5 w-3.5" />,
  },
  {
    value: "property_logo",
    label: "Property logo",
    icon: <Sparkles className="h-3.5 w-3.5" />,
  },
];

type Props =
  | { mode: "card"; onSelect: () => void }
  | { mode: "detail" };

export function HostFeaturedPageEditor(props: Props) {
  const heroData = useEditorStore((s) => s.guidebook?.heroData);
  const updateHeroData = useEditorStore((s) => s.updateHeroData);

  if (props.mode === "card") {
    return (
      <FeaturedNavCard
        icon={<User className="h-4 w-4" />}
        title="Host / Meet Host"
        accent="amber"
        onSelect={props.onSelect}
      />
    );
  }

  if (!heroData) return null;
  const host = heroData.host;
  const hostPage = heroData.host_page;
  const show = hostPage.show;

  return (
    <EditorPanelShell contentClassName="space-y-4">
      <SettingsSection title="Host photo">
        <ImageUploadField
          label="Image"
          value={host.avatar_url}
          onChange={(url) => updateHeroData({ host: { avatar_url: url } })}
          variant="avatar"
          emptyText="Drop a host photo"
          assetsHubLabel="Use Assets Hub photo"
        />

        <SelectRow<HostPhotoSource>
          label="Source"
          inline
          value={hostPage.photo_source}
          onChange={(photo_source) =>
            updateHeroData({ host_page: { photo_source } })
          }
          options={PHOTO_SOURCES}
        />

        <SettingsField label="Fit" inline>
          <SegmentedControl<HeroImageFit>
            value={hostPage.photo_fit}
            onChange={(photo_fit) =>
              updateHeroData({ host_page: { photo_fit } })
            }
            options={[
              {
                value: "cover",
                label: "Fill",
                icon: <Expand className="h-3.5 w-3.5" />,
              },
              {
                value: "contain",
                label: "Fit",
                icon: <Crop className="h-3.5 w-3.5" />,
              },
            ]}
            ariaLabel="Host photo fit"
          />
        </SettingsField>
      </SettingsSection>

      <SettingsSection title="Show">
        <DetailsList
          items={SHOW_ITEMS}
          values={show}
          onToggle={(key, next) =>
            updateHeroData({ host_page: { show: { [key]: next } } })
          }
        />
      </SettingsSection>
    </EditorPanelShell>
  );
}

export function resetHostFeaturedConfig() {
  useEditorStore
    .getState()
    .updateHeroData({ host_page: structuredClone(DEFAULT_HOST_PAGE_CONFIG) });
}
