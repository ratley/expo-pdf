import ExpoModulesCore
import PDFKit
import UIKit

// Object params for getPageThumbnailAsync from JS
internal struct ThumbnailParams: Record {
  @Field var source: String
  @Field var page: Int?
  @Field var width: Double
  @Field var height: Double
  @Field var scale: Double?
}

public class ExpoPdfModule: Module {
  // Each module class must implement the definition function. The definition consists of components
  // that describes the module's functionality and behavior.
  // See https://docs.expo.dev/modules/module-api for more details about available components.
  public func definition() -> ModuleDefinition {
    // Sets the name of the module that JavaScript code will use to refer to the module. Takes a string as an argument.
    // Can be inferred from module's class name, but it's recommended to set it explicitly for clarity.
    // The module will be accessible from `requireNativeModule('ExpoPdf')` in JavaScript.
    Name("ExpoPdf")

    // Sets constant properties on the module. Can take a dictionary or a closure that returns a dictionary.
    Constants([
      "PI": Double.pi
    ])

    // Defines event names that the module can send to JavaScript.
    Events("onChange")

    // Defines a JavaScript synchronous function that runs the native code on the JavaScript thread.
    Function("hello") {
      return "Hello world! 👋"
    }

    // Defines a JavaScript function that always returns a Promise and whose native code
    // is by default dispatched on the different thread than the JavaScript runtime runs on.
    AsyncFunction("setValueAsync") { (value: String) in
      // Send an event to JavaScript.
      self.sendEvent("onChange", [
        "value": value
      ])
    }

    // Share the provided source (http(s) or file:// or path)
    AsyncFunction("shareAsync") { (source: String) in
      guard let controller = appContext?.utilities?.currentViewController() else { return }
      let url: URL
      if let remote = URL(string: source), remote.scheme == "http" || remote.scheme == "https" || remote.scheme == "file" {
        url = remote
      } else {
        url = URL(fileURLWithPath: source)
      }
      DispatchQueue.main.async {
        let activity = UIActivityViewController(activityItems: [url], applicationActivities: nil)
        if let popover = activity.popoverPresentationController {
          popover.sourceView = controller.view
          popover.sourceRect = CGRect(x: controller.view.bounds.midX, y: controller.view.bounds.midY, width: 1, height: 1)
          popover.permittedArrowDirections = []
        }
        controller.present(activity, animated: true)
      }
    }

    // Render a page thumbnail and return as data URL (PNG)
    AsyncFunction("getPageThumbnailAsync") { (params: ThumbnailParams) -> String in
      let targetSize = CGSize(width: params.width, height: params.height)
      let source = params.source
      let doc: PDFDocument?
      if let remote = URL(string: source), remote.scheme == "http" || remote.scheme == "https" {
        // Synchronous fetch is undesirable; but AsyncFunction closure runs off main thread by default.
        if let data = try? Data(contentsOf: remote) {
          doc = PDFDocument(data: data)
        } else {
          throw GenericException("Failed to download PDF")
        }
      } else {
        let url: URL
        if source.hasPrefix("file://") { url = URL(string: source)! } else { url = URL(fileURLWithPath: source) }
        doc = PDFDocument(url: url)
      }
      guard let document = doc else { throw GenericException("Failed to open PDF") }
      let index = max(1, min(params.page ?? 1, document.pageCount)) - 1
      guard let pdfPage = document.page(at: index) else { throw GenericException("Page not found") }

      let screenScale = CGFloat(params.scale ?? Double(UIScreen.main.scale))
      let target = CGSize(width: targetSize.width * screenScale, height: targetSize.height * screenScale)

      let pageRect = pdfPage.bounds(for: .mediaBox)
      let drawScale = min(target.width / pageRect.width, target.height / pageRect.height)
      let drawSize = CGSize(width: pageRect.width * drawScale, height: pageRect.height * drawScale)

      let format = UIGraphicsImageRendererFormat.default()
      format.scale = 1 // we already included scale in target size
      let renderer = UIGraphicsImageRenderer(size: target, format: format)
      let image = renderer.image { ctx in
        // Fill with white so thumbnails don't look transparent on cards
        ctx.cgContext.setFillColor(UIColor.white.cgColor)
        ctx.cgContext.fill(CGRect(origin: .zero, size: target))
        let origin = CGPoint(x: (target.width - drawSize.width)/2, y: (target.height - drawSize.height)/2)
        ctx.cgContext.saveGState()
        ctx.cgContext.translateBy(x: origin.x, y: origin.y)
        ctx.cgContext.scaleBy(x: drawScale, y: drawScale)
        pdfPage.draw(with: .mediaBox, to: ctx.cgContext)
        ctx.cgContext.restoreGState()
      }

      guard let data = image.pngData() else { throw GenericException("Failed to encode PNG") }
      let base64 = data.base64EncodedString()
      return "data:image/png;base64,\(base64)"
    }

    // Clear disk cache used by remote PDFs
    AsyncFunction("clearCacheAsync") { () in
      let fm = FileManager.default
      if let dir = fm.urls(for: .cachesDirectory, in: .userDomainMask).first?.appendingPathComponent("ExpoPdfCache", isDirectory: true) {
        try? fm.removeItem(at: dir)
      }
    }

    // Enables the module to be used as a native view. Definition components that are accepted as part of the
    // view definition: Prop, Events.
    View(ExpoPdfView.self) {
      // source can be a remote URL (https/http) or a local file path / file URL
      Prop("source") { (view: ExpoPdfView, source: String) in
        view.setSource(source)
      }

      // Interaction & layout conveniences
      Prop("enableDoubleTapZoom") { (view: ExpoPdfView, enabled: Bool) in
        view.setEnableDoubleTapZoom(enabled)
      }
      Prop("spacing") { (view: ExpoPdfView, spacing: Double) in
        view.setSpacing(spacing)
      }
      Prop("scrollEnabled") { (view: ExpoPdfView, enabled: Bool) in
        view.setScrollEnabled(enabled)
      }
      Prop("initialPageIndex") { (view: ExpoPdfView, index: Int) in
        view.setInitialPageIndex(index)
      }
      // Preferred 1-based alias; mapped to 0-based internal index.
      Prop("initialPage") { (view: ExpoPdfView, page: Int) in
        let oneBased = max(1, page)
        view.setInitialPageIndex(oneBased - 1)
      }

      // No per‑page rounding props; use container styles in JS if needed.

      Prop("autoScales") { (view: ExpoPdfView, autoScales: Bool) in
        view.setAutoScales(autoScales)
      }

      // 1-based page index; ignored until document is loaded
      Prop("page") { (view: ExpoPdfView, page: Int) in
        view.setPage(page)
      }

      // Thumbnails controls
      Prop("showThumbnails") { (view: ExpoPdfView, show: Bool) in
        view.setShowThumbnails(show)
      }
      Prop("thumbnailsPlacement") { (view: ExpoPdfView, placement: String) in
        view.setThumbnailsPlacement(placement)
      }
      Prop("thumbnailSize") { (view: ExpoPdfView, size: [String: Double]) in
        let width = size["width"] ?? 90
        let height = size["height"] ?? 120
        view.setThumbnailSize(CGSize(width: width, height: height))
      }

      // Caching
      Prop("cachePolicy") { (view: ExpoPdfView, policy: String) in
        view.setCachePolicy(policy)
      }
      Prop("cacheTTL") { (view: ExpoPdfView, ttl: Double) in
        view.setCacheTTL(ttl)
      }

      // Display configuration
      Prop("displayMode") { (view: ExpoPdfView, mode: String) in
        view.setDisplayMode(mode)
      }
      Prop("displayDirection") { (view: ExpoPdfView, dir: String) in
        view.setDisplayDirection(dir)
      }
      Prop("displaysAsBook") { (view: ExpoPdfView, asBook: Bool) in
        view.setDisplaysAsBook(asBook)
      }
      Prop("displaysPageBreaks") { (view: ExpoPdfView, show: Bool) in
        view.setDisplaysPageBreaks(show)
      }
      Prop("minScaleFactor") { (view: ExpoPdfView, value: Double) in
        view.setMinScaleFactor(value)
      }
      Prop("maxScaleFactor") { (view: ExpoPdfView, value: Double) in
        view.setMaxScaleFactor(value)
      }
      Prop("scaleFactor") { (view: ExpoPdfView, value: Double) in
        view.setScaleFactor(value)
      }

      // Password (if needed)
      Prop("password") { (view: ExpoPdfView, password: String) in
        view.setPassword(password)
      }

      Events("onLoad", "onError", "onPageChanged", "onScaleChanged", "onPasswordRequired")

      // Imperative view commands for reliable navigation/state.
      AsyncFunction("next") { (view: ExpoPdfView) in
        view.nextPage()
      }
      AsyncFunction("prev") { (view: ExpoPdfView) in
        view.prevPage()
      }
      AsyncFunction("goToPage") { (view: ExpoPdfView, page: Int) in
        view.setPage(page)
      }
      AsyncFunction("getPage") { (view: ExpoPdfView) -> Int in
        return view.currentPageNumber()
      }
      AsyncFunction("getPageCount") { (view: ExpoPdfView) -> Int in
        return view.totalPageCount()
      }
    }
  }
}
