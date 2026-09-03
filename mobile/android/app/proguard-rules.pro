# Add project specific ProGuard rules here.
# By default, the flags in this file are appended to flags specified
# in /usr/local/Cellar/android-sdk/24.3.3/tools/proguard/proguard-android.txt
# You can edit the include path and order by changing the proguardFiles
# directive in build.gradle.
#
# For more details, see
#   http://developer.android.com/guide/developing/tools/proguard.html

# react-native-reanimated
-keep class com.swmansion.reanimated.** { *; }
-keep class com.facebook.react.turbomodule.** { *; }

# Add any project specific keep options here:

# Expo and Vision (Barcode Scanner)
-keep class expo.modules.** { *; }
-dontwarn expo.modules.**
-keep class com.google.mlkit.** { *; }
-dontwarn com.google.mlkit.**
-keep class org.webrtc.** { *; }
-dontwarn org.webrtc.**

# Firebase
-keep class com.google.firebase.** { *; }
-dontwarn com.google.firebase.**

# Notifee / Background Tasks
-keep class app.notifee.** { *; }
-dontwarn app.notifee.**

# React Native
-keep class com.facebook.react.** { *; }
-dontwarn com.facebook.react.**

# App Specific (WorkManager Native Worker)
-keep class androidx.work.** { *; }
-keep class com.ilachatirlatici.AlarmCheckWorker { *; }

# PDF Processing (react-native-html-to-pdf / pdfbox)
-dontwarn com.tom_roush.pdfbox.**
-dontwarn com.gemalto.jp2.**
-dontwarn org.bouncycastle.**
-dontwarn org.apache.fontbox.**
-dontwarn org.apache.pdfbox.**
