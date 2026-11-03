import SwiftUI
import UIKit
import WebKit

struct WebContainer: UIViewControllerRepresentable {
    func makeUIViewController(context: Context) -> WebViewController { WebViewController() }
    func updateUIViewController(_ controller: WebViewController, context: Context) {}
}

/// Avoids a retain cycle between the web view's content controller and its message handler.
final class WeakMessageHandler: NSObject, WKScriptMessageHandler {
    weak var target: WKScriptMessageHandler?
    init(_ target: WKScriptMessageHandler) { self.target = target }
    func userContentController(_ controller: WKUserContentController, didReceive message: WKScriptMessage) {
        target?.userContentController(controller, didReceive: message)
    }
}

final class WebViewController: UIViewController, WKNavigationDelegate, WKUIDelegate, WKScriptMessageHandler {
    /// The app loads the live web app, so it updates whenever the web version does.
    /// Its host must also be listed under WKAppBoundDomains in Info.plist (that is what allows offline use).
    static let appURL = URL(string: "https://jakesilverthorn-a11y.github.io/iron-ledger/")!

    private(set) var webView: WKWebView!
    private let bridge = NativeBridge()
    private let offlineView = UIView()
    private let background = UIColor(red: 15 / 255, green: 17 / 255, blue: 19 / 255, alpha: 1)

    override func viewDidLoad() {
        super.viewDidLoad()
        view.backgroundColor = background

        let config = WKWebViewConfiguration()
        config.limitsNavigationsToAppBoundDomains = true
        config.allowsInlineMediaPlayback = true
        config.mediaTypesRequiringUserActionForPlayback = []
        config.websiteDataStore = .default()
        config.applicationNameForUserAgent = "IronLedgerApp/1.0"
        config.userContentController.add(WeakMessageHandler(self), name: "il")

        webView = WKWebView(frame: view.bounds, configuration: config)
        webView.autoresizingMask = [.flexibleWidth, .flexibleHeight]
        webView.isOpaque = false
        webView.backgroundColor = background
        webView.scrollView.backgroundColor = background
        webView.scrollView.contentInsetAdjustmentBehavior = .never
        webView.allowsBackForwardNavigationGestures = false
        webView.navigationDelegate = self
        webView.uiDelegate = self
        if #available(iOS 16.4, *) { webView.isInspectable = true }
        view.addSubview(webView)

        buildOfflineView()
        bridge.controller = self
        webView.load(URLRequest(url: Self.appURL))

        NotificationCenter.default.addObserver(self, selector: #selector(appBecameActive),
                                               name: UIApplication.didBecomeActiveNotification, object: nil)
        NotificationCenter.default.addObserver(self, selector: #selector(quickAction),
                                               name: QuickAction.notification, object: nil)
    }

    private var pageReady = false

    @objc private func quickAction() { deliverQuickAction() }

    /// Hands a pending Home Screen quick action to the page once it has loaded.
    private func deliverQuickAction() {
        guard pageReady, let action = QuickAction.pending else { return }
        QuickAction.pending = nil
        let safe = action.filter { $0.isLetter }
        // give the app a moment to finish starting up (sign-in, loading your data)
        DispatchQueue.main.asyncAfter(deadline: .now() + 0.6) {
            self.webView.evaluateJavaScript("window.ILNativeEvent && window.ILNativeEvent('quick', '\(safe)')", completionHandler: nil)
        }
    }

    @objc private func appBecameActive() {
        webView.evaluateJavaScript("window.ILNativeEvent && window.ILNativeEvent('foreground')", completionHandler: nil)
    }

    // MARK: messages from the page

    func userContentController(_ controller: WKUserContentController, didReceive message: WKScriptMessage) {
        guard let body = message.body as? [String: Any],
              let id = body["id"] as? String,
              let cmd = body["cmd"] as? String else { return }
        bridge.handle(id: id, cmd: cmd, args: body["args"] as? [String: Any] ?? [:])
    }

    /// Answers a call from the page: window.ILNativeReply({id, data, err, cancel}).
    func sendReply(id: String, data: Any?, error: String?, cancelled: Bool = false) {
        var payload: [String: Any] = ["id": id]
        if let data = data { payload["data"] = data }
        if let error = error { payload["err"] = error }
        if cancelled { payload["cancel"] = true }
        guard JSONSerialization.isValidJSONObject(payload),
              let json = try? JSONSerialization.data(withJSONObject: payload),
              let text = String(data: json, encoding: .utf8) else { return }
        webView.evaluateJavaScript("window.ILNativeReply && window.ILNativeReply(\(text))", completionHandler: nil)
    }

    func presentShare(items: [Any], done: @escaping (Bool) -> Void) {
        let sheet = UIActivityViewController(activityItems: items, applicationActivities: nil)
        sheet.popoverPresentationController?.sourceView = view
        sheet.popoverPresentationController?.sourceRect = CGRect(x: view.bounds.midX, y: view.bounds.maxY - 80, width: 1, height: 1)
        sheet.completionWithItemsHandler = { _, completed, _, _ in done(completed) }
        topController().present(sheet, animated: true)
    }

    private func topController() -> UIViewController {
        var top: UIViewController = self
        while let next = top.presentedViewController { top = next }
        return top
    }

    // MARK: navigation: the app's own pages stay here, everything else opens in Safari

    func webView(_ webView: WKWebView, decidePolicyFor action: WKNavigationAction,
                 decisionHandler: @escaping (WKNavigationActionPolicy) -> Void) {
        guard let url = action.request.url else { decisionHandler(.cancel); return }
        let scheme = url.scheme?.lowercased() ?? ""
        if scheme == "about" || scheme == "blob" || scheme == "data" { decisionHandler(.allow); return }
        if url.host == Self.appURL.host && url.path.hasPrefix(Self.appURL.path) {
            decisionHandler(.allow); return
        }
        if action.targetFrame?.isMainFrame == false && action.navigationType != .linkActivated {
            decisionHandler(.allow); return   // frames inside the page (none today)
        }
        UIApplication.shared.open(url)
        decisionHandler(.cancel)
    }

    // window.open / target=_blank
    func webView(_ webView: WKWebView, createWebViewWith configuration: WKWebViewConfiguration,
                 for action: WKNavigationAction, windowFeatures: WKWindowFeatures) -> WKWebView? {
        if let url = action.request.url { UIApplication.shared.open(url) }
        return nil
    }

    func webView(_ webView: WKWebView, didFinish navigation: WKNavigation!) {
        offlineView.isHidden = true
        pageReady = true
        deliverQuickAction()
    }
    func webView(_ webView: WKWebView, didFailProvisionalNavigation navigation: WKNavigation!, withError error: Error) {
        showOffline(error)
    }
    func webView(_ webView: WKWebView, didFail navigation: WKNavigation!, withError error: Error) { showOffline(error) }
    func webViewWebContentProcessDidTerminate(_ webView: WKWebView) { webView.reload() }

    private func showOffline(_ error: Error) {
        let code = (error as NSError).code
        if code == NSURLErrorCancelled { return }
        offlineView.isHidden = false
    }

    private func buildOfflineView() {
        offlineView.backgroundColor = background
        offlineView.isHidden = true
        offlineView.frame = view.bounds
        offlineView.autoresizingMask = [.flexibleWidth, .flexibleHeight]
        let label = UILabel()
        label.text = "Iron Ledger couldn't load.\nCheck your connection and try again."
        label.numberOfLines = 0
        label.textAlignment = .center
        label.textColor = UIColor(white: 0.92, alpha: 1)
        label.font = .preferredFont(forTextStyle: .body)
        let button = UIButton(type: .system)
        button.setTitle("Try again", for: .normal)
        button.titleLabel?.font = .preferredFont(forTextStyle: .headline)
        button.tintColor = UIColor(red: 0.95, green: 0.76, blue: 0.19, alpha: 1)
        button.addTarget(self, action: #selector(retry), for: .touchUpInside)
        let stack = UIStackView(arrangedSubviews: [label, button])
        stack.axis = .vertical
        stack.spacing = 16
        stack.translatesAutoresizingMaskIntoConstraints = false
        offlineView.addSubview(stack)
        NSLayoutConstraint.activate([
            stack.centerXAnchor.constraint(equalTo: offlineView.centerXAnchor),
            stack.centerYAnchor.constraint(equalTo: offlineView.centerYAnchor),
            stack.leadingAnchor.constraint(greaterThanOrEqualTo: offlineView.leadingAnchor, constant: 24),
        ])
        view.addSubview(offlineView)
    }

    @objc private func retry() {
        offlineView.isHidden = true
        webView.load(URLRequest(url: Self.appURL))
    }

    // MARK: alert() and confirm() from the page

    func webView(_ webView: WKWebView, runJavaScriptAlertPanelWithMessage message: String,
                 initiatedByFrame frame: WKFrameInfo, completionHandler: @escaping () -> Void) {
        let alert = UIAlertController(title: nil, message: message, preferredStyle: .alert)
        alert.addAction(UIAlertAction(title: "OK", style: .default) { _ in completionHandler() })
        topController().present(alert, animated: true)
    }

    func webView(_ webView: WKWebView, runJavaScriptConfirmPanelWithMessage message: String,
                 initiatedByFrame frame: WKFrameInfo, completionHandler: @escaping (Bool) -> Void) {
        let alert = UIAlertController(title: nil, message: message, preferredStyle: .alert)
        alert.addAction(UIAlertAction(title: "Cancel", style: .cancel) { _ in completionHandler(false) })
        alert.addAction(UIAlertAction(title: "OK", style: .default) { _ in completionHandler(true) })
        topController().present(alert, animated: true)
    }

    func webView(_ webView: WKWebView, runJavaScriptTextInputPanelWithPrompt prompt: String, defaultText: String?,
                 initiatedByFrame frame: WKFrameInfo, completionHandler: @escaping (String?) -> Void) {
        let alert = UIAlertController(title: nil, message: prompt, preferredStyle: .alert)
        alert.addTextField { $0.text = defaultText }
        alert.addAction(UIAlertAction(title: "Cancel", style: .cancel) { _ in completionHandler(nil) })
        alert.addAction(UIAlertAction(title: "OK", style: .default) { _ in completionHandler(alert.textFields?.first?.text) })
        topController().present(alert, animated: true)
    }
}
