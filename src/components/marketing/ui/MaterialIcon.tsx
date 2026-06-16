import {
  ArrowRight,
  BadgeDollarSign,
  BookOpen,
  Brain,
  Camera,
  CheckCircle2,
  Eye,
  Grid3X3,
  Home,
  LayoutDashboard,
  Palette,
  PlayCircle,
  QrCode,
  Route,
  Smartphone,
  Sparkles,
  Star,
  TrendingUp,
  Send,
  Wrench,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";

type Props = {
  name: string;
  className?: string;
  fill?: boolean;
  size?: number;
};

const ICONS: Record<string, LucideIcon> = {
  arrow_forward: ArrowRight,
  book_4: BookOpen,
  camera_alt: Camera,
  check_circle: CheckCircle2,
  dashboard_customize: LayoutDashboard,
  edit_document: Wrench,
  flutter_dash: Send,
  grid_view: Grid3X3,
  home_work: Home,
  insights: TrendingUp,
  palette: Palette,
  phone_iphone: Smartphone,
  play_circle: PlayCircle,
  qr_code: QrCode,
  route: Route,
  sell: BadgeDollarSign,
  smart_toy: Brain,
  star: Star,
  visibility: Eye,
  widgets: Sparkles,
};

export function MaterialIcon({ name, className, fill, size = 24 }: Props) {
  const Icon = ICONS[name] ?? Sparkles;

  return (
    <Icon
      className={cn(fill && "fill-current", className)}
      size={size}
      aria-hidden
    />
  );
}
