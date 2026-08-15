# BirrRelay Proguard Rules (Ultra-Small APK Optimization)
-keepclassmembers class * {
    @android.webkit.JavascriptInterface <methods>;
}
-dontwarn java.lang.invoke.**
-repackageclasses 'com.birrrelay.a'
-allowaccessmodification
