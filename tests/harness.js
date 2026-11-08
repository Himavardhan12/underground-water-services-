/* Loads the real index.html in a same-origin iframe and exercises the
   production code paths: form validation, language switching, the skip
   link and document structure. Results are written into <pre id="results">
   so a headless browser dump can read them. */
(function () {
  "use strict";

  var out = [];
  function ok(name, cond, detail) {
    out.push({ name: name, pass: !!cond, detail: detail === undefined ? null : detail });
  }

  function finish() {
    var pre = document.getElementById("results");
    pre.textContent = JSON.stringify({ total: out.length, results: out }, null, 2);
    document.title = "DONE";
  }

  var frame = document.getElementById("page");

  frame.addEventListener("load", function () {
    var w = frame.contentWindow;
    var d = frame.contentDocument;
    setTimeout(function () {
      try {
        run(w, d);
      } catch (e) {
        ok("harness threw", false, String(e && e.stack || e));
      }
      finish();
    }, 600);
  });

  function run(w, d) {
    /* ---- document structure ---- */
    var body = d.body;
    var first = body.firstElementChild;
    ok("skip link is first element in body",
       first && first.classList.contains("skip-link"),
       first ? first.className : "none");
    ok("skip link points at #main",
       first && first.getAttribute("href") === "#main");
    var main = d.getElementById("main");
    ok("main landmark has id=main", !!main);
    ok("skip link target exists", !!d.querySelector("#main"));

    /* ---- no inline style/script when JS is on ---- */
    ok("no inline <style> in head",
       d.head.querySelectorAll("style").length === 0,
       d.head.querySelectorAll("style").length);
    ok("no inline <script> in head",
       d.head.querySelectorAll("script:not([type])").length === 0);

    /* ---- noscript fallback files are wired up ----
       With scripting enabled the browser parses <noscript> contents
       as text rather than elements, so the link inside it can only
       be read from textContent. */
    var noscript = d.querySelector("head noscript");
    var nsText = noscript ? noscript.textContent : "";
    ok("noscript links css/noscript.css", /css\/noscript\.css/.test(nsText),
       noscript ? nsText.replace(/\s+/g, " ").trim().slice(0, 90) : "missing");

    /* ---- external resources ---- */
    var links = Array.prototype.slice.call(d.querySelectorAll("link[rel=stylesheet]"));
    var external = links.filter(function (l) {
      return /^https?:/.test(l.getAttribute("href") || "");
    });
    ok("only Google Fonts is an external stylesheet",
       external.length === 1 && /fonts\.googleapis\.com/.test(external[0].href),
       external.map(function (l) { return l.href; }).join(","));

    /* ---- required contact details present ---- */
    ok("tel link present", !!d.querySelector('a[href^="tel:+919535750539"]'));
    ok("whatsapp link present", !!d.querySelector('a[href^="https://wa.me/919535750539"]'));
    ok("mailto link present", !!d.querySelector('a[href^="mailto:saihimavardhan001@gmail.com"]'));

    /* ---- heading order ---- */
    var hs = Array.prototype.slice.call(d.querySelectorAll("h1,h2,h3,h4,h5,h6"))
      .map(function (h) { return +h.tagName.charAt(1); });
    var skips = [];
    for (var i = 1; i < hs.length; i++) if (hs[i] - hs[i - 1] > 1) skips.push(hs[i - 1] + "->" + hs[i]);
    ok("exactly one h1", hs.filter(function (n) { return n === 1; }).length === 1);
    ok("no heading level skips", skips.length === 0, skips.join(","));

    /* ---- language engine ---- */
    var i18n = w.SaiI18n;
    ok("language engine loaded", !!i18n && typeof i18n.t === "function");
    ok("5 languages registered",
       i18n && i18n.languages && i18n.languages.length === 5,
       i18n ? JSON.stringify(i18n.languages.map(function (l) { return l.code; })) : "none");
    ok("skip link has a translation key",
       d.querySelector(".skip-link").getAttribute("data-i18n") === "ui.skip");
    ok("ui.skip resolves in English", i18n && i18n.t("ui.skip") === "Skip to main content",
       i18n ? i18n.t("ui.skip") : "no i18n");

    /* switch to Kannada and back through the real UI */
    var btn = d.getElementById("langBtn");
    ok("language button exists", !!btn);
    if (btn) {
      btn.click();
      var item = d.querySelector('#langMenu [data-lang="kn"]');
      ok("kannada option exists", !!item);
      if (item) item.click();
      ok("html lang switched to kn",
         d.documentElement.getAttribute("lang") === "kn",
         d.documentElement.getAttribute("lang"));
      ok("ui.skip translated to kannada",
         i18n.t("ui.skip") === "ಮುಖ್ಯ ವಿಷಯಕ್ಕೆ ಹೋಗಿ",
         i18n.t("ui.skip"));
      ok("skip link text actually changed",
         d.querySelector(".skip-link").textContent === "ಮುಖ್ಯ ವಿಷಯಕ್ಕೆ ಹೋಗಿ",
         d.querySelector(".skip-link").textContent);
      var hero = d.querySelector(".hero-copy h1");
      ok("hero heading changed language",
         /ಬೋರ್|ಡ್ರಿಲ್/.test(hero.textContent),
         hero.textContent.slice(0, 60));

      /* back to English so the form assertions run on English strings */
      btn.click();
      var en = d.querySelector('#langMenu [data-lang="en"]');
      if (en) en.click();
      ok("back to english",
         d.documentElement.getAttribute("lang") === "en",
         d.documentElement.getAttribute("lang"));
    }

    /* ---- form validation (real production handler) ---- */
    var form = d.getElementById("enquiry");
    var note = d.getElementById("fNote");
    ok("enquiry form exists", !!form && !!note);

    if (form && note) {
      /* never let the success path navigate the iframe away */
      w.open = function () { return {}; };

      var name = form.querySelector('input[name="name"]');
      var phone = form.querySelector('input[name="phone"]');

      /* 1. empty name must be rejected */
      name.value = "";
      phone.value = "9845012345";
      note.classList.remove("error");
      note.textContent = "";
      form.dispatchEvent(new w.Event("submit", { bubbles: true, cancelable: true }));
      ok("empty name rejected", note.classList.contains("error"),
         note.textContent);
      ok("empty name keeps an error message", note.textContent.length > 0);

      /* 2. too-short phone must be rejected */
      name.value = "Ravi";
      phone.value = "123";
      note.classList.remove("error");
      note.textContent = "";
      form.dispatchEvent(new w.Event("submit", { bubbles: true, cancelable: true }));
      ok("short phone rejected", note.classList.contains("error"),
         note.textContent);

      /* 3. valid details must be accepted */
      name.value = "Ravi";
      phone.value = "98450 12345";
      note.classList.remove("error");
      note.textContent = "";
      form.dispatchEvent(new w.Event("submit", { bubbles: true, cancelable: true }));
      ok("valid details accepted", !note.classList.contains("error"),
         note.textContent);
      ok("valid details produce a confirmation", note.textContent.length > 0,
         note.textContent);
      ok("form reset after success", name.value === "" && phone.value === "",
         name.value + "/" + phone.value);

      /* 4. a phone made of letters only must be rejected */
      name.value = "Ravi";
      phone.value = "callme";
      note.classList.remove("error");
      note.textContent = "";
      form.dispatchEvent(new w.Event("submit", { bubbles: true, cancelable: true }));
      ok("non-numeric phone rejected", note.classList.contains("error"),
         note.textContent);
    }
  }
})();
