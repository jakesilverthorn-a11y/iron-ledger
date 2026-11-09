import AVFoundation
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

        case "saveWorkout":
            let start = Date(timeIntervalSince1970: ((args["start"] as? NSNumber)?.doubleValue ?? 0) / 1000)
            let end = Date(timeIntervalSince1970: ((args["end"] as? NSNumber)?.doubleValue ?? 0) / 1000)
            let kcal = (args["kcal"] as? NSNumber)?.doubleValue ?? 0
            health.saveWorkout(start: start, end: end, kcal: kcal) { error in
                if let error = error { self.reply(id, nil, error: error) } else { self.reply(id, ["ok": true]) }
            }

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

        case "tone":
            // timer beeps (countdown, "go", each rep): played by the app so they never stop your music
            let freq = (args["f"] as? Double) ?? 880
            let ms = (args["ms"] as? Double) ?? 120
            let vol = (args["vol"] as? Double) ?? 0.3
            let loud = (args["loud"] as? Bool) ?? true
            DispatchQueue.main.async { Tones.shared.play(freq: freq, ms: ms, volume: vol, loud: loud) }
            reply(id, ["ok": true])

        case "speak":
            // tempo and hold timer cues ("down", "two", "one", "up"): spoken by the app so they work on silent and over music
            let text = (args["text"] as? String) ?? ""
            let loud = (args["loud"] as? Bool) ?? true
            DispatchQueue.main.async { Speaker.shared.say(text, loud: loud) }
            reply(id, ["ok": true])

        case "chime":
            // rest is over: plays on silent (loud) and keeps your music playing
            let loud = (args["loud"] as? Bool) ?? true
            DispatchQueue.main.async { Chime.shared.play(loud: loud) }
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

/// The rest-over chime, played by the app itself. A web page on iPhone has to choose between sounding on silent
/// (and pausing your music) or mixing with music (and staying quiet on silent); the app can do both at once.
final class Chime {
    static let shared = Chime()
    private var player: AVAudioPlayer?
    private lazy var sound: Data = Chime.makeWav()

    func play(loud: Bool) {
        let session = AVAudioSession.sharedInstance()
        do {
            if loud {
                try session.setCategory(.playback, mode: .default, options: [.mixWithOthers])
            } else {
                try session.setCategory(.ambient, mode: .default, options: [.mixWithOthers])
            }
            try session.setActive(true)
        } catch { }
        player = try? AVAudioPlayer(data: sound)
        player?.volume = 1
        player?.play()
        let length = (player?.duration ?? 0.8) + 0.3
        DispatchQueue.main.asyncAfter(deadline: .now() + length) { [weak self] in
            if self?.player?.isPlaying == true { return }
            // let your music come back up to full volume
            try? session.setActive(false, options: .notifyOthersOnDeactivation)
        }
    }

    /// Three rising notes (E6, A6, C7), the same chime as the web version, as a small WAV file in memory.
    private static func makeWav() -> Data {
        let rate = 44100.0
        let notes: [(Double, Double)] = [(0, 1318.5), (0.14, 1760), (0.28, 2093)]
        let count = Int(rate * 0.95)
        var samples = [Double](repeating: 0, count: count)
        for (start, freq) in notes {
            let first = Int(start * rate)
            let length = Int(0.6 * rate)
            for i in 0..<length where first + i < count {
                let t = Double(i) / rate
                let envelope = min(1.0, t / 0.008) * exp(-t * 7.0)
                samples[first + i] += sin(2.0 * Double.pi * freq * t) * envelope * 0.3
            }
        }
        var pcm = Data(capacity: count * 2)
        for value in samples {
            var x = Int16(max(-1.0, min(1.0, value)) * 32767.0).littleEndian
            withUnsafeBytes(of: &x) { pcm.append(contentsOf: $0) }
        }
        var wav = Data()
        func u32(_ v: UInt32) { var x = v.littleEndian; withUnsafeBytes(of: &x) { wav.append(contentsOf: $0) } }
        func u16(_ v: UInt16) { var x = v.littleEndian; withUnsafeBytes(of: &x) { wav.append(contentsOf: $0) } }
        wav.append(contentsOf: Array("RIFF".utf8)); u32(UInt32(36 + pcm.count)); wav.append(contentsOf: Array("WAVE".utf8))
        wav.append(contentsOf: Array("fmt ".utf8)); u32(16); u16(1); u16(1); u32(44100); u32(88200); u16(2); u16(16)
        wav.append(contentsOf: Array("data".utf8)); u32(UInt32(pcm.count)); wav.append(pcm)
        return wav
    }
}

/// Spoken timer cues. Uses the playback audio category (so it sounds with the ring switch on silent) and mixes with
/// your music without pausing or lowering it.
final class Speaker: NSObject, AVSpeechSynthesizerDelegate {
    static let shared = Speaker()
    private let synth = AVSpeechSynthesizer()
    private let voice = AVSpeechSynthesisVoice(language: "en-US")

    override init() {
        super.init()
        synth.delegate = self
    }

    func say(_ text: String, loud: Bool) {
        let trimmed = text.trimmingCharacters(in: .whitespaces)
        if trimmed.isEmpty { return }
        let session = AVAudioSession.sharedInstance()
        do {
            if loud {
                try session.setCategory(.playback, mode: .voicePrompt, options: [.mixWithOthers])
            } else {
                try session.setCategory(.ambient, mode: .default, options: [.mixWithOthers])
            }
            try session.setActive(true)
        } catch { }
        if synth.isSpeaking { synth.stopSpeaking(at: .immediate) }
        let utterance = AVSpeechUtterance(string: trimmed)
        utterance.voice = voice
        utterance.rate = 0.56
        utterance.volume = 1
        synth.speak(utterance)
    }

    func speechSynthesizer(_ synthesizer: AVSpeechSynthesizer, didFinish utterance: AVSpeechUtterance) {
        // wait a moment: the next count is usually less than a second away
        DispatchQueue.main.asyncAfter(deadline: .now() + 1.5) { [weak self] in
            guard let self = self, !self.synth.isSpeaking else { return }
            try? AVAudioSession.sharedInstance().setActive(false, options: .notifyOthersOnDeactivation)
        }
    }
}

/// Sets the app's sound to mix with other apps (music keeps playing at full volume).
/// loud: also sound when the ring switch is on silent.
enum SoundSession {
    static func activate(loud: Bool) {
        let session = AVAudioSession.sharedInstance()
        do {
            if loud {
                try session.setCategory(.playback, mode: .default, options: [.mixWithOthers])
            } else {
                try session.setCategory(.ambient, mode: .default, options: [.mixWithOthers])
            }
            try session.setActive(true)
        } catch { }
    }
}

/// Short sine beeps for the hold (wall sit, plank) and tempo timers.
final class Tones {
    static let shared = Tones()
    private var cache: [String: Data] = [:]
    private var players: [AVAudioPlayer] = []

    func play(freq: Double, ms: Double, volume: Double, loud: Bool) {
        if ms < 5 { return }
        SoundSession.activate(loud: loud)
        let key = "\(Int(freq))-\(Int(ms))"
        let data = cache[key] ?? Tones.makeWav(freq: freq, ms: ms)
        cache[key] = data
        guard let player = try? AVAudioPlayer(data: data) else { return }
        player.volume = Float(max(0.05, min(1.0, volume / 0.3)))
        players.removeAll { !$0.isPlaying }
        players.append(player)
        player.play()
    }

    private static func makeWav(freq: Double, ms: Double) -> Data {
        let rate = 44100.0
        let count = Int(rate * (ms / 1000.0 + 0.02))
        var pcm = Data(capacity: count * 2)
        for i in 0..<count {
            let t = Double(i) / rate
            let attack = min(1.0, t / 0.01)
            let release = min(1.0, max(0.0, (ms / 1000.0 + 0.02 - t) / 0.03))
            let value = sin(2.0 * Double.pi * freq * t) * attack * release * 0.45
            var x = Int16(max(-1.0, min(1.0, value)) * 32767.0).littleEndian
            withUnsafeBytes(of: &x) { pcm.append(contentsOf: $0) }
        }
        var wav = Data()
        func u32(_ v: UInt32) { var x = v.littleEndian; withUnsafeBytes(of: &x) { wav.append(contentsOf: $0) } }
        func u16(_ v: UInt16) { var x = v.littleEndian; withUnsafeBytes(of: &x) { wav.append(contentsOf: $0) } }
        wav.append(contentsOf: Array("RIFF".utf8)); u32(UInt32(36 + pcm.count)); wav.append(contentsOf: Array("WAVE".utf8))
        wav.append(contentsOf: Array("fmt ".utf8)); u32(16); u16(1); u16(1); u32(44100); u32(88200); u16(2); u16(16)
        wav.append(contentsOf: Array("data".utf8)); u32(UInt32(pcm.count)); wav.append(pcm)
        return wav
    }
}
