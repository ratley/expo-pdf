import { Ionicons, MaterialIcons } from "@expo/vector-icons";
import * as FileSystem from "expo-file-system";
import { PdfView, type PdfViewRef, shareAsync } from "expo-pdf";
import { SymbolView } from "expo-symbols";
import { useEffect, useRef, useState } from "react";
import {
	ActivityIndicator,
	Alert,
	Modal,
	Platform,
	StyleSheet,
	TouchableOpacity,
	View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as DropdownMenu from "zeego/dropdown-menu";
import { useTheme } from "@/hooks/useTheme";
import { ThemedText } from "./Themed";

// Toggle to enable/disable zooming interactions in the PDF image viewer
export const ZOOM_ENABLED = true;

export type PdfViewerProps = {
	visible: boolean;
	onClose: () => void;
	source: string; // http(s) / file path / file:// / bundle name
	title?: string;
	initialPage?: number; // 1-based preferred alias
	enableDoubleTapZoom?: boolean;
	spacing?: number;
	scrollEnabled?: boolean;
	initialPageIndex?: number;
};

export default function PdfViewer({
	visible,
	onClose,
	source,
	title,
	initialPage,
	enableDoubleTapZoom,
	spacing,
	scrollEnabled,
	initialPageIndex,
}: PdfViewerProps) {
	const { colors } = useTheme();
	const insets = useSafeAreaInsets();
	const [busy, setBusy] = useState(false);
	const [footerSidesWidth, setFooterSidesWidth] = useState(0);
	const [loadedSource, setLoadedSource] = useState<string | null>(null);
	const [error, setError] = useState<string | null>(null);
	const [page, setPage] = useState(0);
	const [pageCount, setPageCount] = useState(0);
	const pdfRef = useRef<PdfViewRef | null>(null);
	const [password, setPassword] = useState<string | undefined>(undefined);
	// Track native password flow to avoid showing our loading spinner on iOS
	const [waitingForPassword, setWaitingForPassword] = useState(false);

	const isLoading = !error && loadedSource !== source;

	const getUtiForMimeType = (mime: string) => {
		switch (mime) {
			case "application/pdf":
				return "com.adobe.pdf" as unknown as string | undefined;
			case "image/png":
				return "public.png" as unknown as string | undefined;
			case "image/jpeg":
				return "public.jpeg" as unknown as string | undefined;
			default:
				return undefined as unknown as string | undefined;
		}
	};

	const writeTempFileFromBase64 = async (
		base64: string,
		extension: "pdf" | "png" | "jpg",
		mime: string,
	) => {
		const filenameBase = (title || "document").replace(/\s+/g, "_");
		const path = `${FileSystem.cacheDirectory}${filenameBase}_${Date.now()}.${extension}`;
		await FileSystem.writeAsStringAsync(path, base64, {
			encoding: FileSystem.EncodingType.Base64,
		});
		return { path, mime } as const;
	};

	const handleShare = async () => {
		try {
			setBusy(true);
			await shareAsync({ source });
		} catch (e) {
			Alert.alert("Error", "Unable to share this document.");
		} finally {
			setBusy(false);
		}
	};

	const handleSaveToFiles = async () => {
		try {
			setBusy(true);
			await handleShare();
		} catch (e) {
			Alert.alert("Error", "Unable to save this file.");
		} finally {
			setBusy(false);
		}
	};

	const handleEmail = async () => {
		Alert.alert("Email", "Email option coming soon.");
	};

	const isFirstPage = page <= 1;
	const isLastPage = pageCount > 0 && page >= pageCount;

	useEffect(() => {
		if (source) {
			setPassword(undefined);
			setError(null);
			setLoadedSource(null);
			setPage(0);
			setPageCount(0);
		}
	}, [source]);

	useEffect(() => {
		if (!visible) {
			setPassword(undefined);
		}
	}, [visible]);

	return (
		<Modal
			visible={visible}
			onRequestClose={onClose}
			animationType="fade"
			transparent
		>
			<View
				style={[
					styles.overlay,
					{
						paddingBottom: insets.bottom,
						paddingTop: Platform.OS === "ios" ? insets.top : 10,
					},
				]}
			>
				<View
					style={[
						styles.header,
						{ backgroundColor: "rgba(0,0,0,0.75)", paddingBottom: 10 },
					]}
				>
					<View style={{ width: 32 }} />
					<View style={styles.headerCenter}>
						{!!title && (
							<ThemedText
								numberOfLines={1}
								style={[styles.title, { color: "#fff" }]}
							>
								{title}
							</ThemedText>
						)}
					</View>
					<View style={styles.headerRight}>
						<DropdownMenu.Root>
							<DropdownMenu.Trigger>
								<TouchableOpacity
									style={[
										styles.headerBtn,
										{
											backgroundColor: "#fff",
											borderRadius: 100,
											width: 30,
											height: 30,
											justifyContent: "center",
											alignItems: "center",
											opacity:
												busy || isLoading || waitingForPassword ? 0.5 : 1,
										},
									]}
									disabled={busy || isLoading || waitingForPassword}
								>
									{Platform.OS === "android" ? (
										<Ionicons
											name="ellipsis-horizontal-sharp"
											size={18}
											color={"#000"}
										/>
									) : (
										<SymbolView
											name="ellipsis"
											size={18}
											tintColor={colors.text.primary}
										/>
									)}
								</TouchableOpacity>
							</DropdownMenu.Trigger>

							<DropdownMenu.Content>
								<DropdownMenu.Item key="share" onSelect={() => handleShare()}>
									<DropdownMenu.ItemTitle>Share</DropdownMenu.ItemTitle>
									<DropdownMenu.ItemIcon
										ios={{
											name: "square.and.arrow.up",
											pointSize: 20,
											weight: "regular",
											scale: "medium",
										}}
									/>
								</DropdownMenu.Item>

								<DropdownMenu.Item key="email" onSelect={() => handleEmail()}>
									<DropdownMenu.ItemTitle>Email</DropdownMenu.ItemTitle>
									<DropdownMenu.ItemSubtitle>
										Send to primary email
									</DropdownMenu.ItemSubtitle>
									<DropdownMenu.ItemIcon
										ios={{
											name: "envelope",
											pointSize: 20,
											weight: "regular",
											scale: "medium",
										}}
									/>
								</DropdownMenu.Item>

								{Platform.OS === "android" && (
									<DropdownMenu.Item
										key="files"
										onSelect={() => handleSaveToFiles()}
									>
										<DropdownMenu.ItemTitle>
											Save to Files
										</DropdownMenu.ItemTitle>
										<DropdownMenu.ItemIcon
											ios={{
												name: "folder",
												pointSize: 20,
												weight: "regular",
												scale: "medium",
											}}
										/>
									</DropdownMenu.Item>
								)}
							</DropdownMenu.Content>
						</DropdownMenu.Root>
					</View>
				</View>
				<View style={styles.body}>
					{error && (
						<ThemedText style={{ color: colors.error.foreground }}>
							{error}
						</ThemedText>
					)}

					<View style={{ flex: 1 }}>
						{visible && source ? (
							<PdfView
								ref={pdfRef}
								source={source}
								showThumbnails={false}
								displayMode="singlePageContinuous"
								displayDirection="vertical"
								autoScales
								enableDoubleTapZoom={
									typeof enableDoubleTapZoom === "boolean"
										? enableDoubleTapZoom
										: true
								}
								spacing={typeof spacing === "number" ? spacing : 8}
								scrollEnabled={
									typeof scrollEnabled === "boolean" ? scrollEnabled : true
								}
								initialPage={initialPage}
								initialPageIndex={initialPageIndex}
								password={password}
								onLoad={(e) => {
									setPageCount(e.nativeEvent.pageCount);
									setLoadedSource(source);
									setError(null);
									setWaitingForPassword(false);
								}}
								onError={(e) => {
									setError(e.nativeEvent.message);
								}}
								onPasswordRequired={() => {
									setWaitingForPassword(true);
								}}
								onPageChanged={(e) => {
									setPage(e.nativeEvent.page);
									if (typeof e.nativeEvent.pageCount === "number") {
										setPageCount(e.nativeEvent.pageCount);
									}
									// Fallback: consider loaded once paging info arrives.
									setLoadedSource((prev) => (prev === source ? prev : source));
									if (waitingForPassword) setWaitingForPassword(false);
								}}
								style={{ flex: 1 }}
							/>
						) : null}
					</View>

					{/* Loading overlay (does not affect layout) */}
					{isLoading && !waitingForPassword && (
						<View
							pointerEvents="none"
							style={{
								...StyleSheet.absoluteFillObject,
								justifyContent: "center",
								alignItems: "center",
							}}
						>
							<ActivityIndicator size="large" color={colors.spotBlue.primary} />
						</View>
					)}
				</View>

				<View
					style={[
						styles.footer,
						{
							paddingTop: 10,
							backgroundColor: "rgba(0,0,0,0.75)",
						},
					]}
				>
					<View style={[styles.footerLeft, { width: footerSidesWidth }]}>
						<TouchableOpacity
							onPress={onClose}
							style={[
								styles.footerBtn,
								{
									backgroundColor: "#fff",
									borderRadius: 100,
									width: 32,
									height: 32,
									justifyContent: "center",
									alignItems: "center",
								},
							]}
						>
							<MaterialIcons name="close" size={22} color={"#000"} />
						</TouchableOpacity>
					</View>
					<View style={styles.footerCenter}>
						{loadedSource === source && pageCount > 0 && (
							<ThemedText style={[styles.pageIndicator, { color: "#bbb" }]}>
								Page {page} / {pageCount}
							</ThemedText>
						)}
					</View>
					<View
						style={styles.footerRight}
						onLayout={(e) => {
							const w = e.nativeEvent.layout.width;
							if (w !== footerSidesWidth) setFooterSidesWidth(w);
						}}
					>
						<TouchableOpacity
							onPress={() => pdfRef.current?.prev?.()}
							style={[styles.navBtn, isFirstPage && { opacity: 0.5 }]}
							disabled={isFirstPage}
						>
							<MaterialIcons name="chevron-left" size={26} color={"#fff"} />
						</TouchableOpacity>
						<TouchableOpacity
							onPress={() => pdfRef.current?.next?.()}
							style={[styles.navBtn, isLastPage && { opacity: 0.5 }]}
							disabled={isLastPage}
						>
							<MaterialIcons name="chevron-right" size={26} color={"#fff"} />
						</TouchableOpacity>
					</View>
				</View>
			</View>
		</Modal>
	);
}

export const styles = StyleSheet.create({
	overlay: {
		flex: 1,
		backgroundColor: "rgba(0,0,0,0.95)",
	},
	body: {
		flex: 1,
		position: "relative",
	},
	header: {
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "space-between",
		paddingHorizontal: 12,
		gap: 8,
	},
	footer: {
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "space-between",
		paddingHorizontal: 12,
		gap: 8,
	},
	footerBtn: {
		flexDirection: "row",
		alignItems: "center",
		gap: 6,

		borderRadius: 8,
	},
	footerBtnText: { fontWeight: "600" },
	footerCenter: { alignItems: "center", justifyContent: "center", flex: 1 },
	footerRight: { flexDirection: "row", alignItems: "center" },
	footerLeft: { justifyContent: "center" },
	headerCenter: { alignItems: "center", justifyContent: "center", flex: 1 },
	headerRight: { flexDirection: "row", alignItems: "center" },
	headerBtn: {
		flexDirection: "row",
		alignItems: "center",
		gap: 6,
		borderRadius: 8,
	},
	title: { fontWeight: "600", fontSize: 15 },
	pageIndicator: { marginTop: 2, fontSize: 12 },

	navBtn: { padding: 6 },
});
