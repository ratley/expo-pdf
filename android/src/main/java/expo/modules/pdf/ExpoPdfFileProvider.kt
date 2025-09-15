package expo.modules.pdf

import androidx.core.content.FileProvider

// KEEP: Use a unique FileProvider subclass to avoid authority collisions and
// follow Android's guidance for reliability when used from libraries.
class ExpoPdfFileProvider : FileProvider()

