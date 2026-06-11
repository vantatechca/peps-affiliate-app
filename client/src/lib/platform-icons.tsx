import {
  SiYoutube,
  SiTiktok,
  SiInstagram,
  SiFacebook
} from "react-icons/si";

export type PlatformType =
  | "YouTube Shorts"
  | "TikTok"
  | "Instagram"
  | "Instagram Reels"
  | "Facebook Reels"
  | string;

interface PlatformIconConfig {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  color: string;
  bgColor: string;
}

const PLATFORM_CONFIGS: Record<string, PlatformIconConfig> = {
  "youtube shorts": {
    icon: SiYoutube,
    label: "YouTube Shorts",
    color: "text-red-500",
    bgColor: "bg-red-50",
  },
  "youtube": {
    icon: SiYoutube,
    label: "YouTube",
    color: "text-red-500",
    bgColor: "bg-red-50",
  },
  "tiktok": {
    icon: SiTiktok,
    label: "TikTok",
    color: "text-black dark:text-white",
    bgColor: "bg-gray-100 dark:bg-gray-800",
  },
  "instagram": {
    icon: SiInstagram,
    label: "Instagram",
    color: "text-pink-500",
    bgColor: "bg-pink-50",
  },
  "instagram reels": {
    icon: SiInstagram,
    label: "Instagram Reels",
    color: "text-pink-500",
    bgColor: "bg-pink-50",
  },
  "facebook reels": {
    icon: SiFacebook,
    label: "Facebook Reels",
    color: "text-blue-600",
    bgColor: "bg-blue-50",
  },
  "facebook": {
    icon: SiFacebook,
    label: "Facebook",
    color: "text-blue-600",
    bgColor: "bg-blue-50",
  },
};

export function getPlatformConfig(platform: PlatformType): PlatformIconConfig | null {
  const normalizedPlatform = platform?.toLowerCase()?.trim();
  return PLATFORM_CONFIGS[normalizedPlatform] || null;
}

interface PlatformIconProps {
  platform: PlatformType;
  className?: string;
  showLabel?: boolean;
  size?: "sm" | "md" | "lg";
}

const SIZE_CLASSES = {
  sm: "h-4 w-4",
  md: "h-5 w-5",
  lg: "h-6 w-6",
};

export function PlatformIcon({
  platform,
  className = "",
  showLabel = false,
  size = "md"
}: PlatformIconProps) {
  const config = getPlatformConfig(platform);

  if (!config) {
    return null;
  }

  const IconComponent = config.icon;
  const sizeClass = SIZE_CLASSES[size];

  if (showLabel) {
    return (
      <div className={`inline-flex items-center gap-1.5 ${className}`}>
        <IconComponent className={`${sizeClass} ${config.color}`} />
        <span className="text-sm font-medium">{config.label}</span>
      </div>
    );
  }

  return <IconComponent className={`${sizeClass} ${config.color} ${className}`} />;
}

interface PlatformBadgeProps {
  platform: PlatformType;
  className?: string;
  size?: "sm" | "md" | "lg";
}

export function PlatformBadge({
  platform,
  className = "",
  size = "md"
}: PlatformBadgeProps) {
  const config = getPlatformConfig(platform);

  if (!config) {
    return (
      <div className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-md bg-gray-100 ${className}`}>
        <span className="text-sm font-medium text-gray-600">{platform}</span>
      </div>
    );
  }

  const IconComponent = config.icon;
  const sizeClass = SIZE_CLASSES[size];
  const paddingClass = size === "sm" ? "px-1.5 py-0.5" : size === "lg" ? "px-3 py-1.5" : "px-2 py-1";
  const textClass = size === "sm" ? "text-xs" : size === "lg" ? "text-base" : "text-sm";

  return (
    <div className={`inline-flex items-center gap-1.5 ${paddingClass} rounded-md ${config.bgColor} ${className}`}>
      <IconComponent className={`${sizeClass} ${config.color}`} />
      <span className={`${textClass} font-medium ${config.color}`}>{config.label}</span>
    </div>
  );
}
