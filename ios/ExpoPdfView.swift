import ExpoModulesCore
import PDFKit
import UIKit
import CryptoKit

// This view will be used as a native component. Make sure to inherit from `ExpoView`
// to apply the proper styling (e.g. border radius and shadows).
class ExpoPdfView: ExpoView {
  let pdfView = PDFView()
  let thumbnailView = PDFThumbnailView()
  let onLoad = EventDispatcher()
  let onError = EventDispatcher()
  let onPageChanged = EventDispatcher()
  let onScaleChanged = EventDispatcher()
  let onPasswordRequired = EventDispatcher()

  private var currentSource: String?
  private var pendingPageIndex: Int?
  private var lastPropPageIndex: Int?
  private var isSettingPageProgrammatically: Bool = false
  private var providedPassword: String?
  private var cachePolicy: String = "none" // none | disk
  private var cacheTTLSeconds: TimeInterval = 60 * 60 * 24 * 7 // 7 days
  private var doubleTapEnabled: Bool = true
  private var isScrollEnabled: Bool = true
  private weak var internalScrollView: UIScrollView?
  private var didApplyInitialPageIndex: Bool = false
  
  private var showThumbnails: Bool = false {
    didSet { thumbnailView.isHidden = !showThumbnails; setNeedsLayout() }
  }
  private var thumbnailsPlacement: String = "trailing" { // leading | trailing | top | bottom
    didSet { setNeedsLayout() }
  }
  private var thumbSize: CGSize = CGSize(width: 90, height: 120) {
    didSet { thumbnailView.thumbnailSize = thumbSize; setNeedsLayout() }
  }

  required init(appContext: AppContext? = nil) {
    super.init(appContext: appContext)
    clipsToBounds = true
    pdfView.autoScales = true
    pdfView.displayMode = .singlePageContinuous
    pdfView.displayDirection = .vertical
    pdfView.displaysPageBreaks = true
    pdfView.usePageViewController(false, withViewOptions: nil)
    addSubview(pdfView)
    // Capture internal scroll view once available
    self.internalScrollView = findScrollView(in: pdfView)
    applyScrollEnabled()

    thumbnailView.pdfView = pdfView
    thumbnailView.isHidden = true
    thumbnailView.backgroundColor = .clear
    thumbnailView.thumbnailSize = thumbSize
    addSubview(thumbnailView)

    NotificationCenter.default.addObserver(self,
                                           selector: #selector(handlePageChanged),
                                           name: Notification.Name.PDFViewPageChanged,
                                           object: pdfView)
    NotificationCenter.default.addObserver(self,
                                           selector: #selector(handleScaleChanged),
                                           name: Notification.Name.PDFViewScaleChanged,
                                           object: pdfView)
  }

  deinit {
    NotificationCenter.default.removeObserver(self)
  }

  override func layoutSubviews() {
    let inset: CGFloat = 8
    let bounds = self.bounds
    guard showThumbnails else {
      pdfView.frame = bounds
      thumbnailView.frame = .zero
      return
    }

    switch thumbnailsPlacement {
    case "leading":
      thumbnailView.layoutMode = .vertical
      let width = max(44, thumbSize.width + inset * 2)
      thumbnailView.frame = CGRect(x: 0, y: 0, width: width, height: bounds.height)
      pdfView.frame = CGRect(x: width, y: 0, width: bounds.width - width, height: bounds.height)
    case "top":
      thumbnailView.layoutMode = .horizontal
      let height = max(44, thumbSize.height + inset * 2)
      thumbnailView.frame = CGRect(x: 0, y: 0, width: bounds.width, height: height)
      pdfView.frame = CGRect(x: 0, y: height, width: bounds.width, height: bounds.height - height)
    case "bottom":
      thumbnailView.layoutMode = .horizontal
      let height = max(44, thumbSize.height + inset * 2)
      thumbnailView.frame = CGRect(x: 0, y: bounds.height - height, width: bounds.width, height: height)
      pdfView.frame = CGRect(x: 0, y: 0, width: bounds.width, height: bounds.height - height)
    default: // trailing
      thumbnailView.layoutMode = .vertical
      let width = max(44, thumbSize.width + inset * 2)
      thumbnailView.frame = CGRect(x: bounds.width - width, y: 0, width: width, height: bounds.height)
      pdfView.frame = CGRect(x: 0, y: 0, width: bounds.width - width, height: bounds.height)
    }
    // Ensure scroll enabled state sticks across layout changes
    applyScrollEnabled()
    
  }

  func setSource(_ source: String) {
    // Ignore empty/whitespace-only sources to avoid spurious errors during mount
    if source.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty {
      return
    }
    currentSource = source
    // data: URL (base64 or URL-encoded)
    if source.hasPrefix("data:") {
      loadDataURLString(source)
      return
    }
    // Remote http(s)
    if let url = URL(string: source), url.scheme == "http" || url.scheme == "https" {
      loadRemote(url)
      return
    }
    // File URL or local path or bundle resource name
    if source.hasPrefix("file://") {
      if let url = URL(string: source) { loadLocal(url); return }
      sendError("Invalid file URL: \(source)"); return
    }
    let fileURL = URL(fileURLWithPath: source)
    if FileManager.default.fileExists(atPath: fileURL.path) {
      loadLocal(fileURL)
      return
    }
    // Try bundle resource (e.g., "MyDoc.pdf")
    if let bundleUrl = resolveBundleURL(from: source) {
      loadLocal(bundleUrl)
      return
    }
    sendError("Source not found: \(source)")
  }

  func setAutoScales(_ enabled: Bool) {
    pdfView.autoScales = enabled
  }

  func setEnableDoubleTapZoom(_ enabled: Bool) {
    doubleTapEnabled = enabled
    let toggle: (UIView) -> Void = { view in
      guard let recognizers = view.gestureRecognizers else { return }
      for gr in recognizers {
        if let tap = gr as? UITapGestureRecognizer, tap.numberOfTapsRequired == 2 {
          tap.isEnabled = enabled
        }
      }
    }
    toggle(pdfView)
    if let scroll = internalScrollView { toggle(scroll) }
  }

  func setSpacing(_ value: Double) {
    let inset = CGFloat(max(0, value))
    pdfView.pageBreakMargins = UIEdgeInsets(top: inset, left: inset, bottom: inset, right: inset)
  }

  func setScrollEnabled(_ enabled: Bool) {
    isScrollEnabled = enabled
    applyScrollEnabled()
  }

  private func applyScrollEnabled() {
    if internalScrollView == nil {
      internalScrollView = findScrollView(in: pdfView)
    }
    internalScrollView?.isScrollEnabled = isScrollEnabled
    internalScrollView?.panGestureRecognizer.isEnabled = isScrollEnabled
    internalScrollView?.alwaysBounceHorizontal = false
    internalScrollView?.alwaysBounceVertical = false
  }

  private func findScrollView(in view: UIView) -> UIScrollView? {
    if let sv = view as? UIScrollView { return sv }
    for sub in view.subviews {
      if let found = findScrollView(in: sub) { return found }
    }
    return nil
  }

  func setDisplayMode(_ mode: String) {
    switch mode {
    case "singlePage": pdfView.displayMode = .singlePage
    case "twoUp": pdfView.displayMode = .twoUp
    case "twoUpContinuous": pdfView.displayMode = .twoUpContinuous
    default: pdfView.displayMode = .singlePageContinuous
    }
  }

  func setDisplayDirection(_ direction: String) {
    pdfView.displayDirection = (direction == "horizontal") ? .horizontal : .vertical
  }

  func setDisplaysAsBook(_ asBook: Bool) {
    pdfView.displaysAsBook = asBook
  }

  func setDisplaysPageBreaks(_ show: Bool) {
    pdfView.displaysPageBreaks = show
  }

  func setMinScaleFactor(_ value: Double) {
    pdfView.minScaleFactor = CGFloat(value)
  }

  func setMaxScaleFactor(_ value: Double) {
    pdfView.maxScaleFactor = CGFloat(value)
  }

  func setScaleFactor(_ value: Double) {
    pdfView.scaleFactor = CGFloat(value)
  }

  func setPage(_ pageIndex: Int) {
    guard pageIndex > 0 else { return }
    guard let document = pdfView.document else {
      pendingPageIndex = pageIndex
      return
    }
    let clampedIndex = max(1, min(pageIndex, document.pageCount))
    // Treat as tapping on a thumbnail: go to destination and scroll it into view
    if let page = document.page(at: clampedIndex - 1) {
      isSettingPageProgrammatically = true
      lastPropPageIndex = clampedIndex
      // Navigate to the page, then ensure its rect is brought into view.
      // Use PDFKit's API rather than UIView/UIScrollView helpers.
      pdfView.go(to: page)
      let rect = page.bounds(for: .mediaBox)
      pdfView.go(to: rect, on: page)
    }
  }

  func setInitialPageIndex(_ index: Int) {
    // One-shot initial page; treat as 0-based from JS
    guard !didApplyInitialPageIndex else { return }
    didApplyInitialPageIndex = true
    let oneBased = max(0, index) + 1
    setPage(oneBased)
  }

  // MARK: - Imperative navigation helpers
  func nextPage() {
    guard let document = pdfView.document, let current = pdfView.currentPage else { return }
    let currentIndex = document.index(for: current) + 1 // 1-based
    setPage(currentIndex + 1)
  }

  func prevPage() {
    guard let document = pdfView.document, let current = pdfView.currentPage else { return }
    let currentIndex = document.index(for: current) + 1 // 1-based
    setPage(currentIndex - 1)
  }

  func currentPageNumber() -> Int {
    guard let document = pdfView.document, let current = pdfView.currentPage else { return 1 }
    return document.index(for: current) + 1
  }

  func totalPageCount() -> Int {
    return pdfView.document?.pageCount ?? 0
  }

  func setShowThumbnails(_ show: Bool) {
    showThumbnails = show
  }

  func setThumbnailsPlacement(_ placement: String) {
    thumbnailsPlacement = placement
  }

  func setThumbnailSize(_ size: CGSize) {
    thumbSize = size
  }

  func setCachePolicy(_ policy: String) {
    cachePolicy = policy
  }

  func setCacheTTL(_ ttlSeconds: Double) {
    cacheTTLSeconds = max(0, ttlSeconds)
  }

  private func applyPendingPageIfNeeded() {
    if let idx = pendingPageIndex {
      pendingPageIndex = nil
      setPage(idx)
    }
  }

  private func loadLocal(_ url: URL) {
    if let doc = PDFDocument(url: url) {
      handleLoadedDocument(doc, sourceString: currentSource ?? url.absoluteString)
    } else {
      sendError("Failed to open PDF at \(url.path)")
    }
  }

  private func loadRemote(_ url: URL) {
    if cachePolicy == "disk", let cached = cachedFileURL(for: url), FileManager.default.fileExists(atPath: cached.path), !isCacheExpired(at: cached) {
      loadLocal(cached)
      return
    }

    let task = URLSession.shared.dataTask(with: url) { data, response, error in
      if let error = error {
        self.sendError("Network error: \(error.localizedDescription)")
        return
      }
      guard let data = data else {
        self.sendError("No data received from \(url.absoluteString)")
        return
      }
      if self.cachePolicy == "disk", let dest = self.cachedFileURL(for: url) {
        do {
          try self.ensureCacheDir()
          try data.write(to: dest, options: .atomic)
        } catch {
          // ignore cache write errors
        }
      }
      guard let doc = PDFDocument(data: data) else {
        self.sendError("Failed to parse PDF from data at \(url.absoluteString)")
        return
      }
      DispatchQueue.main.async {
        self.handleLoadedDocument(doc, sourceString: self.currentSource ?? url.absoluteString)
      }
    }
    task.resume()
  }

  private func handleLoadedDocument(_ doc: PDFDocument, sourceString: String) {
    // Try to unlock only if actually locked (not merely encrypted)
    var effectiveDoc = doc
    if doc.isEncrypted && doc.isLocked {
      if let pwd = providedPassword, doc.unlock(withPassword: pwd) {
        // unlocked
        effectiveDoc = doc
      } else {
        // Emit password required and keep locked document for future unlock attempts
        pdfView.document = doc
        onPasswordRequired([:])
        return
      }
    }
    pdfView.document = effectiveDoc
    applyPendingPageIfNeeded()
    // Defer events to ensure JS props (handlers) are attached
    DispatchQueue.main.async {
      self.onLoad(["source": sourceString, "pageCount": effectiveDoc.pageCount])
      if let current = self.pdfView.currentPage {
        let idx = effectiveDoc.index(for: current) + 1
        self.onPageChanged(["page": idx])
      }
    }
  }

  @objc private func handlePageChanged() {
    guard let document = pdfView.document, let current = pdfView.currentPage else { return }
    let index = document.index(for: current) + 1
    // If we just set the page programmatically, still emit the event so JS can
    // confirm and clear its requested page state. Just reset the flag.
    if isSettingPageProgrammatically {
      isSettingPageProgrammatically = false
    }
    onPageChanged(["page": index, "pageCount": document.pageCount])
  }

  @objc private func handleScaleChanged() {
    let scale = Double(pdfView.scaleFactor)
    onScaleChanged(["scale": scale])
  }

  func setPassword(_ password: String) {
    providedPassword = password
    // Try to unlock current doc if locked
    if let doc = pdfView.document, doc.isEncrypted && doc.isLocked {
      if doc.unlock(withPassword: password) {
        // Apply any pending page (e.g., from initialPageIndex) now that the doc is viewable
        applyPendingPageIfNeeded()
        // Reload event since the document became viewable now
        DispatchQueue.main.async {
          self.onLoad(["source": self.currentSource ?? "", "pageCount": doc.pageCount])
          if let current = self.pdfView.currentPage {
            let idx = doc.index(for: current) + 1
            self.onPageChanged(["page": idx, "pageCount": doc.pageCount])
          }
        }
      } else {
        DispatchQueue.main.async {
          self.onError(["message": "Invalid password"]) 
        }
      }
    }
  }

  private func sendError(_ message: String) {
    DispatchQueue.main.async {
      self.onError(["message": message])
    }
  }

  private func loadDataURLString(_ dataUrl: String) {
    guard let comma = dataUrl.firstIndex(of: ",") else {
      sendError("Invalid data URL")
      return
    }
    let meta = String(dataUrl[..<comma])
    let payload = String(dataUrl[dataUrl.index(after: comma)...])
    let data: Data?
    if meta.contains(";base64") {
      data = Data(base64Encoded: payload)
    } else {
      data = payload.data(using: .utf8)
    }
    guard let bytes = data, let doc = PDFDocument(data: bytes) else {
      sendError("Failed to parse data URL PDF")
      return
    }
    handleLoadedDocument(doc, sourceString: currentSource ?? "data:")
  }

  private func resolveBundleURL(from string: String) -> URL? {
    let url = URL(fileURLWithPath: string)
    let name = url.deletingPathExtension().lastPathComponent
    let ext = url.pathExtension.isEmpty ? nil : url.pathExtension
    if let ext = ext {
      return Bundle.main.url(forResource: name, withExtension: ext)
    } else {
      return Bundle.main.url(forResource: name, withExtension: "pdf")
    }
  }

  private func cachedFileURL(for url: URL) -> URL? {
    guard let cacheDir = cacheDirectoryURL() else { return nil }
    let key = sha256(url.absoluteString)
    return cacheDir.appendingPathComponent("\(key).pdf")
  }

  private func cacheDirectoryURL() -> URL? {
    FileManager.default.urls(for: .cachesDirectory, in: .userDomainMask).first?.appendingPathComponent("ExpoPdfCache", isDirectory: true)
  }

  private func ensureCacheDir() throws {
    if let dir = cacheDirectoryURL() {
      try FileManager.default.createDirectory(at: dir, withIntermediateDirectories: true)
    }
  }

  private func isCacheExpired(at fileURL: URL) -> Bool {
    do {
      let attrs = try FileManager.default.attributesOfItem(atPath: fileURL.path)
      if let mod = attrs[.modificationDate] as? Date {
        return Date().timeIntervalSince(mod) > cacheTTLSeconds
      }
    } catch {
      return true
    }
    return true
  }

  

  private func sha256(_ text: String) -> String {
    let digest = SHA256.hash(data: Data(text.utf8))
    return digest.map { String(format: "%02x", $0) }.joined()
  }
}
