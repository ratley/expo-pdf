import * as React from "react";

import type { ExpoPdfViewProps } from "./ExpoPdf.types";

export default function ExpoPdfView(props: ExpoPdfViewProps) {
	const { source, onLoad, onError } = props;
	return (
		<div style={{ display: "flex", flex: 1 }}>
			<iframe
				style={{ flex: 1, width: "100%", border: "none" }}
				src={source}
				title="ExpoPdfView"
				onLoad={() =>
					onLoad({ nativeEvent: { source, pageCount: Number.NaN } })
				}
				onError={() =>
					onError?.({ nativeEvent: { message: "Failed to load PDF" } })
				}
			/>
		</div>
	);
}
