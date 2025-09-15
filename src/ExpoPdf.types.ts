import type { StyleProp, ViewStyle } from "react-native";

export type OnLoadEventPayload = {
	source: string;
	pageCount: number;
};

export type ExpoPdfModuleEvents = {
	onChange: (params: ChangeEventPayload) => void;
};

export type ChangeEventPayload = {
	value: string;
};

export type ExpoPdfViewProps = {
    source: string; // http(s) URL, file path, or file URL
    page?: number; // 1-based index
	/** 1-based one-shot initial page (preferred). Applied once when the document loads. */
	initialPage?: number;
	/** Enable or disable double-tap to zoom (iOS). Defaults to true. */
	enableDoubleTapZoom?: boolean;
	/** Spacing in points around/between pages (iOS). */
	spacing?: number;
	/** Enable or disable scrolling within the PDF view (iOS). Defaults to true. */
	scrollEnabled?: boolean;
    /** 0-based initial page index (advanced). Prefer `initialPage` (1-based). Ignored after first render. */
    initialPageIndex?: number;
    // No per-page border radius; use container View styles if needed.
	autoScales?: boolean;
	showThumbnails?: boolean;
	thumbnailsPlacement?: "leading" | "trailing" | "top" | "bottom";
	thumbnailSize?: { width: number; height: number };
	cachePolicy?: "none" | "disk";
	cacheTTL?: number; // seconds
	// Display configuration
	displayMode?:
		| "singlePage"
		| "singlePageContinuous"
		| "twoUp"
		| "twoUpContinuous";
	displayDirection?: "vertical" | "horizontal";
	displaysAsBook?: boolean;
	displaysPageBreaks?: boolean;
	minScaleFactor?: number;
	maxScaleFactor?: number;
	scaleFactor?: number;
	password?: string;
    /** Android: show a native password prompt when a locked PDF is detected. Default true. */
    nativePasswordPrompt?: boolean;
	onLoad: (event: { nativeEvent: OnLoadEventPayload }) => void;
	onError?: (event: { nativeEvent: { message: string } }) => void;
	onPageChanged?: (event: {
		nativeEvent: { page: number; pageCount?: number };
	}) => void;
	onScaleChanged?: (event: { nativeEvent: { scale: number } }) => void;
	onPasswordRequired?: () => void;
	style?: StyleProp<ViewStyle>;
};

export type ShareParams = {
	source: string;
	rect?: { x: number; y: number; width: number; height: number };
};

export type ThumbnailParams = {
	source: string;
	page?: number;
	width: number;
	height: number;
	scale?: number;
};

export type ExpoPdfViewRef = {
	next: () => void;
	prev: () => void;
	goToPage: (page: number) => void;
	getPage: () => number;
	getPageCount: () => number;
};
