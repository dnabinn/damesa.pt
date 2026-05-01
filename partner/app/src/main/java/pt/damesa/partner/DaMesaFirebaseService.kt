package pt.damesa.partner

import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Intent
import androidx.core.app.NotificationCompat
import com.google.firebase.messaging.FirebaseMessagingService
import com.google.firebase.messaging.RemoteMessage

class DaMesaFirebaseService : FirebaseMessagingService() {

    /**
     * Called when a new FCM token is generated (first install or token refresh).
     * We don't save it here — the WebView does it via window.onFcmTokenReady.
     * But we could also POST it to Supabase directly here if needed.
     */
    override fun onNewToken(token: String) {
        super.onNewToken(token)
        // Token refresh — the app will re-register on next WebView load
    }

    /**
     * Called when a FCM data message arrives while the app is in the foreground,
     * OR when a notification message has a data payload (background handled by system).
     */
    override fun onMessageReceived(message: RemoteMessage) {
        super.onMessageReceived(message)

        val title = message.notification?.title
            ?: message.data["title"]
            ?: "Nova Reserva"

        val body = message.notification?.body
            ?: message.data["body"]
            ?: "Tem uma nova reserva no Da Mesa"

        showNotification(title, body)
    }

    private fun showNotification(title: String, body: String) {
        val intent = Intent(this, MainActivity::class.java).apply {
            addFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP)
        }

        val pendingIntent = PendingIntent.getActivity(
            this, 0, intent,
            PendingIntent.FLAG_ONE_SHOT or PendingIntent.FLAG_IMMUTABLE
        )

        val notification = NotificationCompat.Builder(this, "damesa_bookings")
            .setSmallIcon(R.drawable.ic_notification)
            .setContentTitle(title)
            .setContentText(body)
            .setStyle(NotificationCompat.BigTextStyle().bigText(body))
            .setAutoCancel(true)
            .setPriority(NotificationCompat.PRIORITY_HIGH)
            .setContentIntent(pendingIntent)
            .setVibrate(longArrayOf(0, 300, 100, 300))
            .build()

        val manager = getSystemService(NotificationManager::class.java)
        manager.notify(System.currentTimeMillis().toInt(), notification)
    }
}
