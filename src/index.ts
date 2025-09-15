// Reexport the native module. On web, it will be resolved to ExpoPdfModule.web.ts
// and on native platforms to ExpoPdfModule.ts

export * from "./ExpoPdf.types";
export { default } from "./ExpoPdfModule";
// Public component name
export { default as PdfView } from "./ExpoPdfView";
// Type aliases for convenience
export type { ExpoPdfViewProps as PdfViewProps, ExpoPdfViewRef as PdfViewRef } from "./ExpoPdf.types";

import type { ShareParams, ThumbnailParams } from "./ExpoPdf.types";
// Convenience helpers (object params only)
import Module from "./ExpoPdfModule";

export function shareAsync(params: ShareParams | string): Promise<void> {
	if (typeof params === "string") {
		return Module.shareAsync(params);
	}
	return Module.shareAsync(params.source);
}

export function getPageThumbnailAsync(
	params: ThumbnailParams,
): Promise<string> {
	return Module.getPageThumbnailAsync(params);
}

export function clearCacheAsync(): Promise<void> {
	return Module.clearCacheAsync();
}
