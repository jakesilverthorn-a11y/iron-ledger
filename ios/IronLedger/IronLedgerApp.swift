import SwiftUI
import UserNotifications

/// Iron Ledger for iPhone: the same app as the web version (shown in a web view),
/// plus native Apple Health, rest-over notifications, haptics and the share sheet.
@main
struct IronLedgerApp: App {
    @UIApplicationDelegateAdaptor(AppDelegate.self) var appDelegate

    var body: some Scene {
        WindowGroup {
            WebContainer()
                .ignoresSafeArea()
                .background(Color(red: 15 / 255, green: 17 / 255, blue: 19 / 255).ignoresSafeArea())
        }
    }
}

final class AppDelegate: NSObject, UIApplicationDelegate, UNUserNotificationCenterDelegate {
    func application(_ application: UIApplication,
                     didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]? = nil) -> Bool {
        UNUserNotificationCenter.current().delegate = self
        return true
    }

    // While the app is open it beeps on its own, so the rest notification only shows when you're elsewhere.
    func userNotificationCenter(_ center: UNUserNotificationCenter,
                                willPresent notification: UNNotification,
                                withCompletionHandler completionHandler: @escaping (UNNotificationPresentationOptions) -> Void) {
        completionHandler([])
    }
}
