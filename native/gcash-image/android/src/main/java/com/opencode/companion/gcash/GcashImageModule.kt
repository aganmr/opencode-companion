package com.opencode.companion.gcash

import android.content.ContentValues
import android.os.Environment
import android.provider.MediaStore
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext

/**
 * Saves the QR image bundled in this module's `assets/` folder to the
 * phone's gallery. Uses MediaStore's scoped-storage insert, which needs
 * no runtime permissions on Android 10 (API 29)+.
 */
class GcashImageModule(reactContext: ReactApplicationContext) :
  NativeGcashImageSpec(reactContext) {

  override fun saveImageToGallery(promise: Promise) {
    try {
      val displayName = "$DISPLAY_NAME.png"
      val values = ContentValues().apply {
        put(MediaStore.Images.Media.DISPLAY_NAME, displayName)
        put(MediaStore.Images.Media.MIME_TYPE, "image/png")
        put(MediaStore.Images.Media.RELATIVE_PATH, Environment.DIRECTORY_PICTURES)
      }
      val uri = reactApplicationContext.contentResolver
        .insert(MediaStore.Images.Media.EXTERNAL_CONTENT_URI, values)
        ?: throw IllegalStateException("MediaStore insert returned null")

      reactApplicationContext.assets.open("gcash-qr.png").use { input ->
        val output = reactApplicationContext.contentResolver.openOutputStream(uri)
          ?: throw IllegalStateException("Could not open the MediaStore output stream")
        output.use { input.copyTo(it) }
      }
      promise.resolve(displayName)
    } catch (e: Exception) {
      promise.reject("GCASH_IMAGE_SAVE_FAILED", e.message ?: "Failed to save the QR image", e)
    }
  }

  companion object {
    const val NAME = NativeGcashImageSpec.NAME
    private const val DISPLAY_NAME = "GCash-InstaPay-QR"
  }
}
