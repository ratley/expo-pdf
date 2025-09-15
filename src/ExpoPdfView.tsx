import { requireNativeView } from "expo";
import * as React from "react";

import type { ExpoPdfViewProps, ExpoPdfViewRef } from "./ExpoPdf.types";

// Methods are attached to the ref (per Expo Modules docs), not the component.
// We cast the native view to a forwardRef-compatible component so TS allows `ref`.
type ExpoPdfNativeRef = {
  next?: () => void | Promise<void>;
  prev?: () => void | Promise<void>;
  goToPage?: (page: number) => void | Promise<void>;
  getPage?: () => number | Promise<number>;
  getPageCount?: () => number | Promise<number>;
};

const NativeView = requireNativeView(
  "ExpoPdf",
) as unknown as React.ForwardRefExoticComponent<
  ExpoPdfViewProps & React.RefAttributes<ExpoPdfNativeRef>
>;

export default React.forwardRef<ExpoPdfViewRef, ExpoPdfViewProps>(
    function ExpoPdfView(props, ref) {
        const { onPageChanged } = props;
        const nativeRef = React.useRef<ExpoPdfNativeRef>(null);
		const pageRef = React.useRef<number>(1);
		const pageCountRef = React.useRef<number>(0);
        const resolvedSource = props.source;

		const handleLoad = React.useCallback(
			(event: Parameters<NonNullable<ExpoPdfViewProps["onLoad"]>>[0]) => {
				pageCountRef.current = event.nativeEvent.pageCount;
				props.onLoad(event);
			},
			[props],
		);

    const handlePageChanged = React.useCallback(
        (
            event: Parameters<NonNullable<ExpoPdfViewProps["onPageChanged"]>>[0],
        ) => {
            pageRef.current = event.nativeEvent.page;
            // Update pageCount if provided by native (iOS does send it)
            if (typeof (event as any).nativeEvent?.pageCount === "number") {
                pageCountRef.current = (event as any).nativeEvent.pageCount as number;
            }
            // Clear any outstanding requested page once native confirms the page.
            setRequestedPage(undefined);
            onPageChanged?.(event);
        },
        [onPageChanged],
    );

        React.useImperativeHandle(ref, () => ({
            next: () => nativeRef.current?.next?.() ?? internalSetPage(pageRef.current + 1),
            prev: () => nativeRef.current?.prev?.() ?? internalSetPage(pageRef.current - 1),
            goToPage: (page: number) =>
                nativeRef.current?.goToPage?.(page) ?? internalSetPage(page),
            getPage: () => pageRef.current,
            getPageCount: () => pageCountRef.current,
        }));

		const [requestedPage, setRequestedPage] = React.useState<
			number | undefined
		>(undefined);
    const internalSetPage = (page: number) => {
        // Optimistically update our local current page so repeated calls are monotonic
        pageRef.current = page;
        setRequestedPage(page);
    };

        return (
            <NativeView
                ref={nativeRef}
                {...props}
                source={resolvedSource}
                onLoad={handleLoad}
                onPageChanged={handlePageChanged}
                // Keep supporting a controlled page prop, but do not
                // auto-clear; we let native confirm page changes.
                page={requestedPage ?? props.page}
            />
        );
    },
);
