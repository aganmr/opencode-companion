import type { TurboModule } from 'react-native';
import { TurboModuleRegistry } from 'react-native';

export interface Spec extends TurboModule {
  /**
   * Save the bundled GCash QR image (shipped in this module's `assets/`)
   * to the phone's gallery via MediaStore. Resolves with the saved
   * display name.
   */
  saveImageToGallery(): Promise<string>;
}

// The codegen parser requires the registry call to live in the same file
// as the spec interface.
export default TurboModuleRegistry.get<Spec>('GcashImage');
