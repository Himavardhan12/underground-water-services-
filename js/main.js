/* =========================================================
   Sai Underground Water Services: site interactions
   Cinematic, scroll-linked borewell journey (vanilla JS)
   ========================================================= */

(function () {
  "use strict";

  /* ---------- helpers ---------- */
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const lerp = (a, b, t) => a + (b - a) * t;
  const smooth = (t) => t * t * (3 - 2 * t);
  const seg = (p, a, b) => clamp((p - a) / (b - a), 0, 1);
  const SVG_NS = "http://www.w3.org/2000/svg";

  const reducedQ = window.matchMedia("(prefers-reduced-motion: reduce)");
  const mobileQ = window.matchMedia("(max-width: 760px)");
  const root = document.documentElement;

  /* deterministic pseudo-random */
  let seed = 20261107;
  const rnd = () => {
    seed = (seed * 16807) % 2147483647;
    return seed / 2147483647;
  };

  /* ---------- element refs ---------- */
  const journey = document.getElementById("home");
  const camera = document.getElementById("camera");
  const wipeRect = document.getElementById("wipeRect");
  const holeRect = document.getElementById("holeRect");
  const holeClipRect = document.getElementById("holeClipRect");
  const holeWater = document.getElementById("holeWater");
  const casingCollar = document.getElementById("casingCollar");
  const casingPipe = document.getElementById("casingPipe");

  const drillG = document.getElementById("drillG");
  const drillString = document.getElementById("drillString");
  const drillSpin = document.getElementById("drillSpin");
  const drillJointsG = document.getElementById("drillJoints");
  const drillBit = document.getElementById("drillBit");
  const drillCollar = document.getElementById("drillCollar");
  const cuttingsG = document.getElementById("cuttingsG");
  const cuttingDots = cuttingsG ? Array.from(cuttingsG.querySelectorAll("circle")) : [];

  const spoilG = document.getElementById("spoilG");
  const spoilMound = document.getElementById("spoilMound");
  const spoilCap = document.getElementById("spoilCap");
  const spoilChipsG = document.getElementById("spoilChips");
  const spoilChips = spoilChipsG ? Array.from(spoilChipsG.querySelectorAll("circle")) : [];

  const scanG = document.getElementById("scanG");
  const scanProbe = document.getElementById("scanProbe");
  const scanCable = document.getElementById("scanCable");
  const scanRingsG = document.getElementById("scanRings");
  const scanRings = scanRingsG ? Array.from(scanRingsG.querySelectorAll("circle")) : [];
  const scanLine = document.getElementById("scanLine");

  const pumpG = document.getElementById("pumpG");
  const pumpBody = document.getElementById("pumpBody");
  const pumpPipe = document.getElementById("pumpPipe");
  const pumpCable = document.getElementById("pumpCable");

  const gushG = document.getElementById("gushG");
  const fountain = document.getElementById("fountain");
  const stream = document.getElementById("stream");
  const droplets = Array.from(document.querySelectorAll("#droplets circle"));
  const finalGlowG = document.getElementById("finalGlowG");
  const warmWash = document.getElementById("warmWash");

  const clouds = document.getElementById("clouds");
  const dustG = document.getElementById("dustG");

  const heroCopy = document.getElementById("heroCopy");
  const stepEls = Array.from(document.querySelectorAll(".step"));
  const stepsWrap = document.getElementById("steps");
  const depthHud = document.getElementById("depthHud");
  const depthVal = document.getElementById("depthVal");
  const scrollHint = document.getElementById("scrollHint");

  const progressBar = document.getElementById("progressBar");
  const nav = document.getElementById("nav");

  /* ---------- drill string tool joints ----------
     One coupling per pipe section, anchored to the bit so the string
     reads as pipe advancing joint by joint instead of one long rod. */
  const JOINT_SP = 44;
  const joints = [];
  if (drillJointsG) {
    for (let i = 0; i < 20; i++) {
      const r = document.createElementNS(SVG_NS, "rect");
      r.setAttribute("x", "590");
      r.setAttribute("width", "20");
      r.setAttribute("height", "7");
      r.setAttribute("rx", "2");
      r.setAttribute("fill", "#aeb9c4");
      drillJointsG.appendChild(r);
      joints.push(r);
    }
  }

  /* ---------- build dust particles ---------- */
  const dust = [];
  if (dustG) {
    const count = mobileQ.matches ? 12 : 26;
    for (let i = 0; i < count; i++) {
      const c = document.createElementNS(SVG_NS, "circle");
      const x = 380 + rnd() * 480;
      const y = 226 + rnd() * 88;
      const r = 0.8 + rnd() * 2.2;
      c.setAttribute("cx", x);
      c.setAttribute("cy", y);
      c.setAttribute("r", r.toFixed(2));
      c.setAttribute("fill-opacity", (0.1 + rnd() * 0.16).toFixed(2));
      dustG.appendChild(c);
      dust.push({
        el: c,
        x,
        y,
        r,
        phase: rnd() * Math.PI * 2,
        speed: 0.35 + rnd() * 0.9,
        drift: 6 + rnd() * 16,
      });
    }
  }

  /* ---------- camera keyframes [progress, translateY] ---------- */
  const CAMERA_KEYS = [
    [0.0, 0],
    [0.12, 0],
    [0.18, -30],
    [0.32, -200],
    [0.52, -430],
    [0.56, -470],
    [0.7, -500],
    [0.745, -240],
    [0.86, -240],
    [0.93, 0],
    [1.0, 0],
  ];

  function keyframe(keys, p) {
    if (p <= keys[0][0]) return keys[0][1];
    for (let i = 1; i < keys.length; i++) {
      if (p <= keys[i][0]) {
        const [p0, v0] = keys[i - 1];
        const [p1, v1] = keys[i];
        return lerp(v0, v1, smooth((p - p0) / (p1 - p0)));
      }
    }
    return keys[keys.length - 1][1];
  }

  /* ---------- step caption windows ---------- */
  const STEP_WINDOWS = [
    [0.075, 0.152],
    [0.168, 0.292],
    [0.31, 0.522],
    [0.552, 0.698],
    [0.722, 0.852],
    [0.882, 1.0],
  ];
  let activeStep = -1;

  /* ---------- depth readout ---------- */
  let lastMetres = -1;

  /* ---------- core render ---------- */
  function render(p, now, staticMode) {
    const t = staticMode ? 0 : now || 0;

    /* hero copy */
    const heroFade = smooth(seg(p, 0.02, 0.1));
    if (staticMode) {
      heroCopy.style.setProperty("--hero-o", "1");
      heroCopy.style.setProperty("--hero-y", "0px");
      heroCopy.style.setProperty("--hero-v", "visible");
    } else {
      heroCopy.style.setProperty("--hero-o", (1 - heroFade).toFixed(3));
      heroCopy.style.setProperty("--hero-y", (-34 * heroFade).toFixed(1) + "px");
      heroCopy.style.setProperty("--hero-v", heroFade > 0.99 ? "hidden" : "visible");
    }

    /* scroll hint */
    if (scrollHint) {
      scrollHint.style.setProperty("--hint-o", (1 - seg(p, 0.008, 0.06)).toFixed(3));
    }

    /* camera */
    const camY = keyframe(CAMERA_KEYS, p);
    const drillActive = seg(p, 0.22, 0.26) * (1 - seg(p, 0.5, 0.545));
    const shake = staticMode ? 0 : Math.sin(t * 0.05) * 1.5 * drillActive;
    camera.setAttribute("transform", `translate(0 ${(camY + shake).toFixed(2)})`);

    /* clouds parallax drift */
    if (clouds && !staticMode) {
      clouds.setAttribute("transform", `translate(${(Math.sin(t * 0.00006) * 26).toFixed(1)} 0)`);
    }

    /* ground opening / strata reveal */
    const wipe = smooth(seg(p, 0.1, 0.24));
    wipeRect.setAttribute("height", (2400 * wipe).toFixed(1));

    /* drilling */
    const drillT = smooth(seg(p, 0.22, 0.53));
    const tip = lerp(300, 1000, drillT);
    const holeDepth = Math.max(0, tip - 300);
    holeRect.setAttribute("height", holeDepth.toFixed(1));
    holeClipRect.setAttribute("height", holeDepth.toFixed(1));

    const bitY = tip + 6;
    drillBit.setAttribute("transform", `translate(0 ${bitY.toFixed(1)})`);
    drillCollar.setAttribute("transform", `translate(0 ${bitY.toFixed(1)})`);
    drillString.setAttribute("y", "54");
    drillString.setAttribute("height", Math.max(0, bitY - 54).toFixed(1));

    /* tool joints ride down with the bit; ones above the crown are hidden */
    for (let i = 0; i < joints.length; i++) {
      const jy = bitY - (i + 1) * JOINT_SP;
      const on = jy > 56;
      joints[i].setAttribute("y", jy.toFixed(1));
      joints[i].setAttribute("opacity", on ? "1" : "0");
    }

    /* turning shaft cue: the dashed centre line advances, which is how a
       rotating rod reads from the side. Slow, and only while drilling. */
    if (drillSpin) {
      drillSpin.setAttribute("y2", Math.max(56, bitY - 36).toFixed(1));
      drillSpin.setAttribute(
        "stroke-dashoffset",
        staticMode ? "0" : ((t * 0.03) % 21).toFixed(1)
      );
    }

    const drillVis = staticMode
      ? p < 0.53
        ? 1
        : 0
      : clamp(seg(p, 0.2, 0.235) - seg(p, 0.53, 0.565), 0, 1);
    drillG.setAttribute("opacity", drillVis.toFixed(3));
    if (drillG) drillG.setAttribute("transform", `translate(0 ${shake.toFixed(2)})`);

    casingCollar.setAttribute("opacity", seg(p, 0.26, 0.31).toFixed(3));
    casingPipe.setAttribute("opacity", (0.85 * seg(p, 0.26, 0.31)).toFixed(3));

    /* cuttings rising inside the bore, all the way to the collar */
    if (cuttingsG) {
      cuttingsG.setAttribute("opacity", (drillVis * 0.95).toFixed(3));
      if (drillVis > 0.01) {
        cuttingDots.forEach((el, i) => {
          const phase = staticMode ? i / cuttingDots.length : (t * 0.00011 * (0.85 + i * 0.06) + i * 0.19) % 1;
          const cy = lerp(tip - 60, 306, phase);
          const cx = 600 + Math.sin(t * 0.0022 + i * 1.7) * (12 - phase * 6);
          el.setAttribute("cx", cx.toFixed(1));
          el.setAttribute("cy", cy.toFixed(1));
          el.setAttribute("fill-opacity", (0.2 + 0.6 * (1 - Math.abs(phase - 0.55) * 1.4)).toFixed(2));
        });
      }
    }

    /* spoil heap: cuttings come up the hole and are discharged through the
       flow line into a heap that grows with depth, clear of the rig */
    if (spoilG) {
      const spoilT = smooth(seg(p, 0.24, 0.53));
      spoilG.setAttribute("opacity", spoilT.toFixed(3));
      if (spoilT > 0.01) {
        const h = 6 + spoilT * 46;
        spoilMound.setAttribute(
          "d",
          `M830 300 Q910 ${(300 - 2 * h).toFixed(1)} 990 300 Z`
        );
        spoilCap.setAttribute(
          "d",
          `M848 300 Q910 ${(300 - 2 * h * 0.68).toFixed(1)} 972 300 Z`
        );
        spoilChips.forEach((c, i) => {
          const u = 0.12 + i * 0.152;
          const k = 1 - u;
          const cx = k * k * 830 + 2 * k * u * 910 + u * u * 990;
          const cy = k * k * 300 + 2 * k * u * (300 - 2 * h) + u * u * 300;
          c.setAttribute("cx", cx.toFixed(1));
          c.setAttribute("cy", (cy - 2).toFixed(1));
        });
      }
    }

    /* scanning */
    const scanVis = staticMode ? 0 : clamp(seg(p, 0.548, 0.578) - seg(p, 0.688, 0.712), 0, 1);
    if (scanG) {
      scanG.setAttribute("opacity", scanVis.toFixed(3));
      if (scanVis > 0.01) {
        const scanT = smooth(seg(p, 0.56, 0.69));
        const scanY = lerp(520, 930, scanT);
        scanProbe.setAttribute("transform", `translate(600 ${scanY.toFixed(1)})`);
        /* winch cable follows the probe down the hole */
        scanCable.setAttribute(
          "height",
          Math.max(0, scanY - 34 - 301).toFixed(1)
        );
        scanRings.forEach((ring, i) => {
          const frac = (t * 0.00042 + i / scanRings.length) % 1;
          ring.setAttribute("cx", 600);
          ring.setAttribute("cy", scanY.toFixed(1));
          ring.setAttribute("r", (13 + frac * 46).toFixed(1));
          ring.setAttribute("stroke-width", (1.6 + (1 - frac) * 1.4).toFixed(1));
          ring.setAttribute("opacity", (scanVis * (1 - frac) * 0.5).toFixed(3));
        });
        scanLine.setAttribute("y1", scanY.toFixed(1));
        scanLine.setAttribute("y2", scanY.toFixed(1));
        scanLine.setAttribute("opacity", (scanVis * (0.22 + 0.16 * Math.sin(t * 0.006))).toFixed(3));
      }
    }

    /* pumpset lowering */
    const pumpVis = staticMode ? 0 : clamp(seg(p, 0.716, 0.744) - seg(p, 0.852, 0.875), 0, 1);
    if (pumpG) {
      pumpG.setAttribute("opacity", pumpVis.toFixed(3));
      if (pumpVis > 0.01) {
        const pumpT = smooth(seg(p, 0.72, 0.852));
        const pumpY = lerp(380, 830, pumpT);
        pumpBody.setAttribute("transform", `translate(600 ${pumpY.toFixed(1)})`);
        pumpPipe.setAttribute("y", "300");
        pumpPipe.setAttribute("height", Math.max(0, pumpY - 58 - 300).toFixed(1));
        /* flat submersible cable pays out alongside the delivery pipe */
        pumpCable.setAttribute(
          "height",
          Math.max(0, pumpY - 74 - 300).toFixed(1)
        );
      }
    }

    /* finale */
    const fin = smooth(seg(p, 0.875, 0.985));
    const gushVis = smooth(seg(p, 0.895, 0.955));
    if (gushG) {
      gushG.setAttribute("opacity", gushVis.toFixed(3));
      const fs = lerp(0.12, 1, gushVis);
      fountain.setAttribute(
        "transform",
        `translate(600 296) scale(1 ${fs.toFixed(3)})`
      );
      const sx = lerp(0.18, 1, gushVis);
      stream.setAttribute(
        "transform",
        `translate(600 300) scale(${sx.toFixed(3)} 1) translate(-600 -300)`
      );
      if (gushVis > 0.01) {
        droplets.forEach((el, i) => {
          const ph = (t * 0.00038 + i * 0.21) % 1;
          const ang = -Math.PI / 2 + (i - 2) * 0.24;
          const dist = 30 + ph * 250;
          el.setAttribute("cx", (600 + Math.cos(ang) * dist * 1.45).toFixed(1));
          el.setAttribute("cy", (296 + Math.sin(ang) * dist + ph * ph * 190).toFixed(1));
          el.setAttribute("fill-opacity", ((1 - ph) * 0.75).toFixed(2));
        });
      }
    }
    finalGlowG.setAttribute("opacity", (fin * 0.32).toFixed(3));
    warmWash.setAttribute("opacity", (fin * 0.18).toFixed(3));

    /* water inside the finished bore */
    const waterUp = smooth(seg(p, 0.895, 0.995));
    holeWater.setAttribute("y", "760");
    holeWater.setAttribute("height", (240 * waterUp).toFixed(1));
    holeWater.setAttribute("opacity", waterUp.toFixed(3));

    /* dust ambience */
    if (dust.length) {
      dust.forEach((d) => {
        const dx = Math.sin(t * 0.00035 * d.speed + d.phase) * d.drift;
        const dy = Math.cos(t * 0.00027 * d.speed + d.phase) * 5;
        d.el.setAttribute("cx", (d.x + dx).toFixed(1));
        d.el.setAttribute("cy", (d.y + dy).toFixed(1));
        d.el.setAttribute(
          "fill-opacity",
          (0.08 + 0.1 * (0.5 + 0.5 * Math.sin(t * 0.0009 + d.phase))).toFixed(3)
        );
      });
    }

    /* depth HUD */
    const frac = clamp(holeDepth / 700, 0, 1);
    const metres = Math.round(frac * 300);
    if (depthHud) {
      depthHud.style.setProperty("--f", frac.toFixed(4));
      depthHud.style.setProperty("--hud-o", p > 0.985 ? "0.35" : "1");
    }
    if (metres !== lastMetres) {
      depthVal.textContent = String(metres);
      lastMetres = metres;
    }

    /* step captions */
    if (!staticMode && stepsWrap) {
      let next = -1;
      for (let i = 0; i < STEP_WINDOWS.length; i++) {
        if (p >= STEP_WINDOWS[i][0] && p <= STEP_WINDOWS[i][1]) {
          next = i;
          break;
        }
      }
      if (next !== activeStep) {
        stepEls.forEach((el, i) => el.classList.toggle("is-active", i === next));
        activeStep = next;
      }
    }
  }

  /* ---------- scroll loop ---------- */
  let rafId = null;
  let running = false;
  let isReduced = reducedQ.matches;

  function frame(now) {
    rafId = null;
    const rect = journey.getBoundingClientRect();
    const total = journey.offsetHeight - window.innerHeight;
    const p = total > 0 ? clamp(-rect.top / total, 0, 1) : 0;
    render(p, now, false);
    if (rect.top < window.innerHeight && rect.bottom > 0) {
      rafId = requestAnimationFrame(frame);
    } else {
      running = false;
    }
  }

  function kick() {
    if (!journey || isReduced) return;
    if (!running) {
      running = true;
      rafId = requestAnimationFrame(frame);
    }
  }

  /* ---------- global UI ---------- */

  /* active-section spotlight: lights the nav link for the section
     currently under the bar. Only runs on pages that carry the
     sections locally (the index), so legal pages are unaffected. */
  const SPOTLIGHT_IDS = ["home", "services", "about", "gallery", "contact"];
  const spotlightSections = SPOTLIGHT_IDS.map((id) => document.getElementById(id)).filter(Boolean);
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

  /* The nav sits over the dark full-bleed scene until the journey
     section scrolls past, then it has to become a light bar for the
     gray-to-white page underneath. Legal pages carry no scene at all,
     so they are light from the first frame. */
  let navLight = null;

  function updateNavTone() {
    let light;
    if (!journey) {
      light = true;
    } else {
      /* flip only once the whole bar sits over the light page, i.e.
         the scene's bottom edge has passed the bar's bottom edge */
      light = journey.getBoundingClientRect().bottom <= nav.offsetHeight;
    }
    if (light === navLight) return;
    navLight = light;
    nav.classList.toggle("is-light", light);
  }
  function updateUI() {
    const max = document.documentElement.scrollHeight - window.innerHeight;
    const gp = max > 0 ? clamp(window.scrollY / max, 0, 1) : 0;
    progressBar.style.transform = `scaleX(${gp.toFixed(4)})`;
    nav.classList.toggle("is-scrolled", window.scrollY > 24);
    updateNavTone();
    updateSpotlight();
  }

  /* Scroll events are coalesced to at most one per frame by spec, so
     the nav state is updated straight from the handler. That keeps the
     bar, progress line and spotlight in step with the very frame the
     scroll happened in, with no extra frame of latency. */
  function onScroll() {
    updateUI();
    kick();
  }

  /* ---------- static / reduced mode ---------- */
  function applyReducedState() {
    isReduced = reducedQ.matches;
    root.classList.toggle("reduced", isReduced);
    if (isReduced) {
      if (rafId) cancelAnimationFrame(rafId);
      rafId = null;
      running = false;
      stepEls.forEach((el) => el.classList.remove("is-active"));
      activeStep = -1;
      render(0.34, 0, true);
    } else {
      kick();
    }
  }

  /* =========================================================
     INIT MOTION
     ========================================================= */
  if (journey) {
    applyReducedState();
    if (!isReduced) kick();
    window.addEventListener("resize", () => {
      kick();
      if (!isReduced) {
        const rect = journey.getBoundingClientRect();
        const total = journey.offsetHeight - window.innerHeight;
        render(total > 0 ? clamp(-rect.top / total, 0, 1) : 0, 0, false);
      }
    });
    if (reducedQ.addEventListener) {
      reducedQ.addEventListener("change", applyReducedState);
    }
  }

  /* Nav state, progress bar and the section spotlight run on every
     page, including privacy and terms, which have no journey. */
  window.addEventListener("scroll", onScroll, { passive: true });
  window.addEventListener("resize", updateUI);
  updateUI();

  /* =========================================================
     NAV / DRAWER
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
      // Anything whose top has crossed the threshold line is revealed,
      // including elements already scrolled past above the viewport.
      if (el.getBoundingClientRect().top < limit) {
        el.classList.add("in");
        return false;
      }
      return true;
    });
    if (!pendingReveal.length) stopRevealGuard();
  }

  /* Last-resort guard: a slow timer that keeps checking only while some
     element is still hidden, so content can never stay invisible if a
     scroll event is coalesced or dropped (programmatic jumps, restored
     tabs). It stops itself as soon as everything has been revealed. */
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
     ENQUIRY FORM
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

  if (mobileQ.addEventListener) {
    mobileQ.addEventListener("change", () => {
      if (!isReduced) kick();
    });
  }
})();
