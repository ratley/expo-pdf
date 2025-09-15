import { useTheme } from '@/hooks/useTheme';
import { View, ViewProps, ViewStyle } from 'react-native';
import { StyleSheet, Text, TextProps } from 'react-native';

export type ThemedViewProps = ViewProps & {
	variant?: 'primary' | 'secondary' | 'tertiary';
	rounded?: boolean;
	secondary?: boolean;
};

export function ThemedView({
	style,
	variant = 'primary',
	rounded = false,
	secondary = false,
	...otherProps
}: ThemedViewProps) {
	const { colors } = useTheme();

	// Check if style has any border width properties
	const hasBorder =
		style &&
		((style as ViewStyle).borderWidth !== undefined ||
			(style as ViewStyle).borderTopWidth !== undefined ||
			(style as ViewStyle).borderBottomWidth !== undefined ||
			(style as ViewStyle).borderLeftWidth !== undefined ||
			(style as ViewStyle).borderRightWidth !== undefined);

	return (
		<View
			style={[
				{
					backgroundColor: colors.background[variant],
					...(hasBorder && {
						borderColor: colors.border.primary,
					}),
					...(rounded && {
						borderRadius: 10,
					}),
					...(secondary && {
						backgroundColor: colors.background.secondary,
					}),
				},
				style,
			]}
			{...otherProps}
		/>
	);
}

export type ThemedTextProps = TextProps & {
	type?: 'default' | 'title' | 'defaultSemiBold' | 'subtitle' | 'link' | 'label';
	variant?: 'primary' | 'secondary' | 'tertiary';
};

export function ThemedText({
	style,
	type = 'default',
	variant = 'primary',
	...rest
}: ThemedTextProps) {
	const { colors, isDarkMode } = useTheme();

	const getTextColor = () => {
		if (variant !== 'primary') {
			return colors.text[variant];
		}
		switch (type) {
			case 'subtitle':
				return isDarkMode ? colors.text.primary : colors.text.secondary;
			case 'link':
				return colors.tint.primary;
			case 'label':
				return isDarkMode ? colors.text.primary : colors.text.tertiary;
			default:
				return colors.text[variant];
		}
	};

	const getFontSize = () => {
		switch (type) {
			case 'title':
				return 18;
			default:
				return 14;
		}
	};

	return (
		<Text
			style={[
				{ color: getTextColor(), fontSize: getFontSize() },
				styles[type],
				style,
			]}
			maxFontSizeMultiplier={1.6}
			{...rest}
		/>
	);
}

const styles = StyleSheet.create({
	default: {
		fontSize: 14,
	},
	defaultSemiBold: {
		fontSize: 16,

		fontWeight: '600',
	},
	title: {
		fontSize: 18,
		fontWeight: '600',
	},
	subtitle: {
		fontSize: 16,
		fontWeight: '500',
	},
	link: {
		fontSize: 16,
	},
	label: {
		fontSize: 14,
	},
});
