import { NativeModule, registerWebModule } from "expo";

import type { ExpoPdfModuleEvents, ThumbnailParams } from "./ExpoPdf.types";

class ExpoPdfModule extends NativeModule<ExpoPdfModuleEvents> {
	PI = Math.PI;
	async setValueAsync(value: string): Promise<void> {
		this.emit("onChange", { value });
	}
	hello() {
		return "Hello world! 👋";
	}
	async shareAsync(_params: unknown): Promise<void> {
		return; // no-op on web
	}
	async getPageThumbnailAsync(_params: ThumbnailParams): Promise<string> {
		return "data:image/png;base64,"; // minimal placeholder
	}
	async clearCacheAsync(): Promise<void> {
		return;
	}
}

export default registerWebModule(ExpoPdfModule, "ExpoPdfModule");
