import { NativeModule, requireNativeModule } from "expo";

import type {
	ExpoPdfModuleEvents,
	ShareParams,
	ThumbnailParams,
} from "./ExpoPdf.types";

declare class ExpoPdfModule extends NativeModule<ExpoPdfModuleEvents> {
	PI: number;
	hello(): string;
	setValueAsync(value: string): Promise<void>;
	shareAsync(params: ShareParams | string): Promise<void>;
	getPageThumbnailAsync(params: ThumbnailParams): Promise<string>;
	clearCacheAsync(): Promise<void>;
}

// This call loads the native module object from the JSI.
export default requireNativeModule<ExpoPdfModule>("ExpoPdf");
