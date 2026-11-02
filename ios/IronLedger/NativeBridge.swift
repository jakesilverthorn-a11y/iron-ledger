import UIKit
import UserNotifications

/// What the page can ask the app to do (see src/native.js on the web side).
final class NativeBridge {
    weak var controller: WebViewController?
    private let health = HealthReader()

    func handle(id: String, cmd: String, args: [String: Any]) {
        switch cmd {
        case "info":
            reply(id, ["app": "ios", "health": HealthReader.available])

        case "healthAuth":
            health.requestAuthorization { error in
                if let error = error { self.reply(id, nil, error: error) } else { self.reply(id, ["ok": true]) }
            }

        case "healthRead":
            let days = max(1, min(400, (args["days"] as? NSNumber)?.intValue ?? 7))
            health.readDays(days) { rows in self.reply(id, ["days": rows]) }

        case "restStart":
            let seconds = (args["sec"] as? NSNumber)?.doubleValue ?? 90
            let body = args["body"] as? String ?? "Time for your next set."
            Self.scheduleRestNotification(after: seconds, body: body)
            reply(id, ["ok": true])

        case "notifyAsk":
            // asked when a workout starts, so the first rest alert isn't held up by the permission prompt
            UNUserNotificationCenter.current().getNotificationSettings { settings in
                if settings.authorizationStatus == .notDetermined {
                    UNUserNotificationCenter.current().requestAuthorization(options: [.alert, .sound]) { _, _ in }
                }
            }
            reply(id, ["ok": true])

        case "restCancel":
            UNUserNotificationCenter.current().removePendingNotificationRequests(withIdentifiers: ["rest"])
            reply(id, ["ok": true])

        case "haptic":
            if (args["k"] as? String) == "done" {
                UINotificationFeedbackGenerator().notificationOccurred(.success)
            } else {
                UIImpactFeedbackGenerator(style: .medium).impactOccurred()
            }
            reply(id, ["ok": true])

        case "awake":
            // keep the screen on during a workout
            UIApplication.shared.isIdleTimerDisabled = (args["on"] as? Bool) ?? false
            reply(id, ["ok": true])

        case "share":
            share(id: id, args: args)

        default:
            reply(id, nil, error: "Unknown command: \(cmd)")
        }
    }

    private func reply(_ id: String, _ data: Any?, error: String? = nil, cancelled: Bool = false) {
        DispatchQueue.main.async {
            self.controller?.sendReply(id: id, data: data, error: error, cancelled: cancelled)
        }
    }

    // MARK: share sheet (backup files, workout pictures, the timeline video, invite links)

    private func share(id: String, args: [String: Any]) {
        var items: [Any] = []
        if let b64 = args["b64"] as? String, let data = Data(base64Encoded: b64) {
            let raw = (args["name"] as? String) ?? "file"
            let name = raw.replacingOccurrences(of: "/", with: "-").replacingOccurrences(of: ":", with: "-")
            let url = FileManager.default.temporaryDirectory.appendingPathComponent(name.isEmpty ? "file" : name)
            do { try data.write(to: url, options: .atomic) } catch {
                reply(id, nil, error: "Could not prepare the file."); return
            }
            items.append(url)
        } else if let text = args["text"] as? String, !text.isEmpty {
            items.append(text)
        }
        guard !items.isEmpty, let controller = controller else { reply(id, nil, error: "Nothing to share."); return }
        DispatchQueue.main.async {
            controller.presentShare(items: items) { completed in
                if completed { self.reply(id, ["ok": true]) } else { self.reply(id, nil, error: "Share cancelled.", cancelled: true) }
            }
        }
    }

    // MARK: rest-over notification

    static func scheduleRestNotification(after seconds: Double, body: String) {
        let center = UNUserNotificationCenter.current()
        center.getNotificationSettings { settings in
            switch settings.authorizationStatus {
            case .notDetermined:
                center.requestAuthorization(options: [.alert, .sound]) { granted, _ in
                    if granted { addRest(center, seconds, body) }
                }
            case .denied:
                return
            default:
                addRest(center, seconds, body)
            }
        }
    }

    private static func addRest(_ center: UNUserNotificationCenter, _ seconds: Double, _ body: String) {
        center.removePendingNotificationRequests(withIdentifiers: ["rest"])
        let content = UNMutableNotificationContent()
        content.title = "Rest is over"
        content.body = body
        content.sound = .default
        content.interruptionLevel = .timeSensitive   // gets through Focus modes, like a timer would
        let trigger = UNTimeIntervalNotificationTrigger(timeInterval: max(1, seconds), repeats: false)
        center.add(UNNotificationRequest(identifier: "rest", content: content, trigger: trigger))
    }
}
