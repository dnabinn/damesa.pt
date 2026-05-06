# Keep all Da Mesa classes (WebView JS bridge, FCM service, etc.)
-keep class pt.damesa.partner.** { *; }

# Keep JavaScript interface methods (called from WebView JS — must not be renamed/removed)
-keepclassmembers class * {
    @android.webkit.JavascriptInterface <methods>;
}
-keepattributes JavascriptInterface

# Keep Firebase Messaging
-keep class com.google.firebase.** { *; }
-keep class com.google.android.gms.** { *; }

# Suppress warnings for unused Firebase components
-dontwarn com.google.firebase.**
-dontwarn com.google.android.gms.**
