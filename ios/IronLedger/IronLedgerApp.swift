import AVFoundation
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
        // sounds from the app mix with your music instead of stopping it
        try? AVAudioSession.sharedInstance().setCategory(.ambient, mode: .default, options: [.mixWithOthers])
        return true
    }

    // Quick actions (press and hold the app icon) arrive through the scene delegate below.
    func application(_ application: UIApplication, configurationForConnecting session: UISceneSession,
                     options: UIScene.ConnectionOptions) -> UISceneConfiguration {
        if let item = options.shortcutItem { QuickAction.post(item.type) }
        let config = UISceneConfiguration(name: nil, sessionRole: session.role)
        config.delegateClass = SceneDelegate.self
        return config
    }

    // While the app is open it beeps on its own, so the rest notification only shows when you're elsewhere.
    func userNotificationCenter(_ center: UNUserNotificationCenter,
                                willPresent notification: UNNotification,
                                withCompletionHandler completionHandler: @escaping (UNNotificationPresentationOptions) -> Void) {
        completionHandler([])
    }
}

/// Home Screen quick actions: "Today's workout", "Empty workout", "Log weight" (listed in Info.plist).
enum QuickAction {
    static let notification = Notification.Name("ILQuickAction")
    /// Kept until the page is ready to receive it (the app may still be launching).
    static var pending: String?

    static func post(_ type: String) {
        let action = type.components(separatedBy: ".").last ?? type
        pending = action
        NotificationCenter.default.post(name: notification, object: action)
    }
}

final class SceneDelegate: NSObject, UIWindowSceneDelegate {
    func windowScene(_ windowScene: UIWindowScene, performActionFor shortcutItem: UIApplicationShortcutItem,
                     completionHandler: @escaping (Bool) -> Void) {
        QuickAction.post(shortcutItem.type)
        completionHandler(true)
    }
}
