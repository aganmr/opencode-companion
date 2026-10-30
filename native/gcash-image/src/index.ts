import NativeGcashImage from './NativeGcashImage';

/**
 * Save the bundled GCash QR image to the phone's gallery (MediaStore —
 * no storage permissions needed on Android 10+). Resolves with the saved
 * file name, rejects with an Error when the module is unavailable or the
 * write fails.
 */
export function saveImageToGallery(): Promise<string> {
  if (!NativeGcashImage) {
    return Promise.reject(
      new Error('The gcash-image native module is not available on this platform.')
    );
  }
  return NativeGcashImage.saveImageToGallery();
}
