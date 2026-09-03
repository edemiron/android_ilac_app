@file:Suppress("DEPRECATION")

package com.ilachatirlatici

import com.facebook.react.ReactPackage
import com.facebook.react.bridge.NativeModule
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.uimanager.ViewManager

class AlarmPackage : ReactPackage {
    @Deprecated("ReactPackage still requires createNativeModules on React Native 0.81.")
    override fun createNativeModules(reactContext: ReactApplicationContext): List<NativeModule> {
        return listOf(AlarmModule(reactContext))
    }

    @Deprecated("ReactPackage still requires createViewManagers on React Native 0.81.")
    override fun createViewManagers(reactContext: ReactApplicationContext): List<ViewManager<*, *>> {
        return emptyList()
    }
}
