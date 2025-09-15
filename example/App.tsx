import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useEvent } from "expo";
import ExpoPdf, { getPageThumbnailAsync } from "expo-pdf";
import { useCallback, useEffect, useState } from "react";
import {
	ActivityIndicator,
	Image,
	SafeAreaView,
	ScrollView,
	Text,
	TextInput,
	TouchableOpacity,
	View,
} from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import PdfViewer from "./components/PDFViewerLayout";

function titleFromUrl(input: string): string | undefined {
	try {
		const url = new URL(input);
		const pathname = url.pathname || "";
		const last = pathname.split("/").filter(Boolean).pop();
		if (last) return decodeURIComponent(last);
		// Fallback to host
		return url.host || undefined;
	} catch {
		// Not a valid URL; maybe it's a file path
		const parts = input.split("/").filter(Boolean);
		const last = parts.pop();
		return last || undefined;
	}
}

import { ThemeProvider } from "./providers/ThemeProvider";

export const queryClient = new QueryClient();

export default function App() {
	const onChangePayload = useEvent(ExpoPdf, "onChange");

	// Demo documents
	const documents = [
		{
			id: "adobe",
			title: "Adobe Sample",
			source:
				"https://www.adobe.com/support/products/enterprise/knowledgecenter/media/c4611_sample_explain.pdf",
		},

		// Note: Avoid hosting-dependent protected PDFs that block direct download.
		// Use the Custom URL field below or a local file path for password testing.
	];

	// Thumbnails for the list
	const [thumbs, setThumbs] = useState<Record<string, string>>({});
	const [loadingThumbs, setLoadingThumbs] = useState<boolean>(false);
	const [customUrl, setCustomUrl] = useState<string>("");

	const withTimeout = useCallback(
		<T,>(p: Promise<T>, ms = 8000): Promise<T> => {
			return new Promise<T>((resolve, reject) => {
				const t = setTimeout(() => reject(new Error("timeout")), ms);
				p.then((v) => {
					clearTimeout(t);
					resolve(v);
				}).catch((e) => {
					clearTimeout(t);
					reject(e);
				});
			});
		},
		[],
	);

	useEffect(() => {
		let mounted = true;
		(async () => {
			setLoadingThumbs(true);
			const results: Record<string, string> = {};
			for (const doc of documents) {
				try {
					const dataUrl = await withTimeout(
						getPageThumbnailAsync({
							source: doc.source,
							page: 1,
							width: 200,
							height: 260,
							scale: 2,
						}),
						8000,
					);
					results[doc.id] = dataUrl;
				} catch {
					// ignore
				}
			}
			if (mounted) setThumbs(results);
			if (mounted) setLoadingThumbs(false);
		})();
		return () => {
			mounted = false;
		};
	}, [withTimeout]);

	// Modal PDF viewer state
	const [selected, setSelected] = useState<null | {
		title: string;
		source: string;
	}>(null);

	return (
		<QueryClientProvider client={queryClient}>
			<SafeAreaProvider>
				<ThemeProvider>
					<SafeAreaView style={styles.container}>
						<ScrollView style={styles.container}>
							<Text style={styles.header}>Module API Example</Text>
							<Group name="Documents">
								<View style={{ marginBottom: 16 }}>
									<Text style={{ marginBottom: 8 }}>
										Enter a direct PDF URL (works with password-protected PDFs
										that allow direct download), then tap Open.
									</Text>
									<View
										style={{
											flexDirection: "row",
											gap: 8,
											alignItems: "center",
										}}
									>
										<TextInput
											value={customUrl}
											onChangeText={setCustomUrl}
											placeholder="https://example.com/your.pdf"
											autoCapitalize="none"
											autoCorrect={false}
											style={{
												flex: 1,
												backgroundColor: "#f3f3f3",
												paddingHorizontal: 10,
												height: 40,
												borderRadius: 6,
											}}
										/>
										<TouchableOpacity
											onPress={() => {
												if (customUrl.trim().length > 0) {
													const src = customUrl.trim();
													setSelected({
														title: titleFromUrl(src) || "",
														source: src,
													});
												}
											}}
											style={{
												backgroundColor: "#111",
												paddingHorizontal: 12,
												height: 40,
												borderRadius: 6,
												justifyContent: "center",
											}}
										>
											<Text style={{ color: "#fff", fontWeight: "600" }}>
												Open
											</Text>
										</TouchableOpacity>
									</View>
								</View>
								{loadingThumbs ? (
									<View style={{ padding: 20 }}>
										<ActivityIndicator />
										<Text>Generating thumbnails…</Text>
									</View>
								) : (
									<View style={{ flexDirection: "row", flexWrap: "wrap" }}>
										{documents.map((doc) => (
											<TouchableOpacity
												key={doc.id}
												activeOpacity={0.8}
												onPress={() => {
													setSelected({ title: doc.title, source: doc.source });
												}}
												style={{
													width: 160,
													marginRight: 12,
													marginBottom: 16,
												}}
											>
												<View
													style={{
														width: 160,
														height: 210,
														backgroundColor: "#ddd",
														borderRadius: 8,
														overflow: "hidden",
														alignItems: "center",
														justifyContent: "center",
													}}
												>
													{thumbs[doc.id] ? (
														<Image
															source={{ uri: thumbs[doc.id] }}
															style={{ width: 160, height: 210 }}
														/>
													) : (
														<ActivityIndicator />
													)}
												</View>
												<Text style={{ marginTop: 6, maxWidth: 160 }}>
													{doc.title}
												</Text>
											</TouchableOpacity>
										))}
									</View>
								)}
							</Group>
							{/* <Group name="Constants">
                    <Text>{ExpoPdf.PI}</Text>
                </Group> */}
							{/* <Group name="Functions">
                    <Text>{ExpoPdf.hello()}</Text>
                </Group>
                <Group name="Async functions">
                    <Button
                        title="Set value"
                        onPress={async () => {
                            await ExpoPdf.setValueAsync("Hello from JS!");
                        }}
                    />
                </Group>
                <Group name="Events">
                    <Text>{onChangePayload?.value}</Text>
                </Group> */}

							<PdfViewer
								visible={!!selected}
								onClose={() => setSelected(null)}
								source={selected?.source ?? ""}
								title={selected?.title}
							/>
						</ScrollView>
					</SafeAreaView>
				</ThemeProvider>
			</SafeAreaProvider>
		</QueryClientProvider>
	);
}

function Group(props: { name: string; children: React.ReactNode }) {
	return (
		<View style={styles.group}>
			<Text style={styles.groupHeader}>{props.name}</Text>
			{props.children}
		</View>
	);
}

const styles = {
	header: {
		fontSize: 30,
		margin: 20,
	},
	groupHeader: {
		fontSize: 20,
		marginBottom: 20,
	},
	group: {
		margin: 20,
		backgroundColor: "#fff",
		borderRadius: 10,
		padding: 20,
	},
	container: {
		flex: 1,
		backgroundColor: "#eee",
	},
	view: {
		flex: 1,
		height: 200,
	},
};
