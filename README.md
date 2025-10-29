# expo-pdf

An Expo module that provides a fast, reliable PDF viewer for iOS and Android with a clean React Native API. It supports imperative page navigation, paging events, basic zoom controls, password‑protected files, and helpful utilities like sharing and page thumbnails.

## Install

- Add dependency: `npm install expo-pdf`
- iOS: run `npx pod-install`

## PdfView

Render a PDF from a URL, file path, or `file://` URI.

Props (cross‑platform)
- `source: string` — http(s) URL, local file path, `file://` URL, or bundle resource name.
- `page?: number` — 1‑based controlled page index.
- `initialPage?: number` — 1‑based one‑shot initial page.
- `initialPageIndex?: number` — 0‑based one‑shot initial page (advanced; prefer `initialPage`).
- `enableDoubleTapZoom?: boolean` — toggle double‑tap zoom. Default `true`.
- `spacing?: number` — inter‑page spacing.
- `scrollEnabled?: boolean` — enable/disable scrolling. Default `true`.
- `password?: string` — supply a password to unlock encrypted PDFs.
- `nativePasswordPrompt?: boolean` — Android only. Show a native password dialog when a locked PDF is detected. Defaults to `true`. Set to `false` to handle passwords in JS via `onPasswordRequired` and the `password` prop.

Events
- `onLoad({ nativeEvent: { source, pageCount } })`
- `onError({ nativeEvent: { message } })`
- `onPageChanged({ nativeEvent: { page, pageCount? } })`
- `onPasswordRequired()`
- `onScaleChanged({ nativeEvent: { scale } })` — iOS only.

Ref methods
- `next()` — go to next page
- `prev()` — go to previous page
- `goToPage(page: number)` — 1‑based
- `getPage(): number`
- `getPageCount(): number`

### Basic usage

```tsx
import { PdfView } from "expo-pdf";

export function Doc({ uri }: { uri: string }) {
  return (
    <PdfView
      source={uri}
      spacing={8}
      enableDoubleTapZoom
      onLoad={(e) => console.log("pages", e.nativeEvent.pageCount)}
    />
  );
}
```

### Disable next/prev at ends

```tsx
import { PdfView, type PdfViewRef } from "expo-pdf";
import { useRef, useState } from "react";

export function Paged({ uri }: { uri: string }) {
  const ref = useRef<PdfViewRef | null>(null);
  const [page, setPage] = useState(0);
  const [count, setCount] = useState(0);
  const isFirst = page <= 1;
  const isLast = count > 0 && page >= count;

  return (
    <>
      <PdfView
        ref={ref}
        source={uri}
        onLoad={(e) => setCount(e.nativeEvent.pageCount)}
        onPageChanged={(e) => {
          setPage(e.nativeEvent.page);
          if (typeof e.nativeEvent.pageCount === "number") setCount(e.nativeEvent.pageCount);
        }}
      />
      <Button disabled={isFirst} onPress={() => ref.current?.prev?.()} title="Prev" />
      <Button disabled={isLast} onPress={() => ref.current?.next?.()} title="Next" />
    </>
  );
}
```

### Utilities

- `shareAsync(source: string | { source: string })` — present native share sheet for the given source.
- `getPageThumbnailAsync({ source, page?, width, height, scale? })` — returns a PNG data URL.
- `clearCacheAsync()` — clears disk cache used for remote PDFs.

## Passwords

- iOS
  - When a locked document is detected and no working password is provided, the view emits `onPasswordRequired` and keeps content hidden until unlocked.
  - Provide the password via the `password` prop. On success, the view emits `onLoad({ pageCount })` and resumes normal events. Wrong passwords emit `onError({ message: "Invalid password" })`.

- Android
  - Default behavior shows a native password dialog when a locked PDF is detected. Disable with `nativePasswordPrompt={false}` to handle the flow in JS using `onPasswordRequired` + `password`.
  - Wrong passwords emit `onError({ message: "Invalid password" })` in JS‑driven mode.

- Minimal usage

```tsx
import { PdfView } from "expo-pdf";
import { useState } from "react";

export function ProtectedDoc({ uri, suppliedPassword }: { uri: string; suppliedPassword?: string }) {
  const [waitingForPassword, setWaitingForPassword] = useState(false);
  return (
    <PdfView
      source={uri}
      password={suppliedPassword}
      onPasswordRequired={() => setWaitingForPassword(true)}
      onLoad={() => setWaitingForPassword(false)}
    />
  );
}
```

Limitations
- `getPageThumbnailAsync` does not unlock password‑protected PDFs on Android; thumbnails for locked PDFs will fail.

## Example layout

See `example/components/PDFViewerLayout.tsx` for a headless layout that wires the props above and demonstrates page state, sharing, and edge‑button disabling.

## Platform notes

- iOS uses PDFKit.
- Android uses `PdfRenderer` for thumbnails and `AndroidPdfViewer` for on‑screen rendering ([marain87 fork](https://github.com/marain87/AndroidPdfViewer)).

## Contributing

PRs welcome! To develop locally with the example app:

1) Clone and build the module
- `git clone https://github.com/ratley/expo-pdf && cd expo-pdf`
- `bun install`
- `bun run build`

2) Run the example app (autolinks this module)
- iOS: `cd example && bunx expo run:ios`
- Android: `cd example && bunx expo run:android`

Notes
- After native iOS changes, re-running `bunx expo run:ios` from the `example` directory is sufficient. It will handle pod installation.
- You can also use `bun run ios|android` from the example if you prefer the package scripts.
