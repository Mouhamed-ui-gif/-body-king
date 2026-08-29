/* سيد الجسد — أدوات مساعدة */
window.KX = window.KX || {};

(() => {
  const K = window.KX;

  K.qs = (s, r) => (r || document).querySelector(s);
  K.qsa = (s, r) => Array.from((r || document).querySelectorAll(s));

  K.esc = (s) => String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

  K.fmt = (n) => Number(n || 0).toLocaleString("en-US");

  K.rnd = (arr) => arr[Math.floor(Math.random() * arr.length)];

  K.pct = (p) => Math.max(0, Math.min(100, Math.round(p)));

  /* ---------- weekdays ---------- */
  const WD = ["الأحد", "الاثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة", "السبت"];
  const WD_SHORT = ["الأحد", "الاثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة", "السبت"];
  K.weekdayName = (d) => WD[(d || new Date()).getDay()];
  K.weekdayShort = (d) => WD_SHORT[(d || new Date()).getDay()].slice(0, 4);

  const A_DAYS = ["يناير", "فبراير", "مارس", "أبريل", "ماي", "يونيو", "يوليوز", "غشت", "شتنبر", "أكتوبر", "نونبر", "دجنبر"];
  K.todayLabel = () => {
    const d = new Date();
    return `${d.getDate()} ${A_DAYS[d.getMonth()]} ${d.getFullYear()}`;
  };

  K.key = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

  /* ---------- toast ---------- */
  let toastTimer = null;
  K.toast = (msg, type = "") => {
    const t = K.qs("#toast");
    t.className = "toast " + type;
    t.innerHTML = msg;
    t.classList.remove("hidden");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => t.classList.add("hidden"), 3200);
  };

  /* ---------- sound ---------- */
  const AC = window.AudioContext || window.webkitAudioContext;
  K.soundOn = true;
  K.vibOn = true;
  const tone = (freq, dur, when = 0, gain = 0.14, type = "sine") => {
    if (!K.soundOn) return;
    try {
      const ctx = AC && (K._actx = K._actx || new AC());
      if (!ctx) return;
      if (ctx.state === "suspended") ctx.resume();
      const t = ctx.currentTime + when;
      const o = ctx.createOscillator(), g = ctx.createGain();
      o.type = type; o.frequency.value = freq;
      o.connect(g); g.connect(ctx.destination);
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(gain, t + 0.015);
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      o.start(t); o.stop(t + dur + 0.03);
    } catch (_) {}
  };
  K.beepTick = () => tone(880, 0.09);
  K.beepGo = () => { tone(660, 0.14); tone(990, 0.22, 0.1); };
  K.beepWin = () => { tone(523, 0.15); tone(659, 0.15, 0.12); tone(784, 0.15, 0.24); tone(1047, 0.35, 0.36); };
  K.beepErr = () => { tone(220, 0.2); tone(180, 0.3, 0.18); };

  K.vibrate = (ms) => { if (K.vibOn && navigator.vibrate) { try { navigator.vibrate(ms); } catch (_) {} } };

  /* ---------- confetti ---------- */
  K.confetti = (n = 130) => {
    const cv = K.qs("#confetti");
    const ctx = cv.getContext("2d");
    cv.width = innerWidth; cv.height = innerHeight;
    const colors = ["#22d3ee", "#a3e635", "#fbbf24", "#f472b6", "#a78bfa", "#ffffff"];
    const parts = [];
    for (let i = 0; i < n; i++) {
      parts.push({
        x: Math.random() * cv.width,
        y: -20 - Math.random() * cv.height * 0.4,
        vx: (Math.random() - 0.5) * 3,
        vy: 2.5 + Math.random() * 4,
        s: 5 + Math.random() * 7,
        c: colors[(Math.random() * colors.length) | 0],
        r: Math.random() * Math.PI,
        vr: (Math.random() - 0.5) * 0.3,
        life: 1
      });
    }
    const start = performance.now();
    const loop = (now) => {
      const t = (now - start) / 1000;
      ctx.clearRect(0, 0, cv.width, cv.height);
      let alive = false;
      for (const p of parts) {
        p.life = 1 - t / 2.6;
        if (p.life <= 0) continue;
        alive = true;
        p.x += p.vx; p.y += p.vy; p.vy += 0.07; p.r += p.vr;
        ctx.save();
        ctx.globalAlpha = Math.max(0, p.life);
        ctx.translate(p.x, p.y);
        ctx.rotate(p.r);
        ctx.fillStyle = p.c;
        ctx.fillRect(-p.s / 2, -p.s / 2, p.s, p.s * 0.62);
        ctx.restore();
      }
      if (alive) requestAnimationFrame(loop);
      else { ctx.clearRect(0, 0, cv.width, cv.height); }
    };
    requestAnimationFrame(loop);
  };
})();