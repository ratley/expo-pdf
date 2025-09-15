import AsyncStorage from "@react-native-async-storage/async-storage";
import { useQuery } from "@tanstack/react-query";
import { createContext, ReactNode, useContext } from "react";
import { Appearance, ColorSchemeName, useColorScheme } from "react-native";
import {
	colorPalette,
	darkColorsNew,
	globalColors,
	lightColorsNew,
	ThemeColors,
} from "../lib/constants/colors";
import { GLOBALCOLORS } from "../lib/constants/theme";

const StorageKey = {
	ThemePreference: "theme_preference",
};

type ThemeContextType = {
	isDarkMode: boolean;
	colors: ThemeColors;
	isLightMode: boolean;
	colorScheme: ColorSchemeName;
	themePreference: ColorSchemeName;
	setThemePreference: (theme: ColorSchemeName) => Promise<void>;
};

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: ReactNode }) {
	const systemColorScheme = useColorScheme();

	const { data: themePreference, refetch } = useQuery({
		queryKey: [StorageKey.ThemePreference],
		queryFn: () =>
			AsyncStorage.getItem(
				StorageKey.ThemePreference,
			) as Promise<ColorSchemeName>,
		initialData: null,
	});

	const setThemePreference = async (theme: ColorSchemeName | null) => {
		Appearance.setColorScheme(theme);
		if (theme === null) {
			await AsyncStorage.removeItem(StorageKey.ThemePreference);
		} else {
			await AsyncStorage.setItem(
				StorageKey.ThemePreference,
				theme as "light" | "dark",
			);
		}

		refetch();
	};

	const isDarkMode = themePreference
		? themePreference === "dark"
		: systemColorScheme === "dark";

	const themeValue = {
		isDarkMode,
		colors: {
			...GLOBALCOLORS,
			...globalColors,
			...colorPalette,
			...(isDarkMode ? darkColorsNew : lightColorsNew),
		},
		isLightMode: !isDarkMode,
		colorScheme: themePreference || systemColorScheme,
		themePreference,
		setThemePreference,
	};

	return (
		// @ts-ignore
		<ThemeContext.Provider value={themeValue}>{children}</ThemeContext.Provider>
	);
}

export const useTheme = () => {
	const context = useContext(ThemeContext);
	if (!context) {
		return {
			isDarkMode: false,
			colors: {
				...GLOBALCOLORS,
				...globalColors,
				...colorPalette,
				...lightColorsNew,
			},
			isLightMode: true,
			colorScheme: null,
			setColorScheme: () => {},
		} as unknown as ThemeContextType;
	}
	return context;
};
