export interface TemplateConfig {
  id: string;
  name: string;
  description: string;
  thumbnail: string;
  tier: "free" | "pro";
  fonts: string[];
  defaultColors: {
    primary: string;
    secondary: string;
  };
}

const config: TemplateConfig = {
  id: "sunset-lakehouse",
  name: "Sunset Lakehouse",
  description: "Warm, inviting design perfect for vacation homes and beach properties",
  thumbnail: "/templates/sunset-lakehouse.png",
  tier: "free",
  fonts: ["Montserrat"],
  defaultColors: {
    primary: "#002927",
    secondary: "#ffffff",
  },
};

export default config;
