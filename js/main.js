/* =========================================================
   Sai Underground Water Services — site interactions
   · scroll progress bar
   · nav state + section spotlight
   · mobile drawer
   · reveal on scroll
   · gallery missing-photo fallback + lightbox
   · enquiry form → WhatsApp
   ========================================================= */
(function () {
  "use strict";

  const root = document.documentElement;
  const reducedQ = window.matchMedia("(prefers-reduced-motion: reduce)");
  const isReduced = reducedQ.matches;
  root.classList.toggle("reduced", isReduced);

  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const progressBar = document.getElementById("progressBar");
  const nav = document.getElementById("nav");

  /* =========================================================
     NAV STATE · PROGRESS · SECTION SPOTLIGHT
     ========================================================= */
  const SPOTLIGHT_IDS = ["home", "services", "about", "gallery", "contact"];
  const spotlightSections = SPOTLIGHT_IDS
    .map((id) => document.getElementById(id))
    .filter(Boolean);
  const spotlightLinks = Array.from(
    document.querySelectorAll('.nav-links a[href^="#"], .nav-drawer a[href^="#"]')
  );
  let spotlightId = null;

  function updateSpotlight() {
    if (!spotlightSections.length) return;
    const mark = window.innerHeight * 0.34;
    let current = spotlightSections[0];
    for (let i = 0; i < spotlightSections.length; i++) {
      if (spotlightSections[i].getBoundingClientRect().top <= mark) {
        current = spotlightSections[i];
      }
    }
    if (current.id === spotlightId) return;
    spotlightId = current.id;
    spotlightLinks.forEach((a) => {
      const on = a.getAttribute("href") === "#" + spotlightId;
      a.classList.toggle("is-active", on);
      if (on) a.setAttribute("aria-current", "location");
      else a.removeAttribute("aria-current");
    });
  }

  function updateUI() {
    if (progressBar) {
      const max = document.documentElement.scrollHeight - window.innerHeight;
      const gp = max > 0 ? clamp(window.scrollY / max, 0, 1) : 0;
      progressBar.style.transform = "scaleX(" + gp.toFixed(4) + ")";
    }
    if (nav) nav.classList.toggle("is-scrolled", window.scrollY > 24);
    updateSpotlight();
  }

  window.addEventListener("scroll", updateUI, { passive: true });
  window.addEventListener("resize", updateUI);
  updateUI();

  /* =========================================================
     MOBILE DRAWER
     ========================================================= */
  const burger = document.getElementById("navBurger");
  const drawer = document.getElementById("navDrawer");

  function closeDrawer() {
    if (!drawer) return;
    drawer.classList.remove("open");
    if (burger) {
      burger.setAttribute("aria-expanded", "false");
      burger.setAttribute("aria-label", "Open menu");
    }
  }

  if (burger && drawer) {
    burger.addEventListener("click", () => {
      const open = drawer.classList.toggle("open");
      burger.setAttribute("aria-expanded", String(open));
      burger.setAttribute("aria-label", open ? "Close menu" : "Open menu");
    });
    drawer.querySelectorAll("a").forEach((a) => a.addEventListener("click", closeDrawer));
    window.addEventListener("keydown", (e) => {
      if (e.key === "Escape") closeDrawer();
    });
    window.addEventListener("resize", () => {
      if (window.innerWidth > 900) closeDrawer();
    });
  }

  /* =========================================================
     REVEAL ON SCROLL
     ========================================================= */
  const revealEls = Array.from(document.querySelectorAll(".reveal"));
  let pendingReveal = revealEls.slice();

  function revealInView() {
    if (!pendingReveal.length) {
      stopRevealGuard();
      return;
    }
    const limit = window.innerHeight * 0.92;
    pendingReveal = pendingReveal.filter((el) => {
      if (el.getBoundingClientRect().top < limit) {
        el.classList.add("in");
        return false;
      }
      return true;
    });
    if (!pendingReveal.length) stopRevealGuard();
  }

  /* Fallback timer: keeps checking only while something is still
     hidden, so content can never stay invisible after a programmatic
     jump or a restored tab. Stops itself once everything is shown. */
  let revealGuard = null;

  function stopRevealGuard() {
    if (revealGuard) {
      clearInterval(revealGuard);
      revealGuard = null;
    }
  }

  if (isReduced) {
    revealEls.forEach((el) => el.classList.add("in"));
    pendingReveal = [];
  } else {
    if ("IntersectionObserver" in window) {
      const io = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              entry.target.classList.add("in");
              pendingReveal = pendingReveal.filter((el) => el !== entry.target);
              io.unobserve(entry.target);
            }
          });
        },
        { rootMargin: "0px 0px -8% 0px", threshold: 0 }
      );
      revealEls.forEach((el) => io.observe(el));
    }
    revealInView();
    window.addEventListener("scroll", revealInView, { passive: true });
    window.addEventListener("resize", revealInView);
    revealGuard = setInterval(revealInView, 400);
  }

  /* =========================================================
     GALLERY: missing-photo fallback + lightbox
     ========================================================= */
  const tiles = Array.from(document.querySelectorAll("#galleryGrid .tile"));
  const lightbox = document.getElementById("lightbox");
  const lbImg = document.getElementById("lbImg");
  const lbClose = document.getElementById("lbClose");
  let lastFocus = null;

  const PH_ICON =
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true">' +
    '<rect x="3" y="4" width="18" height="16" rx="3"/>' +
    '<circle cx="9" cy="10" r="2"/>' +
    '<path d="M4 18l5-5 4 4 3-3 4 4" stroke-linecap="round" stroke-linejoin="round"/></svg>';

  function markMissing(figure) {
    if (figure.classList.contains("is-missing")) return;
    figure.classList.add("is-missing");
    figure.removeAttribute("tabindex");
    const ph = document.createElement("div");
    ph.className = "ph";
    ph.innerHTML = PH_ICON + "<span>Photo coming soon</span>";
    figure.appendChild(ph);
  }

  tiles.forEach((figure) => {
    const img = figure.querySelector("img");
    if (!img) return;
    const check = () => {
      if (img.naturalWidth === 0 && img.complete) markMissing(figure);
    };
    img.addEventListener("error", () => markMissing(figure));
    img.addEventListener("load", () => {
      if (img.naturalWidth === 0) markMissing(figure);
    });
    check();

    figure.addEventListener("click", () => {
      if (figure.classList.contains("is-missing") || !img.naturalWidth) return;
      openLightbox(img.getAttribute("src"), img.getAttribute("alt") || "");
    });

    figure.addEventListener("keydown", (e) => {
      if (e.key !== "Enter" && e.key !== " ") return;
      if (figure.classList.contains("is-missing")) return;
      e.preventDefault();
      openLightbox(img.getAttribute("src"), img.getAttribute("alt") || "");
    });
  });

  function openLightbox(src, alt) {
    if (!lightbox || !src) return;
    lastFocus = document.activeElement;
    lbImg.setAttribute("src", src);
    lbImg.setAttribute("alt", alt);
    lightbox.hidden = false;
    requestAnimationFrame(() => lightbox.classList.add("open"));
    if (lbClose) lbClose.focus();
    document.body.style.overflow = "hidden";
  }

  function closeLightbox() {
    if (!lightbox || lightbox.hidden) return;
    lightbox.classList.remove("open");
    document.body.style.overflow = "";
    window.setTimeout(() => {
      lightbox.hidden = true;
      lbImg.setAttribute("src", "");
    }, 300);
    if (lastFocus && typeof lastFocus.focus === "function") lastFocus.focus();
  }

  if (lightbox) {
    lightbox.addEventListener("click", (e) => {
      if (e.target === lightbox) closeLightbox();
    });
    if (lbClose) lbClose.addEventListener("click", closeLightbox);
    window.addEventListener("keydown", (e) => {
      if (e.key === "Escape") closeLightbox();
    });
  }

  /* =========================================================
     ENQUIRY FORM → WHATSAPP
     ========================================================= */
  const form = document.getElementById("enquiry");
  const fNote = document.getElementById("fNote");

  if (form) {
    form.addEventListener("submit", (e) => {
      e.preventDefault();
      const data = new FormData(form);
      const name = String(data.get("name") || "").trim();
      const phone = String(data.get("phone") || "").trim();
      const message = String(data.get("message") || "").trim();
      const digits = phone.replace(/\D/g, "");

      if (!name || digits.length < 8) {
        fNote.textContent = "Please add your name and a valid phone number.";
        fNote.classList.add("error");
        return;
      }

      const lines = [
        "Borewell enquiry from " + name,
        "Phone: " + phone,
        message ? "Site / details: " + message : "",
      ].filter(Boolean);
      const wa =
        "https://wa.me/919535750539?text=" + encodeURIComponent(lines.join("\n"));

      const win = window.open(wa, "_blank", "noopener");
      if (!win) {
        window.location.href = wa;
      }

      fNote.classList.remove("error");
      fNote.textContent =
        "Opening WhatsApp with your enquiry. If it does not open, call 95357 50539 or email saihimavardhan001@gmail.com.";
      form.reset();
    });
  }

  /* =========================================================
     MISC
     ========================================================= */
  const yearEl = document.getElementById("year");
  if (yearEl) yearEl.textContent = String(new Date().getFullYear());
})();
