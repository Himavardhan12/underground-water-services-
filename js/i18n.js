/* =========================================================
   Sai Underground Water Services: language engine
   ---------------------------------------------------------
   - English lives here and is the source of truth.
   - Other languages register themselves from js/lang-*.js
     through window.SaiI18n.register(code, map).
   - Elements opt in with data-i18n (textContent),
     data-i18n-html (innerHTML, for strings with markup) and
     data-i18n-attrs="attr:key,attr:key" (attributes).
   - The choice is stored in localStorage and applied to
     <html lang>, which is what makes the right font and
     glyph shaping kick in.
   ========================================================= */

(function () {
  "use strict";

  var STORE_KEY = "sai-lang";
  var SUPPORTED = ["en", "kn", "hi", "te", "ta"];

  var LANGS = [
    { code: "en", name: "English", native: "English" },
    { code: "kn", name: "Kannada", native: "ಕನ್ನಡ" },
    { code: "hi", name: "Hindi", native: "हिन्दी" },
    { code: "te", name: "Telugu", native: "తెలుగు" },
    { code: "ta", name: "Tamil", native: "தமிழ்" },
  ];

  var dicts = {
    en: {
      /* ---------- document head ---------- */
      "meta.title.index": "Sai Underground Water Services | Borewell Drilling, Bengaluru",
      "meta.desc.index":
        "Hi-tech borewell drilling, borewell scanning and pumpset installation in Bengaluru. Underground water services by Sai Underground Water Services. Call 9535750539.",
      "meta.title.privacy": "Privacy Policy | Sai Underground Water Services",
      "meta.desc.privacy":
        "How Sai Underground Water Services collects, uses and protects your information when you call, email or use this website.",
      "meta.title.terms": "Terms and Conditions | Sai Underground Water Services",
      "meta.desc.terms":
        "Terms that apply when you use this website or engage Sai Underground Water Services for borewell drilling, scanning or pumpset work in Bengaluru.",

      /* ---------- navigation ---------- */
      "nav.brandAria": "Sai Underground Water Services home",
      "nav.tagline": "Borewells · Scanning · Pumpsets",
      "nav.primary": "Primary",
      "nav.home": "Home",
      "nav.services": "Services",
      "nav.about": "About",
      "nav.gallery": "Gallery",
      "nav.contact": "Contact",
      "nav.callFull": "Call 95357 50539",
      "nav.menuOpen": "Open menu",
      "nav.menuClose": "Close menu",
      "lang.menuLabel": "Language",
      "lang.changeAria": "Change language",

      /* ---------- hero / journey ---------- */
      "scene.label": "The journey of a borewell",
      "hero.eyebrow": "Underground Water Services · Bengaluru",
      "hero.h1a": "Borewell drilling,",
      "hero.h1b": "scanning & pumpsets.",
      "hero.lede":
        "Hi-tech borewell drilling, precision borewell scanning and complete pumpset installation across Bengaluru, handled end to end by one accountable team.",
      "cta.callNumber": "Call 95357 50539",
      "cta.freeVisit": "Get a free site visit",
      "cta.callNow": "Call now",
      "cta.emailUs": "Email us",
      "depth.unit": "m",
      "hint.scroll": "Scroll to drill",

      /* ---------- service captions ---------- */
      "step1.num": "Layer 2 · 01/04",
      "step1.title": "Hi-Tech Borewell Drilling",
      "step1.body":
        "Pneumatic and rotary rigs for any terrain: homes, farms, apartments and industries. Precise casing, controlled depth, clean site handover.",
      "step2.num": "Layer 3 · 02/04",
      "step2.title": "Borewell Scanning",
      "step2.body":
        "Digital borehole logging and CCTV inspection that reports true depth, strata changes, blockages and casing condition, so money is spent with information rather than hope.",
      "step3.num": "Layer 4 · 03/04",
      "step3.title": "Pumpset Installation",
      "step3.body":
        "Submersible and open-well pump installation with correct height setting, pipe alignment, wiring and commissioning, completed once and completed correctly.",
      "step4.num": "Water · 04/04",
      "step4.title": "Underground Water Services",
      "step4.body":
        "Site survey, water source assessment, flushing, compressor work and annual maintenance to keep your borewell working long after drilling day.",

      /* ---------- about ---------- */
      "about.eyebrow": "Why choose us",
      "about.h2a": "Modern machines.",
      "about.h2b": "Honest assessment.",
      "about.p1":
        "Bengaluru's ground is unpredictable: a few feet of soil can give way to hard granite. We combine heavyweight drilling rigs with digital scanning so you know what is beneath your site before, during and after the bore.",
      "about.p2":
        "Every job is supervised, every depth is logged, and every recommendation is backed by data rather than promises.",
      "about.cta": "Talk to our team",
      "feat1.t": "Hi-tech equipment",
      "feat1.d": "Modern pneumatic rigs, digital loggers and CCTV probes.",
      "feat2.t": "Depth & strata logged",
      "feat2.d": "Logged layer-by-layer, so you can plan the pump correctly.",
      "feat3.t": "Clean, safe sites",
      "feat3.d": "Marked work zones, managed spoil and a tidy handover.",
      "feat4.t": "Single-point service",
      "feat4.d": "Drilling, scanning, pumpset and follow-up from one accountable team.",

      /* ---------- gallery ---------- */
      "gallery.eyebrow": "Gallery",
      "gallery.h2": "Our work on site",
      "gallery.sub": "Rigs, rock, drilling and finished borewells from the field.",
      "gallery.cap1": "Drilling rig on site",
      "gallery.cap2": "Water from a new borewell",
      "gallery.cap3": "Our drilling fleet",
      "gallery.alt1": "Truck-mounted borewell drilling rig working at a construction site",
      "gallery.alt2": "Water gushing high into the air from a freshly drilled borewell",
      "gallery.alt3": "Our fleet of truck-mounted borewell drilling rigs",
      "gallery.phMissing": "Photo coming soon",

      /* ---------- contact ---------- */
      "contact.eyebrow": "Get in touch",
      "contact.h2": "Book a free site visit",
      "contact.sub": "Tell us your location and we will survey the site and share honest options.",
      "contact.callH3": "Call us",
      "contact.hours": "Mon to Sat, 7:00 AM to 8:00 PM",
      "contact.emailH3": "Email",
      "contact.emailNote": "Send plans or site photos for a quick estimate.",
      "contact.writeUs": "Write to us",
      "contact.visitH3": "Visit",
      "contact.maps": "Open in Maps",

      /* ---------- enquiry form ---------- */
      "form.h3": "Send us an enquiry",
      "form.nameLabel": "Name",
      "form.namePh": "Your name",
      "form.phoneLabel": "Phone",
      "form.phonePh": "Your phone number",
      "form.msgLabel": "Site location / message",
      "form.msgPh": "Locality, plot size, what you need…",
      "form.hint":
        "Opens WhatsApp with your details pre-filled, so the message reaches us directly. This website does not store what you type.",
      "form.submit": "Send on WhatsApp",
      "form.err": "Please add your name and a valid phone number.",
      "form.opening":
        "Opening WhatsApp with your enquiry. If it does not open, call 95357 50539 or email saihimavardhan001@gmail.com.",

      /* ---------- footer / lightbox ---------- */
      "footer.tag": "Borewell drilling · Borewell scanning · Pumpset installation · Bengaluru",
      "footer.aria": "Footer",
      "footer.privacy": "Privacy policy",
      "footer.terms": "Terms and conditions",
      "footer.copy": "Sai Underground Water Services. All rights reserved.",
      "ui.lightbox": "Gallery image",
      "ui.close": "Close",

      /* ---------- privacy policy ---------- */
      "legal.eyebrow": "Legal",
      "legal.updated": "Last updated: 7 November 2026",
      "legal.onThisPage": "On this page",
      "privacy.h1": "Privacy policy",
      "privacy.sub": "What we collect when you contact us, why we collect it, and what we do with it.",
      "privacy.nav1": "Information we collect",
      "privacy.nav2": "How we use it",
      "privacy.nav3": "Cookies and tracking",
      "privacy.nav4": "Sharing and storage",
      "privacy.nav5": "Your rights",
      "privacy.nav6": "Changes to this policy",
      "privacy.nav7": "Contact us",
      "privacy.callout":
        "<strong>In short:</strong> we only receive the details you choose to give us, such as your phone number, email and site location. We use them to answer your enquiry and carry out borewell work. We do not sell your information, and this website does not run analytics or advertising trackers.",
      "privacy.h2a": "Information we collect",
      "privacy.p1":
        "Sai Underground Water Services provides borewell drilling, borewell scanning and pumpset installation in Bengaluru. When you contact us through this website, by phone, by email or on WhatsApp, we may collect:",
      "privacy.li1": "Your name",
      "privacy.li2": "Your phone number and email address, if you provide them",
      "privacy.li3": "Your site address, locality or plot details",
      "privacy.li4": "Any photographs or documents you send about your site",
      "privacy.p2":
        "This website has no accounts and no payment section. There is nothing to sign up for and no personal profile is created.",
      "privacy.p3":
        "<strong>About the enquiry form:</strong> the form in the contact section runs in your browser. When you send it, your enquiry opens in WhatsApp with your details already filled in, and nothing leaves this website until you press send there. If WhatsApp does not open, call or email us instead.",
      "privacy.h2b": "How we use your information",
      "privacy.p4": "We use what you tell us only to:",
      "privacy.li5": "Respond to your enquiry and answer your questions",
      "privacy.li6": "Arrange a site visit or survey at a time that suits you",
      "privacy.li7": "Provide an estimate and carry out drilling, scanning or pumpset work you agree to",
      "privacy.li8": "Keep a record of work done and depths logged on your site",
      "privacy.li9": "Meet legal and record-keeping obligations",
      "privacy.p5": "We do not use your details for unrelated marketing, and we do not build advertising profiles from them.",
      "privacy.h2c": "Cookies and tracking",
      "privacy.p6":
        "This website does not set cookies of its own. There is no advertising code, no remarketing pixel and no analytics script installed on this site.",
      "privacy.p7": "Some third parties may receive basic technical information when your browser connects to them:",
      "privacy.li10":
        "<strong>Google Fonts</strong> provides the typefaces used on this site, so your browser requests those files directly from Google.",
      "privacy.li11":
        "<strong>Google Maps</strong> and <strong>WhatsApp</strong> are linked from the contact section. Opening them takes you to those services, where their own privacy policies apply.",
      "privacy.h2d": "Sharing and storage",
      "privacy.p8": "We do not sell, rent or trade your personal information.",
      "privacy.p9":
        "We share it only where it is needed to do the work you asked for, for example with our own crew or with a service provider helping us reach you, or where the law requires us to disclose it.",
      "privacy.p10":
        "We keep enquiry details only for as long as they remain useful for the enquiry or the work carried out, and delete them when they are no longer needed or when you ask us to.",
      "privacy.h2e": "Your rights",
      "privacy.p11": "You can ask us at any time:",
      "privacy.li12": "What information we hold about you",
      "privacy.li13": "To correct anything that is wrong",
      "privacy.li14": "To delete your information, where we are not required to keep it",
      "privacy.li15": "To stop contacting you",
      "privacy.p12":
        'Write to <a href="mailto:saihimavardhan001@gmail.com">saihimavardhan001@gmail.com</a> or call <a href="tel:+919535750539">95357 50539</a> and we will respond as soon as we can.',
      "privacy.p13":
        "We take reasonable steps to protect the information we hold. No method of sending or storing data over the internet is completely secure, so please avoid sending sensitive documents you do not need to share.",
      "privacy.h2f": "Changes to this policy",
      "privacy.p14":
        "We may update this policy when how the website or our services change. The date at the top of this page always shows when it was last updated. Continued use of this website after an update means you accept the revised policy.",
      "privacy.h2g": "Contact us",
      "privacy.contact1":
        'Phone: <a href="tel:+919535750539">95357 50539</a><br> Email: <a href="mailto:saihimavardhan001@gmail.com">saihimavardhan001@gmail.com</a>',
      "privacy.p15":
        "Questions about this policy are welcome. Contact us before you send any information you are unsure about sharing.",

      /* ---------- terms and conditions ---------- */
      "terms.h1": "Terms and conditions",
      "terms.sub": "The terms that apply when you use this website or engage us for borewell work.",
      "terms.nav1": "Using this website",
      "terms.nav2": "Our services",
      "terms.nav3": "Quotes and site visits",
      "terms.nav4": "Water and scanning",
      "terms.nav5": "Your site and permissions",
      "terms.nav6": "Content and images",
      "terms.nav7": "Liability",
      "terms.nav8": "Governing law",
      "terms.nav9": "Contact",
      "terms.callout":
        "<strong>Please read this first:</strong> by using this website or engaging us for work, you agree to these terms. If you do not agree, please do not use the site. Nothing on this website is a binding quotation or a guarantee of results.",
      "terms.h2a": "Using this website",
      "terms.p1":
        "This website is published by Sai Underground Water Services to describe our borewell drilling, borewell scanning and pumpset installation services in Bengaluru.",
      "terms.p2":
        "You may browse the site and contact us for genuine enquiries. You must not attempt to interfere with the site, misuse its content, or use it for unlawful purposes.",
      "terms.p3":
        "We aim to keep the information accurate and current, but we do not promise that every page is free of errors or available at all times.",
      "terms.h2b": "Our services",
      "terms.p4": "We provide:",
      "terms.li1": "Hi-tech borewell drilling, including rebore and deepening work",
      "terms.li2": "Borewell scanning, digital depth logging and CCTV inspection",
      "terms.li3": "Submersible and open-well pumpset installation",
      "terms.li4": "Related work such as site survey, flushing, compressor work and maintenance",
      "terms.p5":
        "Work is confirmed only when you and we agree on the scope, timing and price directly, by phone or in person. A website enquiry, a form confirmation or an initial estimate does not by itself create a booking.",
      "terms.h2c": "Quotes and site visits",
      "terms.p6":
        "Estimates are prepared from information available at the time, including the site location, ground conditions and the depth involved. Ground conditions vary considerably in Bengaluru, so a final price may change once the site has been surveyed or the strata is met during drilling.",
      "terms.p7":
        "We will tell you before any change in scope that affects the agreed price, and work continues only with your approval.",
      "terms.h2d": "Water and scanning",
      "terms.calloutWater":
        "<strong>Scanning does not guarantee water.</strong> A scan or survey reports what can be observed in the borehole at the time, such as depth, strata and casing condition. It cannot promise that water will be found, or what the yield will be.",
      "terms.p8":
        "Water availability, depth and yield depend on ground conditions outside anyone's control. No drilling, scanning or pumping service can guarantee a water source, a particular yield or the long-term performance of a borewell.",
      "terms.p9":
        "Where we share a recommendation, it is based on the information available at the time and is given as our professional opinion, not as a promise of results.",
      "terms.h2e": "Your site and permissions",
      "terms.p10":
        "You confirm that you have the right to carry out work at the site address you give us, and that you hold any permissions, approvals or consents required for borewell work where the law requires them, unless we have agreed to arrange them for you.",
      "terms.p11":
        "Please give our crew safe access to the site, a clear working area and details of underground lines such as cables, water supply or drainage before drilling starts. Delays caused by conditions we were not told about may affect timing and cost.",
      "terms.h2f": "Content and images",
      "terms.p12":
        "The text, logo, illustrations and layout of this website belong to Sai Underground Water Services or are used with permission. You may not copy or republish them for commercial purposes without our written consent.",
      "terms.p13":
        "Photographs used in the gallery show our own work sites or are used with permission. They are provided as a record of the type of work we do.",
      "terms.p14":
        "Links to Google Maps, WhatsApp or any other service are provided for convenience. Those services operate under their own terms and privacy policies, which we do not control.",
      "terms.h2g": "Liability",
      "terms.p15":
        "We carry out work with reasonable care and skill. If something we did is not right, please tell us promptly and we will look at it and, where the issue is ours, put it right.",
      "terms.p16":
        "To the extent permitted by law, we are not responsible for indirect or consequential loss arising from use of this website, including loss of data or interruption of access. Nothing in these terms limits liability that cannot legally be limited.",
      "terms.p17":
        "Any dispute about work carried out will first be handled directly between you and us so it can be resolved quickly.",
      "terms.h2h": "Governing law",
      "terms.p18":
        "These terms are governed by the laws of India, and any matter arising from them falls under the courts in Bengaluru, Karnataka. If part of these terms is found to be unenforceable, the rest continues to apply.",
      "terms.h2i": "Changes to these terms",
      "terms.p19":
        "We may update these terms as the website or our services change. The date at the top of this page shows when they were last updated. Continued use of the website after an update means you accept the revised terms.",
      "terms.h2j": "Contact",
      "terms.contact":
        'Phone: <a href="tel:+919535750539">95357 50539</a><br> Email: <a href="mailto:saihimavardhan001@gmail.com">saihimavardhan001@gmail.com</a>',
      "terms.p20": "Questions about these terms are welcome. Please ask before placing an order if anything here is unclear.",
    },
  };

  var current = "en";
  var ready = false;

  function owns(map, key) {
    return Object.prototype.hasOwnProperty.call(map, key);
  }

  function t(key) {
    var d = dicts[current];
    if (d && owns(d, key)) return d[key];
    if (owns(dicts.en, key)) return dicts.en[key];
    return key;
  }

  function has(key) {
    return owns(dicts.en, key) || (dicts[current] && owns(dicts[current], key));
  }

  /* ---------- language switcher ---------- */
  var menuEl = null;
  var btnEl = null;
  var itemEls = [];

  function currentLabel() {
    for (var i = 0; i < LANGS.length; i++) {
      if (LANGS[i].code === current) return LANGS[i].native;
    }
    return "English";
  }

  function syncSwitcher() {
    var cur = document.getElementById("langCur");
    if (cur) cur.textContent = currentLabel();
    for (var i = 0; i < itemEls.length; i++) {
      itemEls[i].setAttribute("aria-checked", itemEls[i].getAttribute("data-lang") === current ? "true" : "false");
    }
    /* the visible label is the language's own name, so the accessible
       name starts with it and then says what the control does */
    if (btnEl) {
      var name = currentLabel();
      btnEl.setAttribute("aria-label", name + " — " + t("lang.changeAria"));
      btnEl.setAttribute("title", name + " — " + t("lang.changeAria"));
    }
  }

  function closeMenu(returnFocus) {
    if (!menuEl || menuEl.hidden) return;
    menuEl.hidden = true;
    if (btnEl) {
      btnEl.setAttribute("aria-expanded", "false");
      if (returnFocus) btnEl.focus();
    }
  }

  function openMenu() {
    if (!menuEl) return;
    menuEl.hidden = false;
    if (btnEl) btnEl.setAttribute("aria-expanded", "true");
    var target = itemEls[0];
    for (var i = 0; i < itemEls.length; i++) {
      if (itemEls[i].getAttribute("data-lang") === current) {
        target = itemEls[i];
        break;
      }
    }
    if (target) target.focus();
  }

  function buildSwitcher() {
    btnEl = document.getElementById("langBtn");
    menuEl = document.getElementById("langMenu");
    if (!btnEl || !menuEl) return;

    for (var i = 0; i < LANGS.length; i++) {
      (function (L) {
        var item = document.createElement("button");
        item.type = "button";
        item.setAttribute("role", "menuitemradio");
        item.setAttribute("data-lang", L.code);
        item.setAttribute("aria-checked", L.code === current ? "true" : "false");

        var native = document.createElement("span");
        native.className = "lang-native";
        native.textContent = L.native;
        item.appendChild(native);

        /* English shows the same word twice, so only add the gloss
           when the endonym actually differs from the English name */
        if (L.native !== L.name) {
          var gloss = document.createElement("span");
          gloss.className = "lang-gloss";
          gloss.textContent = L.name;
          item.appendChild(gloss);
        }

        item.addEventListener("click", function () {
          setLanguage(L.code);
          closeMenu(true);
        });
        menuEl.appendChild(item);
        itemEls.push(item);
      })(LANGS[i]);
    }

    btnEl.addEventListener("click", function () {
      if (menuEl.hidden) openMenu();
      else closeMenu(false);
    });

    /* click outside closes */
    document.addEventListener(
      "click",
      function (e) {
        if (menuEl.hidden) return;
        var node = e.target;
        while (node) {
          if (node === menuEl || node === btnEl) return;
          node = node.parentNode;
        }
        closeMenu(false);
      },
      true
    );

    /* keyboard: arrows move, Escape closes, Tab lets focus leave */
    document.addEventListener("keydown", function (e) {
      if (menuEl.hidden) return;
      var idx = itemEls.indexOf(document.activeElement);
      if (e.key === "Escape") {
        e.preventDefault();
        closeMenu(true);
      } else if (e.key === "ArrowDown" || e.key === "ArrowUp") {
        e.preventDefault();
        var next =
          e.key === "ArrowDown"
            ? (idx + 1 + itemEls.length) % itemEls.length
            : (idx - 1 + itemEls.length) % itemEls.length;
        if (idx === -1) next = 0;
        itemEls[next].focus();
      } else if (e.key === "Home") {
        e.preventDefault();
        itemEls[0].focus();
      } else if (e.key === "End") {
        e.preventDefault();
        itemEls[itemEls.length - 1].focus();
      } else if (e.key === "Tab") {
        closeMenu(false);
      }
    });
  }

  /* ---------- apply ---------- */
  function applyAttrs(el) {
    var spec = el.getAttribute("data-i18n-attrs");
    if (!spec) return;
    var pairs = spec.split(",");
    for (var i = 0; i < pairs.length; i++) {
      var at = pairs[i].indexOf(":");
      if (at < 0) continue;
      var name = pairs[i].slice(0, at).trim();
      var key = pairs[i].slice(at + 1).trim();
      if (name && key && has(key)) el.setAttribute(name, t(key));
    }
  }

  function applyLanguage(code) {
    current = SUPPORTED.indexOf(code) >= 0 ? code : "en";

    var els = document.querySelectorAll("[data-i18n]");
    for (var i = 0; i < els.length; i++) {
      var key = els[i].getAttribute("data-i18n");
      if (has(key)) els[i].textContent = t(key);
    }

    els = document.querySelectorAll("[data-i18n-html]");
    for (i = 0; i < els.length; i++) {
      key = els[i].getAttribute("data-i18n-html");
      if (has(key)) els[i].innerHTML = t(key);
    }

    els = document.querySelectorAll("[data-i18n-attrs]");
    for (i = 0; i < els.length; i++) applyAttrs(els[i]);

    document.documentElement.setAttribute("lang", current);
    syncSwitcher();

    try {
      window.localStorage.setItem(STORE_KEY, current);
    } catch (err) {
      /* private mode: the choice simply does not persist */
    }

    document.dispatchEvent(
      new CustomEvent("sai:langchange", { detail: { lang: current } })
    );
  }

  function setLanguage(code) {
    if (SUPPORTED.indexOf(code) < 0) return;
    if (code === current && ready) return;
    applyLanguage(code);
  }

  /* ---------- boot ---------- */
  function init() {
    if (ready) return;
    ready = true;

    var saved = null;
    try {
      saved = window.localStorage.getItem(STORE_KEY);
    } catch (err) {
      saved = null;
    }

    buildSwitcher();
    applyLanguage(saved && SUPPORTED.indexOf(saved) >= 0 ? saved : "en");
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
  /* safety net: never leave the page in English-only state */
  window.addEventListener("load", init);

  window.SaiI18n = {
    register: function (code, map) {
      if (!code || !map) return;
      dicts[code] = map;
      if (ready && current === code) applyLanguage(code);
    },
    t: t,
    set: setLanguage,
    get: function () {
      return current;
    },
    languages: LANGS,
    keys: function () {
      return Object.keys(dicts.en);
    },
  };
})();
