package com.opencode.companion.gcash

import com.facebook.react.TurboReactPackage
import com.facebook.react.bridge.NativeModule
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.module.model.ReactModuleInfo
import com.facebook.react.module.model.ReactModuleInfoProvider

class GcashImagePackage : TurboReactPackage() {
  override fun getModule(name: String, context: ReactApplicationContext): NativeModule? =
    when (name) {
      GcashImageModule.NAME -> GcashImageModule(context)
      else -> null
    }

  override fun getReactModuleInfoProvider(): ReactModuleInfoProvider =
    ReactModuleInfoProvider {
      mapOf(
        GcashImageModule.NAME to
          ReactModuleInfo(
            GcashImageModule.NAME,
            GcashImageModule::class.java.name,
            false, // canOverrideExistingModule
            false, // needsEagerInit
            false, // isCxxModule
            true // isTurboModule
          )
      )
    }
}
