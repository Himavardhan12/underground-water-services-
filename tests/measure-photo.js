/* Measures the cross-section photo so its placement in the scene can be
   derived from real pixels instead of guessed: the horizon row (which has
   to land on the scene's ground line, y=300), the borehole column (which
   has to land on the scene's hole centre, x=600) and the aquifer rows.
   Results are written into <pre id="out"> as JSON. */
(function () {
  "use strict";

  var out = document.getElementById("out");

  function report(obj) {
    out.textContent = JSON.stringify(obj, null, 2);
    document.title = "DONE";
  }

  var img = new Image();
  img.onload = function () {
    try {
      measure(img);
    } catch (e) {
      report({ error: String((e && e.stack) || e) });
    }
  };
  img.onerror = function () {
    report({ error: "image failed to load" });
  };
  img.src = "../assets/hero-cross-section.jpg";

  function measure(img) {
    var W = img.naturalWidth;
    var H = img.naturalHeight;
    var cv = document.createElement("canvas");
    cv.width = W;
    cv.height = H;
    var ctx = cv.getContext("2d");
    ctx.drawImage(img, 0, 0);
    var data = ctx.getImageData(0, 0, W, H).data;

    function px(x, y) {
      var i = (y * W + x) * 4;
      return [data[i], data[i + 1], data[i + 2]];
    }
    function lum(x, y) {
      var p = px(x, y);
      return 0.2126 * p[0] + 0.7152 * p[1] + 0.0722 * p[2];
    }

    /* ---- horizon: mean brightness across a band on the left, away from
       the derrick (x 640-745) and the house (x 845-1010) ---- */
    var bandL = 60;
    var bandR = 560;
    var rows = [];
    for (var y = 260; y <= 430; y++) {
      var s = 0;
      for (var x = bandL; x < bandR; x++) s += lum(x, y);
      rows.push(s / (bandR - bandL));
    }
    /* horizon = first row, scanning down, where brightness falls hard
       (bright dry field -> dark topsoil) */
    var horizon = null;
    var biggest = 0;
    for (var i = 1; i < rows.length; i++) {
      var drop = rows[i - 1] - rows[i];
      if (drop > biggest) {
        biggest = drop;
        horizon = 260 + i;
      }
    }

    /* ---- borehole: blue-ish pixels in rows well below the horizon but
       above the aquifer, so only the pipe can match ---- */
    var pipeXs = [];
    var rowLo = horizon + 40;
    var rowHi = horizon + 210;
    for (var yy = rowLo; yy < rowHi; yy++) {
      for (var xx = 500; xx < 900; xx++) {
        var p = px(xx, yy);
        if (p[2] > p[0] + 18 && p[2] > 80 && p[1] > p[0]) pipeXs.push(xx);
      }
    }
    pipeXs.sort(function (a, b) { return a - b; });
    var pipeLeft = pipeXs.length ? pipeXs[0] : null;
    var pipeRight = pipeXs.length ? pipeXs[pipeXs.length - 1] : null;
    var pipeMean = pipeXs.length
      ? pipeXs.reduce(function (a, b) { return a + b; }, 0) / pipeXs.length
      : null;

    /* ---- aquifer: rows where blue dominates across most of the width ---- */
    var aquaTop = null;
    var aquaBottom = null;
    for (var ay = 400; ay < H; ay++) {
      var blue = 0;
      var total = 0;
      for (var ax = 60; ax < W - 60; ax += 4) {
        total++;
        var q = px(ax, ay);
        if (q[2] > q[0] + 20 && q[2] > 90) blue++;
      }
      if (blue / total > 0.45) {
        if (aquaTop === null) aquaTop = ay;
        aquaBottom = ay;
      }
    }

    /* ---- derrick extent: rusty pixels against the sky, upper rows ---- */
    var dLeft = null;
    var dRight = null;
    var dy = 150;
    for (var dx = 400; dx < 1100; dx++) {
      var r = px(dx, dy);
      if (r[0] > r[2] + 15 && r[0] > 70) {
        if (dLeft === null) dLeft = dx;
        dRight = dx;
      }
    }

    report({
      width: W,
      height: H,
      horizonRow: horizon,
      horizonDrop: Number(biggest.toFixed(1)),
      horizonBrightness: rows.map(function (v) { return Number(v.toFixed(1)); }),
      pipe: {
        left: pipeLeft,
        right: pipeRight,
        mean: pipeMean === null ? null : Number(pipeMean.toFixed(2)),
        samples: pipeXs.length
      },
      aquiferTop: aquaTop,
      aquiferBottom: aquaBottom,
      derrick: { left: dLeft, right: dRight,
                 center: dLeft === null ? null : (dLeft + dRight) / 2 }
    });
  }
})();
