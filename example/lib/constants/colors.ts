import { Platform } from "react-native";
import { DARKMODECOLORS, LIGHTMODECOLORS } from "./theme";

const tintColorLight = "#2f95dc";
const tintColorDark = "#fff";

export const colorPalette = {
	red: {
		50: "#fef2f2",
		100: "#fee2e2",
		200: "#fecaca",
		300: "#fca5a5",
		400: "#f87171",
		500: "#ef4444",
		600: "#dc2626",
		700: "#b91c1c",
		800: "#991b1b",
		900: "#7f1d1d",
		950: "#450a0a",
	},
	yellow: {
		50: "#fefce8",
		100: "#fef9c3",
		150: "#fef4a6",
		200: "#fef08a",
		300: "#fde047",
		400: "#facc15",
		500: "#eab308",
		600: "#ca8a04",
		700: "#a16207",
		800: "#854d0e",
		900: "#713f12",
		950: "#422006",
	},
	orange: {
		50: "#fef9e7",
		100: "#feebc8",
		200: "#fcd3a5",
		300: "#fbbf86",
		400: "#f59e63",
		500: "#d97746",
		600: "#b45333",
		700: "#8e3c23",
		800: "#682b1a",
		900: "#431c12",
	},
	green: {
		50: "#f0fdf4",
		100: "#dcfce7",
		200: "#bbf7d0",
		300: "#86efac",
		400: "#4ade80",
		500: "#22c55e",
		600: "#16a34a",
		650: "#15803d",
		700: "#15803d",
		800: "#166534",
		900: "#14532d",
		950: "#052e16",
	},
	blue: {
		50: "#eff6ff",
		100: "#dbeafe",
		200: "#bfdbfe",
		300: "#93c5fd",
		400: "#60a5fa",
		500: "#3b82f6",
		600: "#2563eb",
		700: "#1d4ed8",
		800: "#1e40af",
		900: "#1e3a8a",
		950: "#172554",
	},
	indigo: {
		50: "#eef2ff",
		100: "#e0e7ff",
		200: "#c7d2fe",
		300: "#a5b4fc",
		400: "#818cf8",
		500: "#6366f1",
		600: "#4f46e5",
		700: "#4338ca",
		800: "#3730a3",
		900: "#312e81",
		950: "#1e1b4b",
	},
	purple: {
		50: "#f5f3ff",
		100: "#ede9fe",
		200: "#ddd6fe",
		300: "#c4b5fd",
		400: "#a78bfa",
		500: "#8b5cf6",
		600: "#7c3aed",
		700: "#6d28d9",
		800: "#5b21b6",
		900: "#4c1d95",
		950: "#2e1065",
	},
	pink: {
		50: "#fdf2f8",
		100: "#fce7f3",
		200: "#fbcfe8",
		300: "#f9a8d4",
		400: "#f472b6",
		500: "#ec4899",
		600: "#db2777",
		700: "#be185d",
		800: "#9d174d",
		900: "#831843",
		950: "#500724",
	},
	gray: {
		50: "#f9fafb",
		100: "#f5f5f5",
		200: "#e5e7eb",
		300: "#d1d5db",
		400: "#9ca3af",
		500: "#6b7280",
		600: "#4b5563",
		700: "#374151",
		800: "#25292e",
		900: "#111827",
		950: "#000000",
	},
};

export const globalColors = {
	white: "#FFFFFF",
	black: "#000000",
	spotRed: "#db3734",
	systemTint: Platform.OS === "ios" ? "#007AFF" : "#2196F3",
};

// TODO: phase out the use of legacy colors
export const colors = {
	...colorPalette,
	...globalColors,
	light: {
		...globalColors,
		...LIGHTMODECOLORS,

		invertedText: "#FFFFFF",

		invertedBackground: "#000000",
		tint: tintColorLight,
		tabIconDefault: "#CCCCCC",
		tabIconSelected: tintColorLight,
		border: "#CCCCCC",
		darkest: "#2F3136",
		text: {
			primary: "#1F2937",
			secondary: "#4B5563",
			tertiary: "#6B7280",
			title: "#111827",
			subtitle: "#374151",
			error: "#B91C1C",
		},
		background: {
			primary: "#FFFFFF",
			secondary: "#E3E5E8",
			tertiary: "#F3F4F6",
			error: "#FECDD3",
		},
	},
	dark: {
		...globalColors,
		...DARKMODECOLORS,
		text: "#FFFFFF",
		invertedText: "#000000",
		background: "rgba(47, 49, 54, 0.8)", // Assuming this is the value of DARKEST_OPAQUE
		backgroundSecondary: "#36393F",
		invertedBackground: "#FFFFFF",
		tint: tintColorDark,
		tabIconDefault: "#CCCCCC",
		tabIconSelected: tintColorDark,
		border: "#CCCCCC",
		darkest: "#2F3136",
	},
};

const spotBlue = {
	light: {
		primary: "hsl(212, 80%, 42%)",
		secondary: "hsl(212, 95%, 85%)",
		foreground: "white",
	},
	dark: {
		primary: "#5EABED",
		secondary: "hsl(208, 80%, 90%)",
		foreground: "#181a1b",
	},
};

export const statusColors = {
	light: {
		warning: {
			background: "#FFF4E5",
			foreground: "#7A4100",
		},
		info: {
			background: "#E8F4FD",
			foreground: "#0B3B75",
		},
		success: {
			background: "#E6F6E6",
			foreground: "#0B5A0B",
		},
		error: {
			background: "#FECACA",
			foreground: "#B91C1C",
		},
		neutral: {
			background: "#F3F4F6",
			foreground: "#1F2937",
		},
	},
	dark: {
		warning: {
			background: "#4C2E00",
			foreground: "#FFD699",
		},
		info: {
			background: "#0A3D62",
			foreground: "#B3D8F7",
		},
		success: {
			background: "#064E3B",
			foreground: "#A7F3D0",
		},
		error: {
			background: "#7F1D1D",
			foreground: "#FCA5A5",
		},
		neutral: {
			background: "#374151",
			foreground: "#E5E7EB",
		},
	},
};

export const lightColorsNew = {
	...colorPalette,
	...statusColors.light,
	spotBlue: spotBlue.light,
	text: {
		primary: "#121212",
		secondary: "#2e2e2e",
		tertiary: "#4d4d4d",
	},
	background: {
		primary: "#ffffff",
		secondary: "#f3f5f7",
		tertiary: "#e7ebef",
	},
	icon: {
		primary: LIGHTMODECOLORS.DARKGREY,
		secondary: LIGHTMODECOLORS.GREY,
	},
	disabled: {
		primary: LIGHTMODECOLORS.DISABLED,
		secondary: LIGHTMODECOLORS.MEDIUMDARK,
		tertiary: LIGHTMODECOLORS.DARKEST,
	},
	disabledText: {
		primary: LIGHTMODECOLORS.MUTED,
		secondary: LIGHTMODECOLORS.PLACEHOLDER,
		tertiary: LIGHTMODECOLORS.DISABLED,
	},
	tabIcon: {
		default: "#6B7280",
		selected: LIGHTMODECOLORS.SPOTBLUE,
	},
	tint: {
		primary: LIGHTMODECOLORS.SPOTBLUE,
	},
	border: {
		primary: "#E3E5E8",
		secondary: "#D1D5DB",
		tertiary: "#BFC5CE",
	},
	yellow: {
		50: "#fff9db",
		100: "#fff3bf",
		200: "#ffec99",
		300: "#ffe066",
		400: "#ffd43b",
		500: "#fcc419",
		600: "#fab005",
		700: "#f59f00",
		800: "#f08c00",
		900: "#e67700",
		950: "#cc5c00",
	},
};

export const darkColorsNew = {
	...colorPalette,
	...statusColors.dark,
	spotBlue: spotBlue.dark,
	text: {
		primary: "#fcfcfc",
		secondary: "#dadada",
		tertiary: "#c6c6c6",
	},
	background: {
		primary: "#181a1b",
		secondary: "#262a2b",
		tertiary: "#303436",
	},
	icon: {
		primary: DARKMODECOLORS.WHITE,
		secondary: DARKMODECOLORS.DARKGREY,
	},
	disabled: {
		primary: DARKMODECOLORS.DISABLED,
		secondary: DARKMODECOLORS.MEDIUMDARK,
		tertiary: DARKMODECOLORS.LIGHTEST,
	},
	disabledText: {
		primary: "#788287",
		secondary: "#60686c",
		tertiary: "#484e51",
	},
	tabIcon: {
		default: "#C4C4C4",
		selected: DARKMODECOLORS.SPOTBLUE,
	},
	tint: {
		primary: DARKMODECOLORS.SPOTBLUE,
	},
	border: {
		primary: "hsl(200, 5.90%, 25%)",
		secondary: "hsl(200, 5.90%, 30%)",
		tertiary: "hsl(200, 5.90%, 35%)",
	},
	yellow: {
		50: "#FFF7E6",
		100: "#FFEFCC",
		200: "#FFE499",
		300: "#FFD666",
		400: "#FFCB3B",
		500: "#FBBD19",
		600: "#FBAD05",
		700: "#F59300",
		800: "#F58B00",
		900: "#F58000",
		950: "#CC5200",
	},
};

export type ColorPalette = typeof colorPalette;
export type GlobalColors = typeof globalColors;
export type DarkColors = typeof darkColorsNew;
export type LightColors = typeof lightColorsNew;

export type ThemeColors = ColorPalette &
	GlobalColors &
	(DarkColors | LightColors);
