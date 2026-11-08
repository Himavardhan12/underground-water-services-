#!/usr/bin/env python3
"""Executable test suite for the Sai Underground Water Services site.

Runs against a local HTTP server that applies the exact response
headers declared in vercel.json, so the Content-Security-Policy is
tested for real rather than assumed to work.

Usage:
    python3 tests/run-tests.py

Exits 0 when every test passes, 1 otherwise.
"""

import base64
import fcntl
import hashlib
import json
import os
import re
import select
import shutil
import subprocess
import sys
import tempfile
import threading
import time
import urllib.request
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CHROME_CANDIDATES = [
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    "/Applications/Chromium.app/Contents/MacOS/Chromium",
    "/usr/bin/google-chrome",
    "/usr/bin/chromium",
]

results = []


def check(group, name, passed, detail=None):
    results.append({"group": group, "name": name, "pass": bool(passed), "detail": detail})
    mark = "PASS" if passed else "FAIL"
    extra = "" if detail is None else "  <- %s" % detail
    print("  [%s] %s%s" % (mark, name, extra))


# --------------------------------------------------------------------------
# server that applies vercel.json headers
# --------------------------------------------------------------------------
def load_headers():
    with open(os.path.join(ROOT, "vercel.json"), encoding="utf-8") as fh:
        config = json.load(fh)
    out = []
    for entry in config.get("headers", []):
        out.append((entry["source"], [(h["key"], h["value"]) for h in entry["headers"]]))
    return out


HEADERS = load_headers()


FRAME_TARGET = "/frame-target.html"


class Handler(SimpleHTTPRequestHandler):
    """Serves the site with the exact headers declared in vercel.json.

    Production sends frame-ancestors 'none', which correctly refuses to
    be framed by anyone, including this same-origin harness. Rather than
    weaken that header, the test server serves the *identical*
    index.html bytes at a test-only path (/frame-target.html) with
    framing allowed just there. The harness iframes that path, so the
    production code under test is byte-for-byte the deployed code, and
    separate assertions confirm the real paths still send 'none'.
    """

    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=ROOT, **kwargs)

    def send_head(self):
        if self.path.split("?")[0] == FRAME_TARGET:
            self._frame_target = True
            self.path = "/index.html"
        return super().send_head()

    def end_headers(self):
        relaxed = getattr(self, "_frame_target", False)
        for pattern, headers in HEADERS:
            if re.fullmatch(pattern.replace("(.*)", ".*"), self.path.split("?")[0]) or pattern == "/(.*)":
                for key, value in headers:
                    if relaxed and key == "X-Frame-Options":
                        value = "SAMEORIGIN"
                    elif relaxed and key == "Content-Security-Policy":
                        value = value.replace("frame-ancestors 'none'", "frame-ancestors 'self'")
                    self.send_header(key, value)
        super().end_headers()

    def log_message(self, *args):
        pass


def start_server():
    server = ThreadingHTTPServer(("127.0.0.1", 0), Handler)
    threading.Thread(target=server.serve_forever, daemon=True).start()
    return server, server.server_address[1]


# --------------------------------------------------------------------------
# headless chrome
# --------------------------------------------------------------------------
def find_chrome():
    for path in CHROME_CANDIDATES:
        if os.path.exists(path):
            return path
    return None


def chrome_dump(chrome, url, profile, window="1440,900", budget=9000, extra=None):
    """Returns (dom_text, stderr_text)."""
    cmd = [
        chrome, "--headless=new", "--disable-gpu", "--hide-scrollbars",
        "--no-first-run", "--no-sandbox", "--user-data-dir=" + profile,
        "--window-size=" + window, "--virtual-time-budget=%d" % budget,
        "--enable-logging=stderr", "--dump-dom", url,
    ]
    if extra:
        cmd[1:1] = extra
    proc = subprocess.run(cmd, capture_output=True, text=True, timeout=180)
    return proc.stdout, proc.stderr


def debug_json(dom):
    m = re.search(r'<pre id="debug">(.*?)</pre>', dom, re.S)
    if not m:
        return None
    try:
        return json.loads(m.group(1))
    except json.JSONDecodeError as exc:
        return {"__error": str(exc)}


def harness_json(dom):
    m = re.search(r'<pre id="results">(.*?)</pre>', dom, re.S)
    if not m:
        return None
    try:
        return json.loads(m.group(1))
    except json.JSONDecodeError as exc:
        return {"__error": str(exc), "raw": m.group(1)[:400]}


class NoJsBrowser:
    """Drives Chrome with scripting genuinely disabled over the DevTools
    pipe, so the <noscript> fallback can be tested as a real no-JS
    browser sees it rather than only inspected as markup.

    --dump-dom returns nothing once scriptEnabled=false, so the DOM is
    read back through Runtime.evaluate instead.
    """

    def __init__(self, chrome, profile, extra=()):
        cmd_r, cmd_w = os.pipe()
        out_r, out_w = os.pipe()

        def preexec():
            os.dup2(cmd_r, 3)
            os.dup2(out_w, 4)
            for fd in (3, 4):
                flags = fcntl.fcntl(fd, fcntl.F_GETFD)
                fcntl.fcntl(fd, fcntl.F_SETFD, flags & ~fcntl.FD_CLOEXEC)

        self.proc = subprocess.Popen(
            [chrome, "--headless=new", "--disable-gpu", "--hide-scrollbars",
             "--no-first-run", "--user-data-dir=" + profile,
             "--window-size=1440,900", "--remote-debugging-pipe"] + list(extra),
            preexec_fn=preexec, close_fds=False,
            stdin=subprocess.DEVNULL, stdout=subprocess.DEVNULL,
            stderr=subprocess.DEVNULL)
        os.close(cmd_r)
        os.close(out_w)
        self.cmd_w = cmd_w
        self.out_r = out_r
        self.buf = b""
        self.seq = 0
        self.events = []
        self.session = None

    def _messages_until(self, want_id, timeout):
        end = time.time() + timeout
        while time.time() < end:
            r, _, _ = select.select([self.out_r], [], [],
                                    max(0, end - time.time()))
            if not r:
                return None
            chunk = os.read(self.out_r, 1 << 20)
            if not chunk:
                return None
            self.buf += chunk
            while b"\0" in self.buf:
                raw, self.buf = self.buf.split(b"\0", 1)
                msg = json.loads(raw)
                if msg.get("id") == want_id:
                    return msg
                if "method" in msg:
                    self.events.append(msg)
        return None

    def call(self, method, params=None, timeout=30):
        self.seq += 1
        msg = {"id": self.seq, "method": method}
        if params:
            msg["params"] = params
        if self.session:
            msg["sessionId"] = self.session
        os.write(self.cmd_w, json.dumps(msg).encode() + b"\0")
        return self._messages_until(self.seq, timeout)

    def evaluate(self, expression, timeout=30):
        res = self.call("Runtime.evaluate",
                        {"expression": expression, "returnByValue": True},
                        timeout)
        if not isinstance(res, dict) or "result" not in res:
            return "__error__: no response: %s" % (str(res)[:200],)
        inner = res["result"].get("result") or {}
        if inner.get("type") != "string" or "value" not in inner:
            detail = res["result"].get("exceptionDetails")
            return "__error__: %s" % (
                json.dumps(detail)[:300] if detail else json.dumps(inner)[:300],)
        return inner["value"]

    def open_page(self, url):
        target = self.call("Target.createTarget", {"url": "about:blank"})
        tid = target["result"]["targetId"]
        attach = self.call("Target.attachToTarget",
                           {"targetId": tid, "flatten": True})
        self.session = attach["result"]["sessionId"]
        self.call("Page.enable")
        self.call("Runtime.enable")
        self.call("Network.enable")
        self.events = []
        self.call("Page.navigate", {"url": url})
        end = time.time() + 30
        while time.time() < end:
            if any(e.get("method") == "Page.loadEventFired"
                   for e in self.events):
                return True
            self._messages_until(-1, 1)
        return False

    def close(self):
        try:
            self.proc.terminate()
            self.proc.wait(timeout=10)
        except Exception:
            self.proc.kill()
        for fd in (self.cmd_w, self.out_r):
            try:
                os.close(fd)
            except OSError:
                pass


def assert_no_browser_errors(stderr, url):
    bad = []
    for line in stderr.splitlines():
        if "CVDisplayLink" in line or "ERROR:ui/" in line:
            continue
        if re.search(r"Uncaught|is not defined|SyntaxError|TypeError|ReferenceError", line):
            bad.append(line.strip())
        if "Content Security Policy" in line or "Refused to" in line:
            bad.append(line.strip())
    check("browser", "no JS/CSP errors on %s" % url, not bad, "; ".join(bad[:2]) or None)


# --------------------------------------------------------------------------
# static checks
# --------------------------------------------------------------------------
def static_checks():
    print("\n== static analysis ==")
    html_files = ["index.html", "privacy.html", "terms.html"]

    # no inline style/script blocks remain (they would be blocked by CSP)
    for f in html_files:
        raw = open(os.path.join(ROOT, f), encoding="utf-8").read()
        # comments may mention <style> while explaining the CSP, so strip
        # them before looking for real elements
        src = re.sub(r"<!--.*?-->", "", raw, flags=re.S)
        styles = re.findall(r"<style\b", src)
        check("csp", "%s has no inline <style>" % f, not styles, styles or None)
        inline_scripts = re.findall(r"<script(?![^>]*\bsrc=)[^>]*>(?!\s*</script>)", src)
        inline_scripts = [s for s in inline_scripts if "ld+json" not in s]
        check("csp", "%s has no executable inline <script>" % f, not inline_scripts, inline_scripts or None)
        check("csp", "%s has no inline event handlers" % f,
              not re.search(r"\son[a-z]+=", src))
        check("csp", "%s has no javascript: URLs" % f, "javascript:" not in src)

    # noscript fallback files exist and are referenced
    for f in ["css/noscript.css", "css/noscript-legal.css"]:
        check("noscript", "%s exists" % f, os.path.exists(os.path.join(ROOT, f)))
    idx = open(os.path.join(ROOT, "index.html"), encoding="utf-8").read()
    check("noscript", "index links css/noscript.css", 'href="css/noscript.css"' in idx)
    for f in ["privacy.html", "terms.html"]:
        src = open(os.path.join(ROOT, f), encoding="utf-8").read()
        check("noscript", "%s links css/noscript-legal.css" % f,
              'href="css/noscript-legal.css"' in src)

    # secrets
    # Word patterns (secret:, password=, api_key=) only apply to code files:
    # prose in README legitimately uses those words. Distinctive token shapes
    # (Google API keys, GitHub tokens, private key blocks) are matched
    # everywhere, including markdown.
    word_re = re.compile(
        r"(api[_-]?key\s*[:=]|secret[a-z_-]*\s*[:=]|passwd\s*[:=]"
        r"|password\s*[:=])",
        re.I,
    )
    token_re = re.compile(
        r"(BEGIN (RSA|OPENSSH|PRIVATE)"
        r"|sk-[a-z0-9]{20}|AIza[0-9A-Za-z_-]{30}|ghp_[A-zA-Z0-9]{20}|xoxb-)",
        re.I,
    )
    hits = []
    for dirpath, dirnames, filenames in os.walk(ROOT):
        dirnames[:] = [d for d in dirnames if d not in (".git", "node_modules")]
        for name in filenames:
            if not name.endswith((".html", ".js", ".css", ".json", ".md")):
                continue
            path = os.path.join(dirpath, name)
            if os.path.abspath(path) == os.path.abspath(__file__):
                continue
            try:
                text = open(path, encoding="utf-8", errors="ignore").read()
            except OSError:
                continue
            # the test file itself contains these patterns by design
            if "tests" in path:
                continue
            found = token_re.findall(text)
            if not name.endswith(".md"):
                found += word_re.findall(text)
            for m in found:
                hits.append("%s:%s" % (os.path.relpath(path, ROOT),
                                       m[0] if isinstance(m, tuple) else m))
    check("secrets", "no credentials in tracked files", not hits, "; ".join(hits[:3]) or None)

    # git must never track env files or the test harness secrets
    tracked = subprocess.run(["git", "ls-files"], cwd=ROOT,
                             capture_output=True, text=True).stdout.split()
    bad_tracked = [t for t in tracked
                   if re.search(r"(^|/)\.env|\.pem$|\.key$|id_rsa|\.DS_Store$", t)]
    check("secrets", "no .env/key/.DS_Store tracked in git", not bad_tracked,
          "; ".join(bad_tracked) or None)

    # brand rules
    css = open(os.path.join(ROOT, "css/styles.css"), encoding="utf-8").read()
    check("brand", "no #ffffff background in css", "#ffffff" not in css.lower())
    check("brand", "no em dashes in copy",
          not any("—" in open(os.path.join(ROOT, f), encoding="utf-8").read()
                  for f in html_files))
    pill = re.findall(r"border-radius:\s*(999px|50%|100px)", css)
    # 50% is allowed only for circular icons, never for buttons
    btn_pill = re.findall(r"\.btn[^{]*\{[^}]*border-radius:\s*(?:999px|50%)", css)
    check("brand", "no pill-shaped buttons", not btn_pill, btn_pill or None)
    check("brand", "no purple gradients",
          not re.search(r"(?:linear|radial)-gradient\([^)]*(?:#7c3aed|#8b5cf6|#a855f7|#6d28d9)",
                        css, re.I))


# --------------------------------------------------------------------------
# header checks
# --------------------------------------------------------------------------
def header_checks(port):
    print("\n== response headers ==")
    required = [
        "Content-Security-Policy",
        "X-Content-Type-Options",
        "Referrer-Policy",
        "Permissions-Policy",
        "X-Frame-Options",
        "Strict-Transport-Security",
    ]
    for path in ["/index.html", "/privacy.html", "/terms.html", "/css/styles.css"]:
        url = "http://127.0.0.1:%d%s" % (port, path)
        with urllib.request.urlopen(url, timeout=15) as resp:
            headers = {k: v for k, v in resp.headers.items()}
        for key in required:
            check("headers", "%s sends %s" % (path, key), key in headers,
                  headers.get(key, "missing"))

    with urllib.request.urlopen("http://127.0.0.1:%d/index.html" % port, timeout=15) as resp:
        csp = resp.headers.get("Content-Security-Policy", "")
    check("headers", "CSP forbids inline scripts",
          "script-src" in csp and "'unsafe-inline'" not in csp.split("script-src")[1].split(";")[0])
    check("headers", "CSP forbids unsafe-eval", "unsafe-eval" not in csp)
    check("headers", "CSP blocks framing", "frame-ancestors 'none'" in csp)
    check("headers", "CSP allows the JSON-LD block by hash",
          "'sha256-" in csp)

    # the declared hash must match the actual JSON-LD block
    src = open(os.path.join(ROOT, "index.html"), encoding="utf-8").read()
    blocks = re.findall(r'<script type="application/ld\+json">(.*?)</script>', src, re.S)
    for block in blocks:
        digest = base64.b64encode(hashlib.sha256(block.encode("utf-8")).digest()).decode()
        check("headers", "JSON-LD hash matches CSP", ("'sha256-%s'" % digest) in csp, digest)

    # framing must stay fully denied on every production path
    for path in ["/index.html", "/privacy.html", "/terms.html"]:
        with urllib.request.urlopen("http://127.0.0.1:%d%s" % (port, path), timeout=15) as resp:
            page_csp = resp.headers.get("Content-Security-Policy", "")
            xfo = resp.headers.get("X-Frame-Options", "")
        check("headers", "%s forbids all framing" % path,
              "frame-ancestors 'none'" in page_csp and xfo == "DENY",
              "%s / %s" % (page_csp.split("frame-ancestors")[1][:20] if "frame-ancestors" in page_csp else "?", xfo))

    # the harness frames this test-only path, so it must be the real page
    with urllib.request.urlopen("http://127.0.0.1:%d%s" % (port, FRAME_TARGET), timeout=15) as resp:
        framed = resp.read()
        framed_csp = resp.headers.get("Content-Security-Policy", "")
    with urllib.request.urlopen("http://127.0.0.1:%d/index.html" % port, timeout=15) as resp:
        real = resp.read()
    check("headers", "frame target is byte-identical to index.html", framed == real,
          "%d vs %d bytes" % (len(framed), len(real)))
    check("headers", "frame target still forbids cross-origin framing",
          "frame-ancestors 'self'" in framed_csp, framed_csp[:80])


# --------------------------------------------------------------------------
# page behaviour
# --------------------------------------------------------------------------
def behaviour_checks(chrome, profile, port):
    base = "http://127.0.0.1:%d" % port

    print("\n== harness (real production code in an iframe) ==")
    dom, err = chrome_dump(chrome, base + "/tests/harness.html", profile, budget=12000)
    data = harness_json(dom)
    if not data:
        check("harness", "harness produced results", False, "no <pre id=results>")
    elif "__error" in data:
        check("harness", "harness results parsed", False, data.get("raw") or data["__error"])
    else:
        for item in data["results"]:
            check("harness", item["name"], item["pass"], item.get("detail"))
    assert_no_browser_errors(err, "/tests/harness.html")

    print("\n== scene captions (?p=) ==")
    for p in ["0.35", "0.65", "0.73", "0.95"]:
        dom, err = chrome_dump(chrome, "%s/index.html?p=%s" % (base, p), profile, budget=8000)
        d = debug_json(dom)
        if not d:
            check("scene", "p=%s produced debug output" % p, False)
            continue
        active = d.get("active", -1)
        expected = {"0.35": 0, "0.65": 1, "0.73": 2, "0.95": 3}[p]
        check("scene", "p=%s activates caption %d" % (p, expected + 1),
              active == expected, "active=%s" % active)
        opac = d.get("stepOpacity", [])
        check("scene", "p=%s exactly one caption visible" % p,
              opac.count("1") == 1 or opac.count(1) == 1, str(opac))
        check("scene", "p=%s no horizontal overflow" % p,
              d["layout"]["scrollWidth"] <= d["layout"]["innerWidth"],
              "%s > %s" % (d["layout"]["scrollWidth"], d["layout"]["innerWidth"]))
        assert_no_browser_errors(err, "/index.html?p=" + p)

    print("\n== scroll behaviour (?y=) ==")
    dom, err = chrome_dump(chrome, "%s/index.html?y=0" % base, profile, budget=8000)
    d = debug_json(dom)
    # ?y=0 has no ?p= so no debug block; use plain dumps instead
    for y, expect_spot in [("0", "home"), ("1600", "services"), ("99999", "contact")]:
        dom, err = chrome_dump(chrome, "%s/index.html?y=%s" % (base, y), profile, budget=9000)
        active = re.findall(r'<a[^>]*href="#(\w+)"[^>]*class="([^"]*)"', dom)
        lit = [h for h, c in active if "is-active" in c]
        check("scroll", "y=%s lights %s" % (y, expect_spot),
              expect_spot in lit, ",".join(lit) or "none")
        assert_no_browser_errors(err, "/index.html?y=" + y)

    print("\n== reveals ==")
    dom, err = chrome_dump(chrome, base + "/index.html?y=99999", profile, budget=9000)
    revealed = len(re.findall(r'class="[^"]*\breveal\b[^"]*\bin\b', dom))
    total = len(re.findall(r'class="[^"]*\breveal\b', dom))
    check("scroll", "all reveal elements shown at page bottom",
          total > 0 and revealed == total, "%d/%d" % (revealed, total))

    print("\n== reduced motion ==")
    dom, err = chrome_dump(
        chrome, base + "/index.html?p=0.5", profile, budget=8000,
        extra=["--force-prefers-reduced-motion"])
    d = debug_json(dom)
    if d:
        check("reduced", "reduced mode detected", d.get("reduced") is True, str(d.get("reduced")))
        check("reduced", "captions become a static list",
              d.get("stepsPosition") == "static", d.get("stepsPosition"))
        check("reduced", "all four services readable",
              d.get("stepOpacity") == ["1", "1", "1", "1"], str(d.get("stepOpacity")))
    else:
        check("reduced", "reduced mode produced debug output", False)
    assert_no_browser_errors(err, "reduced motion")

    print("\n== no-JavaScript fallback (real browser, scripts disabled) ==")
    nojs_profile = tempfile.mkdtemp(prefix="sai-test-nojs-")
    browser = NoJsBrowser(chrome, nojs_profile,
                          extra=("--blink-settings=scriptEnabled=false",))
    try:
        loaded = browser.open_page(base + "/index.html")
        check("nojs", "page loads with JavaScript disabled", loaded)
        state = browser.evaluate(
            """(function () {
  var q = function (s) { return document.querySelector(s); };
  var cs = function (s) { var e = q(s); return e ? getComputedStyle(e) : null; };
  var reveal = cs('.reveal');
  var input = cs('.enquiry input');
  var area = cs('.enquiry textarea');
  var btn = cs('.enquiry button');
  var nsLink = q('head noscript link');
  var skip = q('.skip-link');
  var note = q('.f-note-noscript');
  return JSON.stringify({
    jsOff: typeof window.SaiI18n === 'undefined',
    noscriptHref: nsLink ? nsLink.getAttribute('href') : null,
    revealOpacity: reveal ? reveal.opacity : null,
    inputDisplay: input ? input.display : null,
    textareaDisplay: area ? area.display : null,
    buttonDisplay: btn ? btn.display : null,
    skipHref: skip ? skip.getAttribute('href') : null,
    mainId: q('#main') ? 'main' : null,
    h1: document.querySelectorAll('h1').length,
    noscriptFallback: !!note
      && note.textContent.indexOf('95357') >= 0
      && !!note.querySelector('a[href^="mailto:"]')
      && !!note.querySelector('a[href^="tel:"]')
  });
})()""")
        check("nojs", "no-JS state read back",
              bool(state) and state.startswith("{"),
              state or "evaluate returned nothing")
        if state and state.startswith("{"):
            s = json.loads(state)
            check("nojs", "scripts really are disabled", s.get("jsOff") is True,
                  str(s.get("jsOff")))
            check("nojs", "noscript link parsed as a real element",
                  s.get("noscriptHref") == "css/noscript.css",
                  str(s.get("noscriptHref")))
            check("nojs", "content visible without JavaScript",
                  s.get("revealOpacity") == "1", str(s.get("revealOpacity")))
            check("nojs", "dead form fields hidden without JavaScript",
                  s.get("inputDisplay") == "none"
                  and s.get("textareaDisplay") == "none"
                  and s.get("buttonDisplay") == "none",
                  "%s/%s/%s" % (s.get("inputDisplay"),
                                s.get("textareaDisplay"),
                                s.get("buttonDisplay")))
            check("nojs", "skip link present without JavaScript",
                  s.get("skipHref") == "#main", str(s.get("skipHref")))
            check("nojs", "main landmark and single h1 without JavaScript",
                  s.get("mainId") == "main" and s.get("h1") == 1,
                  "main=%s h1=%s" % (s.get("mainId"), s.get("h1")))
            check("nojs", "phone/email fallback offered without JavaScript",
                  s.get("noscriptFallback") is True, str(s.get("noscriptFallback")))
        # the fallback stylesheet must actually load under the real CSP
        failed = [e["params"] for e in browser.events
                  if e.get("method") == "Network.loadingFailed"
                  and not e["params"].get("canceled")]
        css_blocked = [f for f in failed
                       if "noscript.css" in str(f.get("blockedReason", "")) or
                       f.get("errorText") in ("net::ERR_BLOCKED_BY_CLIENT",
                                              "net::ERR_BLOCKED_BY_RESPONSE")]
        check("nojs", "no request blocked by CSP in no-JS mode",
              not css_blocked, str(css_blocked[:1]) or None)
        check("nojs", "no failed requests in no-JS mode", not failed,
              "; ".join(f.get("errorText", "?") for f in failed[:3]) or None)
    finally:
        browser.close()
        shutil.rmtree(nojs_profile, ignore_errors=True)

    print("\n== all pages load cleanly ==")
    for page in ["index.html", "privacy.html", "terms.html"]:
        dom, err = chrome_dump(chrome, "%s/%s" % (base, page), profile, budget=8000)
        check("pages", "%s rendered" % page, "<main" in dom and "</html>" in dom)
        check("pages", "%s has a skip link" % page, 'class="skip-link"' in dom)
        assert_no_browser_errors(err, "/" + page)


def main():
    chrome = find_chrome()
    if not chrome:
        print("FAIL: no Chrome/Chromium found; cannot run browser tests.")
        return 1

    print("Sai site test suite")
    print("root : %s" % ROOT)
    print("chrome: %s" % chrome)

    static_checks()

    server, port = start_server()
    profile = tempfile.mkdtemp(prefix="sai-test-profile-")
    try:
        header_checks(port)
        behaviour_checks(chrome, profile, port)
    finally:
        server.shutdown()
        shutil.rmtree(profile, ignore_errors=True)

    passed = sum(1 for r in results if r["pass"])
    failed = [r for r in results if not r["pass"]]
    print("\n" + "=" * 64)
    print("TOTAL %d   PASSED %d   FAILED %d" % (len(results), passed, len(failed)))
    if failed:
        print("\nFailures:")
        for r in failed:
            print("  - [%s] %s  %s" % (r["group"], r["name"], r.get("detail") or ""))
    print("=" * 64)
    return 1 if failed else 0


if __name__ == "__main__":
    sys.exit(main())
