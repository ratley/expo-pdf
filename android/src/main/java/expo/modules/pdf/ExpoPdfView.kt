package expo.modules.pdf

import android.content.Context
import android.net.Uri
import android.text.InputType
import android.view.ViewGroup
import android.widget.EditText
import android.widget.LinearLayout
import android.widget.TextView
import androidx.appcompat.app.AlertDialog
import android.content.DialogInterface
import android.util.Log
import com.github.barteksc.pdfviewer.PDFView
import com.github.barteksc.pdfviewer.listener.*
import expo.modules.kotlin.AppContext
import expo.modules.kotlin.viewevent.EventDispatcher
import expo.modules.kotlin.views.ExpoView

class ExpoPdfView(context: Context, appContext: AppContext) :
  ExpoView(context, appContext),
  OnLoadCompleteListener,
  OnPageChangeListener,
  OnErrorListener {

  private val onLoad by EventDispatcher()
  private val onError by EventDispatcher()
  private val onPageChanged by EventDispatcher()
  private val onPasswordRequired by EventDispatcher()

  private val pdfView = PDFView(context, null).also {
    it.layoutParams = LayoutParams(LayoutParams.MATCH_PARENT, LayoutParams.MATCH_PARENT)
    addView(it)
  }

  private var sourceUri: Uri? = null
  private var password: String? = null
  private var nativePasswordPrompt: Boolean = true
  private var passwordDialog: AlertDialog? = null
  private var passwordInput: EditText? = null
  private var passwordErrorView: TextView? = null
  private var spacingDp: Int = 0
  private var enableSwipe: Boolean = true
  private var enableDoubleTap: Boolean = true
  private var initialPage0: Int? = null
  private var loaded = false
  private var isLoading = false
  private var pendingReload = false
  private var isDetached = false
  private var recycleAfterLoad = false

  fun setSource(value: String?) {
    if (value.isNullOrBlank()) return
    // Accept file://, content://, absolute file path, or http(s) (download to cache first).
    when {
      value.startsWith("http://") || value.startsWith("https://") -> downloadAndLoad(value)
      value.startsWith("content://") || value.startsWith("file://") -> {
        sourceUri = Uri.parse(value); load()
      }
      value.startsWith("/") -> { sourceUri = Uri.fromFile(java.io.File(value)); load() }
      else -> { sourceUri = Uri.parse(value); load() }
    }
  }

  fun setPassword(p: String?) {
    password = p
    // Retry loading when password changes; needed for initial unlock or after invalid password
    if (sourceUri != null) load()
  }
  fun setSpacing(dp: Int?) { spacingDp = (dp ?: 0); if (loaded) load() }
  fun setScrollEnabled(enabled: Boolean) { enableSwipe = enabled; if (loaded) load() }
  fun setEnableDoubleTapZoom(enabled: Boolean) { enableDoubleTap = enabled; if (loaded) load() }
  fun setInitialPage1(page1: Int?) { initialPage0 = page1?.let { (it - 1).coerceAtLeast(0) } }
  fun setInitialPage0(page0: Int?) { initialPage0 = page0?.coerceAtLeast(0) }
  fun setNativePasswordPrompt(enabled: Boolean?) { nativePasswordPrompt = enabled ?: true }
  fun setPage1(page1: Int?) {
    val target0 = page1?.let { (it - 1).coerceAtLeast(0) } ?: return
    if (loaded) pdfView.jumpTo(target0, false) else initialPage0 = target0
  }

  private fun load() {
    // If a load is already in progress, defer this request until it finishes to avoid
    // recycling the underlying HandlerThread while DecodingAsyncTask is still running.
    if (isLoading) {
      pendingReload = true
      return
    }
    if (isDetached) {
      // Don't kick off new work for a view that's no longer attached.
      pendingReload = false
      return
    }

    val uri = sourceUri ?: return
    loaded = false
    isLoading = true
    pendingReload = false
    recycleAfterLoad = false
    try {
      pdfView.fromUri(uri)
        .defaultPage(initialPage0 ?: 0)
        .spacing(spacingDp)
        .enableSwipe(enableSwipe)
        .swipeHorizontal(false)
        .enableDoubletap(enableDoubleTap)
        .password(password)
        .onLoad(this)
        .onError(this)
        .onPageChange(this)
        .load()
    } catch (t: Throwable) {
      isLoading = false
      onError(mapOf("message" to (t.message ?: "Load failed")))
    }
  }

  private fun downloadAndLoad(url: String) {
    Thread {
      try {
        val dir = java.io.File(context.cacheDir, "ExpoPdfCache")
        if (!dir.exists()) dir.mkdirs()
        val name = (url.hashCode().toUInt().toString()) + ".pdf"
        val dest = java.io.File(dir, name)
        if (!dest.exists()) {
          val conn = java.net.URL(url).openConnection()
          conn.getInputStream().use { input ->
            java.io.FileOutputStream(dest).use { output -> input.copyTo(output) }
          }
        }
        sourceUri = Uri.fromFile(dest)
        post { load() }
      } catch (t: Throwable) {
        post { onError(mapOf("message" to (t.message ?: "Download failed"))) }
      }
    }.start()
  }

  override fun loadComplete(nbPages: Int) {
    loaded = true
    isLoading = false
    // If a native password dialog was visible and load succeeded, dismiss it
    passwordDialog?.dismiss()
    passwordDialog = null
    onLoad(mapOf("source" to (sourceUri?.toString() ?: ""), "pageCount" to nbPages))
    // If another load request was queued while decoding, run it now.
    if (pendingReload && !isDetached) {
      pendingReload = false
      load()
      return
    }
    if (recycleAfterLoad) {
      recycleAfterLoad = false
      try { pdfView.recycle() } catch (t: Throwable) { Log.w("ExpoPdf", "recycle failed", t) }
      loaded = false
    }
  }

  override fun onPageChanged(page: Int, pageCount: Int) {
    onPageChanged(mapOf("page" to (page + 1), "pageCount" to pageCount))
  }

  override fun onError(t: Throwable) {
    isLoading = false
    val msg = t.message ?: "Unknown error"
    val isPasswordError = msg.contains("password", ignoreCase = true)
    if (isPasswordError && nativePasswordPrompt) {
      // Prefer native prompt flow on Android
      val invalidAttempt = !password.isNullOrBlank()
      showPasswordDialog(if (invalidAttempt) "Invalid password" else null)
      return
    }
    if (isPasswordError && !nativePasswordPrompt) {
      // JS-driven flow
      if (password.isNullOrBlank()) {
        onPasswordRequired(emptyMap())
        return
      } else {
        onError(mapOf("message" to "Invalid password"))
        return
      }
    }
    onError(mapOf("message" to msg))
    if (pendingReload && !isDetached) {
      pendingReload = false
      load()
      return
    }
    if (recycleAfterLoad) {
      recycleAfterLoad = false
      try { pdfView.recycle() } catch (t: Throwable) { Log.w("ExpoPdf", "recycle failed", t) }
    }
  }

  private fun showPasswordDialog(errorText: String?) {
    val activity = appContext.activityProvider?.currentActivity
    val ctx = activity ?: context

    // Build content layout
    val container = LinearLayout(ctx).apply {
      orientation = LinearLayout.VERTICAL
      setPadding(40, 20, 40, 0)
      layoutParams = LinearLayout.LayoutParams(
        ViewGroup.LayoutParams.MATCH_PARENT,
        ViewGroup.LayoutParams.WRAP_CONTENT
      )
    }
    val input = EditText(ctx).apply {
      inputType = InputType.TYPE_CLASS_TEXT or InputType.TYPE_TEXT_VARIATION_PASSWORD
      hint = "Password"
    }
    val errorView = TextView(ctx).apply {
      text = errorText ?: ""
      setTextColor(0xFFFF6666.toInt())
      textSize = 12f
    }
    container.addView(input)
    container.addView(errorView)

    passwordInput = input
    passwordErrorView = errorView

    if (passwordDialog?.isShowing == true) {
      // Update existing dialog's views
      passwordErrorView?.text = errorText ?: ""
      return
    }

    passwordDialog = AlertDialog.Builder(ctx)
      .setTitle("Enter Password")
      .setView(container)
      .setPositiveButton("Unlock") { _: DialogInterface, _: Int ->
        val entered = passwordInput?.text?.toString() ?: ""
        password = if (entered.isEmpty()) null else entered
        // Try again with the provided password
        load()
      }
      .setNegativeButton("Cancel") { d: DialogInterface, _: Int ->
        d.dismiss()
      }
      .setOnDismissListener {
        passwordInput = null
        passwordErrorView = null
      }
      .create().also { d -> d.show() }
  }

  fun next() {
    if (!loaded) return
    val next = (pdfView.currentPage + 1).coerceAtMost(pdfView.pageCount - 1)
    // Use immediate jump to avoid transient OnPageChange callbacks that cause UI flicker
    pdfView.jumpTo(next, false)
  }

  fun prev() {
    if (!loaded) return
    val prev = (pdfView.currentPage - 1).coerceAtLeast(0)
    pdfView.jumpTo(prev, false)
  }

  fun goToPage1(page1: Int) {
    val target0 = (page1 - 1).coerceAtLeast(0)
    if (loaded) pdfView.jumpTo(target0, false) else initialPage0 = target0
  }

  fun getPage1(): Int = if (loaded) pdfView.currentPage + 1 else 1
  fun getPageCount(): Int = if (loaded) pdfView.pageCount else 0

  override fun onAttachedToWindow() {
    super.onAttachedToWindow()
    isDetached = false
  }

  override fun onDetachedFromWindow() {
    super.onDetachedFromWindow()
    isDetached = true
    pendingReload = false
    if (loaded) {
      try { pdfView.recycle() } catch (t: Throwable) { Log.w("ExpoPdf", "recycle failed", t) }
    } else {
      // Delay recycle until after the pending load finishes to avoid HandlerThread NPEs
      recycleAfterLoad = true
    }
  }
}
