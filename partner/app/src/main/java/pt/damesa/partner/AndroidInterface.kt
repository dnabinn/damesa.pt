package pt.damesa.partner

import android.content.Context
import android.webkit.JavascriptInterface
import android.widget.Toast
import com.google.firebase.messaging.FirebaseMessaging

/**
 * JavaScript bridge: window.AndroidInterface in the WebView
 * The owner-app.html page calls these methods to register/unregister FCM tokens
 * and to detect it's running in the native app.
 */
class AndroidInterface(private val context: Context) {

    /** Returns true — lets the web page know it's inside the native app */
    @JavascriptInterface
    fun isNativeApp(): Boolean = true

    /** Returns the app version string */
    @JavascriptInterface
    fun getAppVersion(): String = "1.0"

    /** Refresh and return the current FCM token asynchronously via callback */
    @JavascriptInterface
    fun refreshFcmToken() {
        FirebaseMessaging.getInstance().token.addOnCompleteListener { task ->
            if (task.isSuccessful) {
                val token = task.result
                // The MainActivity WebView will pick this up via window._fcmToken
                // We also call the callback if it exists
                if (context is MainActivity) {
                    context.runOnUiThread {
                        context.webView.evaluateJavascript(
                            "window._fcmToken = '${token}'; if(window.onFcmTokenReady) window.onFcmTokenReady('${token}');",
                            null
                        )
                    }
                }
            }
        }
    }

    /** Show a native toast message */
    @JavascriptInterface
    fun showToast(message: String) {
        Toast.makeText(context, message, Toast.LENGTH_SHORT).show()
    }
}
