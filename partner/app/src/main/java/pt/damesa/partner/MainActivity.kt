package pt.damesa.partner

import android.Manifest
import android.app.NotificationChannel
import android.app.NotificationManager
import android.content.pm.PackageManager
import android.media.AudioAttributes
import android.media.RingtoneManager
import android.os.Build
import android.os.Bundle
import android.webkit.*
import android.widget.Toast
import androidx.activity.OnBackPressedCallback
import androidx.appcompat.app.AppCompatActivity
import androidx.core.app.ActivityCompat
import androidx.core.content.ContextCompat
import androidx.core.splashscreen.SplashScreen.Companion.installSplashScreen
import com.google.firebase.messaging.FirebaseMessaging

class MainActivity : AppCompatActivity() {

    lateinit var webView: WebView
    private val NOTIFICATION_PERMISSION_CODE = 1001
    private val APP_URL = "https://damesa.pt/pages/owner-app.html"

    override fun onCreate(savedInstanceState: Bundle?) {
        installSplashScreen()  // must be before super.onCreate for Android 12+
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_main)

        createNotificationChannel()
        requestNotificationPermission()

        webView = findViewById(R.id.webView)
        setupWebView()

        // Handle back navigation — go back in WebView history before exiting
        onBackPressedDispatcher.addCallback(this, object : OnBackPressedCallback(true) {
            override fun handleOnBackPressed() {
                if (webView.canGoBack()) {
                    webView.goBack()
                } else {
                    isEnabled = false
                    onBackPressedDispatcher.onBackPressed()
                }
            }
        })

        // Load the owner app
        webView.loadUrl(APP_URL)

        // Get FCM token and expose it to the WebView
        FirebaseMessaging.getInstance().token.addOnCompleteListener { task ->
            if (task.isSuccessful) {
                val token = task.result
                // Inject token into WebView once page is loaded
                webView.post {
                    webView.evaluateJavascript(
                        "window._fcmToken = '${token}'; if(window.onFcmTokenReady) window.onFcmTokenReady('${token}');",
                        null
                    )
                }
            }
        }
    }

    private fun setupWebView() {
        val settings = webView.settings
        settings.javaScriptEnabled = true
        settings.domStorageEnabled = true
        settings.databaseEnabled = true
        settings.allowFileAccess = false
        settings.allowContentAccess = false
        settings.setSupportZoom(false)
        settings.builtInZoomControls = false
        settings.displayZoomControls = false
        settings.useWideViewPort = true
        settings.loadWithOverviewMode = true
        settings.mediaPlaybackRequiresUserGesture = false

        // Add JavaScript interface for native bridge
        webView.addJavascriptInterface(AndroidInterface(this), "AndroidInterface")

        webView.webViewClient = object : WebViewClient() {
            override fun onPageFinished(view: WebView?, url: String?) {
                super.onPageFinished(view, url)
                // Re-inject FCM token on every page load
                FirebaseMessaging.getInstance().token.addOnCompleteListener { task ->
                    if (task.isSuccessful) {
                        val token = task.result
                        view?.evaluateJavascript(
                            "window._fcmToken = '${token}'; if(window.onFcmTokenReady) window.onFcmTokenReady('${token}');",
                            null
                        )
                    }
                }
            }

            override fun shouldOverrideUrlLoading(view: WebView?, request: WebResourceRequest?): Boolean {
                val url = request?.url?.toString() ?: return false
                // Keep navigation within damesa.pt inside the WebView
                return if (url.startsWith("https://damesa.pt") || url.startsWith("https://www.damesa.pt")) {
                    false // let WebView handle it
                } else {
                    true // block external URLs
                }
            }
        }

        webView.webChromeClient = object : WebChromeClient() {
            override fun onPermissionRequest(request: PermissionRequest?) {
                request?.grant(request.resources)
            }
        }
    }

    private fun createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val soundUri = RingtoneManager.getDefaultUri(RingtoneManager.TYPE_NOTIFICATION)
            val audioAttributes = AudioAttributes.Builder()
                .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
                .setUsage(AudioAttributes.USAGE_NOTIFICATION)
                .build()

            val channel = NotificationChannel(
                "damesa_bookings",
                "Reservas Da Mesa",
                NotificationManager.IMPORTANCE_HIGH
            ).apply {
                description = "Notificações de novas reservas"
                enableVibration(true)
                vibrationPattern = longArrayOf(0, 300, 100, 300)
                enableLights(true)
                setSound(soundUri, audioAttributes)
            }
            val manager = getSystemService(NotificationManager::class.java)
            manager.createNotificationChannel(channel)
        }
    }

    private fun requestNotificationPermission() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            if (ContextCompat.checkSelfPermission(this, Manifest.permission.POST_NOTIFICATIONS)
                != PackageManager.PERMISSION_GRANTED
            ) {
                ActivityCompat.requestPermissions(
                    this,
                    arrayOf(Manifest.permission.POST_NOTIFICATIONS),
                    NOTIFICATION_PERMISSION_CODE
                )
            }
        }
    }

    override fun onRequestPermissionsResult(
        requestCode: Int,
        permissions: Array<out String>,
        grantResults: IntArray
    ) {
        super.onRequestPermissionsResult(requestCode, permissions, grantResults)
        if (requestCode == NOTIFICATION_PERMISSION_CODE) {
            if (grantResults.isNotEmpty() && grantResults[0] == PackageManager.PERMISSION_GRANTED) {
                // Permission granted — FCM will work
            } else {
                Toast.makeText(this, "Ative as notificações para receber novas reservas", Toast.LENGTH_LONG).show()
            }
        }
    }

    override fun onResume() {
        super.onResume()
        // When the user returns to the app (e.g. after tapping a notification),
        // tell the WebView to reload the bookings list so it's always fresh.
        webView.post {
            webView.evaluateJavascript(
                "if(typeof window.onAppResume === 'function') window.onAppResume();",
                null
            )
        }
    }

}
