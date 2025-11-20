import type { ThemeConfig, ThemeId } from "@/types";

export const themes: Record<ThemeId, ThemeConfig> = {
  "classic-blue": {
    id: "classic-blue",
    name: "Classic Blue",
    colors: {
      primary: "#3B82F6", // blue-500
      secondary: "#60A5FA", // blue-400
      accent: "#10B981", // green-500
      background: "#F9FAFB", // gray-50
      surface: "#FFFFFF",
      text: "#111827", // gray-900
      textSecondary: "#6B7280", // gray-500
    },
  },
  "mint-clinic": {
    id: "mint-clinic",
    name: "Mint Clinic",
    colors: {
      primary: "#10B981", // green-500
      secondary: "#34D399", // green-400
      accent: "#3B82F6", // blue-500
      background: "#F0FDF4", // green-50
      surface: "#FFFFFF",
      text: "#064E3B", // green-900
      textSecondary: "#047857", // green-700
    },
  },
  "sakura-notebook": {
    id: "sakura-notebook",
    name: "Sakura Notebook",
    colors: {
      primary: "#EC4899", // pink-500
      secondary: "#F9A8D4", // pink-300
      accent: "#8B5CF6", // purple-500
      background: "#FDF2F8", // pink-50
      surface: "#FFFFFF",
      text: "#831843", // pink-900
      textSecondary: "#9D174D", // pink-800
    },
  },
  "midnight-travel": {
    id: "midnight-travel",
    name: "Midnight Travel",
    colors: {
      primary: "#6366F1", // indigo-500
      secondary: "#818CF8", // indigo-400
      accent: "#F59E0B", // amber-500
      background: "#1F2937", // gray-800
      surface: "#374151", // gray-700
      text: "#F9FAFB", // gray-50
      textSecondary: "#D1D5DB", // gray-300
    },
  },
};

export const getTheme = (themeId: ThemeId): ThemeConfig => {
  return themes[themeId];
};
