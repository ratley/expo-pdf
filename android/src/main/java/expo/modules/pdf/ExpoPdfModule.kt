package expo.modules.pdf

import android.content.Intent
import android.graphics.Bitmap
import android.graphics.Canvas
import android.graphics.Color
import android.net.Uri
import android.os.ParcelFileDescriptor
import android.util.Base64
import androidx.core.content.FileProvider
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import java.io.ByteArrayOutputStream
import java.io.File
import java.io.FileOutputStream
import java.net.URL
import android.graphics.pdf.PdfRenderer

class ExpoPdfModule : Module() {
  override fun definition() = ModuleDefinition {
    Name("ExpoPdf")

    Constants(
      "PI" to Math.PI
    )

    Events("onChange")

    Function("hello") { "Hello world! 👋" }

    AsyncFunction("setValueAsync") { value: String ->
      sendEvent("onChange", mapOf("value" to value))
    }

    // Share a local file or a remote URL.
    AsyncFunction("shareAsync") { source: String ->
      val currentActivity = appContext.activityProvider?.currentActivity ?: return@AsyncFunction
      val intent = Intent(Intent.ACTION_SEND)
      if (source.startsWith("http://") || source.startsWith("https://")) {
        intent.type = "text/plain"
        intent.putExtra(Intent.EXTRA_TEXT, source)
      } else {
        val file = toFileFromSource(source)
        val uri = FileProvider.getUriForFile(
          currentActivity,
          currentActivity.packageName + ".expopdf.fileprovider",
          file
        )
        intent.type = "application/pdf"
        intent.putExtra(Intent.EXTRA_STREAM, uri)
        intent.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION)
      }
      currentActivity.startActivity(Intent.createChooser(intent, "Share PDF"))
    }

    // Render first or specific page to a PNG data URL
    AsyncFunction("getPageThumbnailAsync") { params: Map<String, Any> ->
      val src = params["source"] as? String ?: throw IllegalArgumentException("source required")
      val pageIndex1 = (params["page"] as? Number)?.toInt() ?: 1
      val width = (params["width"] as? Number)?.toInt() ?: throw IllegalArgumentException("width required")
      val height = (params["height"] as? Number)?.toInt() ?: throw IllegalArgumentException("height required")
      val scale = ((params["scale"] as? Number)?.toDouble() ?: 1.0).coerceAtLeast(0.1)

      val targetW = (width * scale).toInt()
      val targetH = (height * scale).toInt()

      val file = ensureLocalFile(src)
      val pfd = ParcelFileDescriptor.open(file, ParcelFileDescriptor.MODE_READ_ONLY)
      val result: String = pfd.use { fd ->
        PdfRenderer(fd).use { renderer ->
          val page0 = (pageIndex1 - 1).coerceIn(0, (renderer.pageCount - 1).coerceAtLeast(0))
          renderer.openPage(page0).use { page ->
            val pageW = page.width
            val pageH = page.height
            val s = minOf(targetW.toFloat() / pageW, targetH.toFloat() / pageH)
            val renderW = kotlin.math.ceil(pageW * s).toInt().coerceAtLeast(1)
            val renderH = kotlin.math.ceil(pageH * s).toInt().coerceAtLeast(1)

            val rendered = Bitmap.createBitmap(renderW, renderH, Bitmap.Config.ARGB_8888)
            page.render(rendered, null, null, PdfRenderer.Page.RENDER_MODE_FOR_DISPLAY)

            val outBmp = Bitmap.createBitmap(targetW, targetH, Bitmap.Config.ARGB_8888)
            val canvas = Canvas(outBmp)
            canvas.drawColor(Color.WHITE)
            val left = ((targetW - renderW) / 2f)
            val top = ((targetH - renderH) / 2f)
            canvas.drawBitmap(rendered, left, top, null)

            val baos = ByteArrayOutputStream()
            outBmp.compress(Bitmap.CompressFormat.PNG, 100, baos)
            val base64 = Base64.encodeToString(baos.toByteArray(), Base64.NO_WRAP)
            "data:image/png;base64,$base64"
          }
        }
      }
      result
    }

    AsyncFunction("clearCacheAsync") {
      val base = appContext.reactContext?.cacheDir
        ?: appContext.activityProvider?.currentActivity?.cacheDir
      if (base != null) {
        val dir = File(base, "ExpoPdfCache")
        dir.deleteRecursively()
      }
    }

    // View definition
    View(ExpoPdfView::class) {
      Events("onLoad", "onError", "onPageChanged", "onPasswordRequired")

      Prop("source") { v: ExpoPdfView, value: String? -> v.setSource(value) }
      Prop("password") { v: ExpoPdfView, value: String? -> v.setPassword(value) }
      Prop("spacing") { v: ExpoPdfView, value: Int? -> v.setSpacing(value) }
      Prop("scrollEnabled") { v: ExpoPdfView, value: Boolean -> v.setScrollEnabled(value) }
      Prop("enableDoubleTapZoom") { v: ExpoPdfView, value: Boolean -> v.setEnableDoubleTapZoom(value) }
      Prop("nativePasswordPrompt") { v: ExpoPdfView, value: Boolean? -> v.setNativePasswordPrompt(value) }
      Prop("initialPage") { v: ExpoPdfView, value: Int? -> v.setInitialPage1(value) }
      Prop("initialPageIndex") { v: ExpoPdfView, value: Int? -> v.setInitialPage0(value) }
      Prop("page") { v: ExpoPdfView, value: Int? -> v.setPage1(value) }

      AsyncFunction("next") { v: ExpoPdfView -> v.next() }
      AsyncFunction("prev") { v: ExpoPdfView -> v.prev() }
      AsyncFunction("goToPage") { v: ExpoPdfView, page: Int -> v.goToPage1(page) }
      AsyncFunction("getPage") { v: ExpoPdfView -> v.getPage1() }
      AsyncFunction("getPageCount") { v: ExpoPdfView -> v.getPageCount() }
    }
  }

  // Helpers
  private fun ensureLocalFile(source: String): File {
    return if (source.startsWith("http://") || source.startsWith("https://")) {
      val base = appContext.reactContext?.cacheDir
        ?: appContext.activityProvider?.currentActivity?.cacheDir
        ?: throw IllegalStateException("No Android context available")
      val dir = File(base, "ExpoPdfCache")
      if (!dir.exists()) dir.mkdirs()
      val name = (source.hashCode().toUInt().toString()) + ".pdf"
      val dest = File(dir, name)
      if (!dest.exists()) {
        URL(source).openStream().use { input ->
          FileOutputStream(dest).use { output -> input.copyTo(output) }
        }
      }
      dest
    } else toFileFromSource(source)
  }

  private fun toFileFromSource(source: String): File {
    return if (source.startsWith("file://")) {
      File(Uri.parse(source).path!!)
    } else {
      File(source)
    }
  }
}
