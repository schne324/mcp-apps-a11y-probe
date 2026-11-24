// Native-host case: does a macOS app's own NSAppearance (set per app or per view, without touching OS settings)
// change what a sandboxed, cross-origin, two-deep iframe sees in WKWebView?
import AppKit
import WebKit

let queries = [
  "(prefers-color-scheme: dark)", "(prefers-contrast: more)", "(prefers-reduced-motion: reduce)",
  "(prefers-reduced-transparency: reduce)", "(inverted-colors: inverted)", "(forced-colors: active)",
]
let qjson = String(data: try! JSONSerialization.data(withJSONObject: queries), encoding: .utf8)!
func probe(_ label: String) -> String {
  "<script>const Q=\(qjson);const r={};for(const q of Q)r[q]=matchMedia(q).matches;top.postMessage({label:'\(label)',r},'*');</script>"
}
let appHtml = "<!doctype html><body>app\(probe("app"))</body>"
let pages: [String: String] = [
  "hosta": "<!doctype html><body><script>addEventListener('message',e=>webkit.messageHandlers.out.postMessage(JSON.stringify(e.data)))</script>host<iframe sandbox=\"allow-scripts allow-same-origin\" src=\"proxyb://x/\"></iframe>\(probe("host"))</body>",
  "proxyb": "<!doctype html><body>proxy<iframe sandbox=\"allow-scripts\" src=\"appc://x/\"></iframe>\(probe("proxy"))</body>",
  "appc": appHtml,
]

final class Scheme: NSObject, WKURLSchemeHandler {
  func webView(_ w: WKWebView, start t: WKURLSchemeTask) {
    let body = pages[t.request.url!.scheme!]!.data(using: .utf8)!
    t.didReceive(URLResponse(url: t.request.url!, mimeType: "text/html", expectedContentLength: body.count, textEncodingName: "utf-8"))
    t.didReceive(body); t.didFinish()
  }
  func webView(_ w: WKWebView, stop t: WKURLSchemeTask) {}
}
final class Out: NSObject, WKScriptMessageHandler {
  var lines: [String] = []
  func userContentController(_ c: WKUserContentController, didReceive m: WKScriptMessage) { lines.append(m.body as! String) }
}

let app = NSApplication.shared
app.setActivationPolicy(.prohibited)
let cases: [(String, NSAppearance.Name?, Bool)] = [
  ("no override (follows OS)", nil, false),
  ("NSApp.appearance = darkAqua", .darkAqua, true),
  ("NSApp.appearance = aqua", .aqua, true),
  ("NSApp.appearance = accessibilityHighContrastAqua", .accessibilityHighContrastAqua, true),
  ("NSApp.appearance = accessibilityHighContrastDarkAqua", .accessibilityHighContrastDarkAqua, true),
  ("webView.appearance = darkAqua (per view)", .darkAqua, false),
  ("webView.appearance = accessibilityHighContrastAqua (per view)", .accessibilityHighContrastAqua, false),
]
for (name, appearance, appWide) in cases {
  NSApp.appearance = appWide ? appearance.flatMap(NSAppearance.init(named:)) : nil
  let cfg = WKWebViewConfiguration()
  for s in ["hosta", "proxyb", "appc"] { cfg.setURLSchemeHandler(Scheme(), forURLScheme: s) }
  let out = Out(); cfg.userContentController.add(out, name: "out")
  let win = NSWindow(contentRect: NSRect(x: -5000, y: -5000, width: 400, height: 300), styleMask: [.borderless], backing: .buffered, defer: false)
  let wv = WKWebView(frame: win.contentView!.bounds, configuration: cfg)
  if !appWide, let a = appearance { wv.appearance = NSAppearance(named: a) }
  win.contentView!.addSubview(wv); win.orderBack(nil)
  wv.load(URLRequest(url: URL(string: "hosta://x/")!))
  let deadline = Date().addingTimeInterval(8)
  while out.lines.count < 3 && Date() < deadline { RunLoop.main.run(until: Date().addingTimeInterval(0.05)) }
  print("=== \(name)")
  for l in out.lines.sorted() { print("  " + l) }
  win.close()
}
