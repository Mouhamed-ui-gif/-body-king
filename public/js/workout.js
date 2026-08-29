/* سيد الجسد — مشغّل التمرين (الوضع الكامل للتركيز) */
(() => {
  const K = window.KX;
  const C = 603.19; // circumference r=96
  let vm = null;

  const legendary = () => !!(K.db && K.db.trainee && K.db.trainee.settings && K.db.trainee.settings.legendary);
  const adjEx = (ex) => {
    if (!legendary()) return ex;
    const o = { sets: Math.min(6, ex.sets + 1), rest: Math.max(20, Math.round(ex.rest * 0.8)) };
    if (ex.t === "time") o.sec = Math.round(ex.sec * 1.15);
    else { o.rmin = ex.rmin + 2; o.rmax = Math.min(40, ex.rmax + 4); }
    return Object.assign({}, ex, o);
  };

  function stepsOf(sess) {
    const steps = [];
    for (const b of sess.blocks) for (const id of b.ex) {
      const ex = K.EX[id];
      if (ex) steps.push({ kind: b.t, ex, id });
    }
    return steps;
  }
  const curEx = () => vm.steps[vm.i].ex;
  const totalDone = () => vm.results.reduce((s, r) => s + (r.sets ? r.sets.length : 0), 0);
  const totalSets = () => vm.steps.reduce((s, st) => s + st.ex.sets, 0);
  const dispTime = () => {
    const ex = curEx();
    if (!vm.timer) return ex.sec;
    const t = vm.timer;
    return t.active ? Math.max(0, Math.ceil((t.endTs - Date.now()) / 1000)) : Math.max(0, Math.ceil(t.rem || 0));
  };

  const phaseChip = (kind) => {
    const map = { warmup: ["🔥", "إحماء"], work: ["💪", "عمل رئيسي"], cooldown: ["🧘", "تهدئة"] };
    const [e, l] = map[kind] || map.work;
    return { e, l };
  };

  /* ---------- render shell ---------- */
  function shell(inner, opts = {}) {
    const { title, closeBtn = true } = opts;
    return `
      <div class="wk-top">
        <div class="brand" style="cursor:default"><div class="brand-mark">👑</div><div class="brand-text"><b>سيد الجسد</b><span>${K.esc(vm.steps[vm.i]?.ex.n || "")}</span></div></div>
        ${closeBtn ? `<button class="wk-close" id="wk-close">✕</button>` : ""}
      </div>
      <div class="wk-body">${inner}</div>`;
  }

  /* ---------- renderers ---------- */
  function introHTML() {
    const s = vm.session;
    const workEx = s.blocks.find((b) => b.t === "work");
    const count = workEx ? workEx.ex.length : 0;
    return `
      <div class="summary" style="padding-top:40px">
        <div class="big-emoji">${s.em}</div>
        <h2>${K.esc(s.focus)}</h2>
        <div class="sub">${K.esc(s.day)} · ${K.esc(s.dur)}</div>
        <div class="chips" style="justify-content:center;margin-top:12px">
          <span class="chip cyan">${count} تمارين أساسية</span>
          <span class="chip lime">⏱ ${K.esc(s.dur)}</span>
          ${legendary() ? `<span class="chip legend">🔥 الوضع الأسطوري</span>` : ""}
        </div>
        ${legendary() ? `<div class="legend-note">الوضع الأسطوري مفعّل: مجموعة إضافية لكل تمرين + راحة أقصر + هدف أعلى 💪</div>` : ""}
        <div class="wrk" style="margin:26px 0 8px">
        <div class="sum-rows">
          <div class="stat"><div class="n">${K.esc(sessCountTotal(s).w)}</div><div class="l">مجموعات (work)</div></div>
          <div class="stat"><div class="n">${K.esc(sessCountTotal(s).min)}</div><div class="l">دقيقة تقريباً</div></div>
          <div class="stat"><div class="n">${K.esc(sessCountTotal(s).diff)}</div><div class="l">مستوى الصعوبة</div></div>
        </div>
        </div>
        <p class="sm muted" style="max-width:300px;margin:8px auto 26px">${K.esc(s.desc)}</p>
        <button class="btn btn-cta btn-primary" id="wk-start">🔥 ابدأ التمرين</button>
        <button class="btn btn-ghost btn-sm" id="wk-back" style="margin-top:12px;width:100%">رجوع</button>
      </div>`;
  }
  function sessCountTotal(s) {
    let w = 0;
    for (const st of vm.steps) if (st.kind === "work") w += st.ex.sets;
    return { w, min: sessionMins(), diff: "◆◆◆" };
  }
  function sessionMins() {
    let sec = 0;
    for (const st of vm.steps) {
      const ex = st.ex;
      const w = ex.t === "time" ? ex.sec : (ex.rmin + ex.rmax) / 2;
      sec += ex.sets * (w + (ex.rest || 0) / 2);
    }
    return Math.round(sec / 60);
  }

  function exerciseHTML() {
    const st = vm.steps[vm.i];
    const ex = st.ex;
    const { e, l } = phaseChip(st.kind);
    const setLabel = `المجموعة ${vm.set + 1} من ${ex.sets}`;
    const leg = legendary() ? `<span class="wk-legend-pill">🔥 أسطوري</span>` : "";
    let main;
    if (ex.t === "time") {
      main = `
        <div class="hud3d">
          <div class="ring-bg">
            ${ring(250)}
            <div class="ring-txt warn"><div><div class="n hud-num" id="ring-n">${dispTime()}</div><div class="l"><b>${setLabel}</b></div></div></div>
            ${leg}
          </div>
        </div>
        <div class="wk-tools">
          <button class="btn" id="tk-pause">${vm.timer && vm.timer.active ? "⏸ إيقاف مؤقت" : "▶ متابعة"}</button>
          <button class="btn" id="tk-skip">⏭ تجاوز</button>
        </div>`;
    } else {
      main = `
        <div style="text-align:center;margin-top:8px">
          <span class="chip lime">🎯 الهدف: ${ex.rmin} – ${ex.rmax} عدّة</span>
        </div>
        <div class="wk-rep" style="position:relative">
          ${leg}
          <button id="rep-dec" style="font-size:30px;line-height:1">−</button>
          <div><div class="cnt" id="rep-cnt">${ex.rmin}</div><div class="tgt">${setLabel}</div></div>
          <button id="rep-inc" style="font-size:24px">+</button>
        </div>
        <button class="btn btn-primary" id="rep-done" style="width:100%">✅ أنهيت المجموعة</button>`;
    }

    const progress = vm.steps.map((s, i) =>
      `<div class="dot ${i < vm.i ? "done" : i === vm.i ? "now" : ""}"></div>`).join("");

    return `
      <div>
        <div class="center" style="margin-top:6px">
          <span class="chip cyan">${e} ${l}</span>
          <span class="chip grey">${vm.i + 1} / ${vm.steps.length}</span>
        </div>
        <h2 class="wk-ex-name">${K.esc(ex.n)}</h2>
        <div class="wk-ex-cue">${K.esc(ex.d)}</div>
        ${ex.tempo ? `<div class="center"><span class="chip lime" style="margin-bottom:8px">⏳ ${K.esc(ex.tempo)}</span></div>` : ""}
        ${main}
        <div class="center"><p class="sm muted" style="max-width:300px;margin:14px auto 0">💡 ${K.esc(ex.cues)}</p></div>
        <div class="wk-progress">${progress}</div>
        <div id="mot-box"></div>
        <div class="wk-tools">
          <button class="btn" id="wk-skip-ex">⏭ تخطّي التمرين</button>
          <button class="btn btn-danger" id="wk-quit">✕ إنهاء</button>
        </div>
      </div>`;
  }
  function ring(size, r = 96) {
    return `
    <svg class="ring-glow" width="${size}" height="${size}" viewBox="0 0 220 220">
      <defs>
        <linearGradient id="rgrad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stop-color="#f6c453"/>
          <stop offset="55%" stop-color="#e8953a"/>
          <stop offset="100%" stop-color="#f6c453"/>
        </linearGradient>
      </defs>
      <circle cx="110" cy="110" r="${r}" fill="none" stroke="rgba(255,255,255,.06)" stroke-width="13"/>
      <circle cx="110" cy="110" r="${r}" fill="none" stroke="url(#rgrad)" stroke-width="13" stroke-linecap="round" stroke-dasharray="${C}" stroke-dashoffset="0"/>
      <circle id="ring-prog" cx="110" cy="110" r="${r}" fill="none" stroke="var(--accent)" stroke-width="2.5" stroke-linecap="round" stroke-dasharray="${C}" stroke-dashoffset="0" opacity=".7"/>
    </svg>`;
  }

  function restHTML() {
    const rest = vm.restSec;
    const next = vm.steps[vm.i + 1];
    const nextName = next ? next.ex.n : "انتهى التمرين";
    return `
      <div style="text-align:center;padding-top:8px">
        <span class="chip grey">بين المجموعات</span>
      </div>
      <div class="hud3d">
        <div class="ring-bg">
          ${ring(250)}
          <div class="ring-txt good"><div><div class="n hud-num" id="ring-n">${dispTime()}</div><div class="l"><b>ثانية راحة</b></div></div></div>
        </div>
      </div>
      <div class="center"><p class="sm muted">التالي: <b style="color:var(--text)">${K.esc(nextName)}</b></p></div>
      <div class="wk-tools">
        <button class="btn" id="tk-pause">${vm.timer && vm.timer.active ? "⏸ إيقاف مؤقت" : "▶ متابعة"}</button>
        <button class="btn btn-success" id="rk-skip" style="grid-column:1/-1">متابعة الآن ▸</button>
      </div>`;
  }

  function transitionHTML() {
    const next = vm.steps[vm.i];
    const ex = next.ex;
    const { e, l } = phaseChip(next.kind);
    const isLast = vm.i === vm.steps.length - 1;
    return `
      <div class="wk-transition">
        <div class="sm muted" style="letter-spacing:2px">${isLast ? "المرحلة الأخيرة 🔥" : "⚠ تمرين سابق مكتمل"}</div>
        <div class="tr-em ${isLast ? "good" : ""}">${e}</div>
        <h2 style="font-size:24px;font-weight:900;margin:10px 0 4px">${K.esc(ex.n)}</h2>
        <p class="sm muted" style="max-width:300px">${K.esc(ex.d)}</p>
        <div style="margin:14px 0 6px;display:flex;gap:8px;justify-content:center;flex-wrap:wrap">
          <span class="chip cyan">${ex.t === "time" ? "⏱ " + ex.sec + " ثانية" : "🎯 " + ex.rmin + "–" + ex.rmax + " عدّة"}</span>
          <span class="chip">${ex.sets} مجموعات · راحة ${ex.rest}ث</span>
        </div>
        <div style="position:relative">
          <div class="tr-huge" id="tr-cnt">3</div>
          <div class="tr-flash" id="tr-flash"></div>
        </div>
        <p class="sm" style="color:var(--gold)">استعد… ${l} 🚀</p>
      </div>`;
  }

  function summaryHTML(g) {
    const achieved = g.achieved || [];
    const achMeta = (K.ach || []).filter((a) => achieved.includes(a.id));
    const records = g.gained.newRecords || [];
    const bonusLines = [];
    if (g.gained.streakBonus > 0) bonusLines.push(`🔥 بونص سلسلة +${K.fmt(g.gained.streakBonus)}`);
    if (g.gained.charBonus > 0) bonusLines.push(`👑 بونص البطل +${K.fmt(g.gained.charBonus)}`);
    if (g.gained.perfect) bonusLines.push("✨ جلسة مثالية +100");
    if (g.gained.ratio >= 85) bonusLines.push(`🎯 دقة إنجاز ${g.gained.ratio}%`);

    return `
    <div class="summary" style="padding-top:26px">
      <div class="big-emoji">${g.gained.perfect ? "🏆" : "👊"}</div>
      <h2>${g.gained.perfect ? "جلسة مثالية!" : "أحسنت يا بطل!"}</h2>
      <div class="sub">${K.esc(vm.session.focus)} — انتهى</div>
      <div class="pts-roll">+${K.fmt(g.gained.points)} <small>نقطة</small></div>
      ${bonusLines.length ? `<div class="chips" style="justify-content:center;flex-wrap:wrap">${K.rnd ? bonusLines.map((b) => `<span class="chip cyan">${b}</span>`).join(" ") : ""}</div>` : ""}
      <div class="sum-rows" style="margin-top:18px">
        <div class="stat"><div class="n">${g.gained.ratio}%</div><div class="l">الإنجاز</div></div>
        <div class="stat"><div class="n" style="color:var(--gold)">${g.level.level}</div><div class="l">مستواك</div></div>
        <div class="stat"><div class="n">${K.fmt(K.db.stats.points)}</div><div class="l">⭐ نقطة</div></div>
      </div>
      ${records.length ? `<div class="card" style="text-align:right;background:rgba(251,191,36,.08);border-color:rgba(251,191,36,.3)">
        <div style="font-weight:800;color:var(--gold)">🎯 رقم قياسي جديد!</div>
        ${records.map((r) => `<div style="margin-top:6px">${r.name === "الضغط" ? "💪" : r.name === "السحب" ? "🦾" : "🔱"} <b>${r.name}</b>: <b style="color:var(--text)">${r.val}</b></div>`).join("")}
      </div>` : ""}
      ${achMeta.length ? `<div class="card" style="text-align:right;background:rgba(163,230,53,.07);border-color:rgba(163,230,53,.3);margin-top:12px">
        <div style="font-weight:800;color:var(--accent2)">🎖 وسام جديد!</div>
        ${achMeta.map((a) => `<div style="margin-top:6px">${a.em} <b>${K.esc(a.title)}</b> — ${K.esc(a.desc)}</div>`).join("")}
      </div>` : ""}
      <div class="quit-btns" style="margin-top:24px">
        <button class="btn btn-primary" id="wk-done">🏠 الرئيسية</button>
        <button class="btn" id="wk-replay">↻ إعادة</button>
      </div>
    </div>`;
  }

  /* ---------- timer ---------- */
  let tickIv = null;
  function clearTick() { if (tickIv) { clearInterval(tickIv); tickIv = null; } }
  function startTicking() {
    clearTick();
    tickIv = setInterval(() => {
      if (!vm || vm.phase === "summary") return;
      const t = vm.timer;
      if (!t || !t.active) return;
      const rem = Math.max(0, (t.endTs - Date.now()) / 1000);
      updateRing(t, rem);
      if (rem <= 3 && rem > 0 && Math.ceil(rem) !== t._lastBeep) {
        t._lastBeep = Math.ceil(rem);
        K.beepTick();
      }
      if (rem <= 0 && (vm.phase === "exercise" || vm.phase === "rest")) {
        finishTimer();
      }
    }, 200);
  }
  function updateRing(t, rem) {
    const n = K.qs("#ring-n");
    const prog = K.qs("#ring-prog");
    if (n) {
      const sec = Math.ceil(rem);
      if (Number(n.textContent) !== sec) {
        n.classList.remove("flip"); void n.offsetWidth; n.classList.add("flip");
        n.textContent = sec;
      }
    }
    const frac = t.total > 0 ? rem / t.total : 0;
    if (prog) prog.style.strokeDashoffset = C * (1 - frac);
    const wrap = K.qs(".ring-txt");
    if (wrap) {
      wrap.classList.remove("good", "warn", "danger");
      wrap.classList.add(frac > 0.5 ? "good" : frac > 0.25 ? "warn" : "danger");
    }
  }
  function pauseTimer() {
    if (vm.timer) { vm.timer.rem = (vm.timer.endTs - Date.now()) / 1000; vm.timer.active = false; }
    render();
  }
  function resumeTimer() {
    if (vm.timer && !vm.timer.active) { vm.timer.active = true; vm.timer.endTs = Date.now() + vm.timer.rem * 1000; }
    render();
  }
  function finishTimer() {
    if (vm.phase === "rest") {
      K.beepGo(); K.vibrate([80, 60, 120]);
      resumeExercise();
      return;
    }
    if (vm.phase !== "exercise") return;
    const ex = curEx();
    K.beepGo(); K.vibrate([80, 60, 120]);
    completeSet("goal", ex.sec);
  }

  function autoStartTime() {
    const ex = curEx();
    if (ex.t !== "time" || (vm.timer && vm.timer.active)) return;
    vm.timer = { active: true, total: ex.sec, endTs: Date.now() + ex.sec * 1000, kind: "work", _lastBeep: 99 };
    const n = K.qs("#ring-n");
    if (n) n.textContent = ex.sec;
    refreshPause();
  }

  function refreshPause() {
    const btn = K.qs("#tk-pause");
    if (btn) btn.textContent = vm.timer && vm.timer.active ? "⏸ إيقاف مؤقت" : "▶ متابعة";
  }

  function startRest(sec) {
    vm.phase = "rest";
    vm.restSec = sec;
    vm.timer = { active: true, total: sec, endTs: Date.now() + sec * 1000, kind: "rest", _lastBeep: 99 };
    render();
    refreshPause();
  }
  function advanceAfterSet() {
    const ex = curEx();
    if (vm.set < ex.sets - 1) {
      vm.set++;
      if ((ex.rest || 0) <= 0) {
        resumeExercise();
      } else {
        startRest(Math.max(ex.rest, 10));
      }
    } else {
      nextExercise();
    }
  }
  function resumeExercise() {
    vm.phase = "exercise";
    vm.timer = null;
    render();
    autoStartTime();
  }
  function nextExercise() {
    if (vm.i < vm.steps.length - 1) {
      vm.i++; vm.set = 0;
      vm.phase = "transition";
      render();
    } else {
      finish();
    }
  }

  function completeSet(quality, qty) {
    let r = vm.results.find((x) => x.exId === vm.steps[vm.i].id);
    if (!r) { r = { exId: vm.steps[vm.i].id, sets: [] }; vm.results.push(r); }
    r.sets.push({ quality, qty });
    const ex = curEx();
    showMot(ex);
    K.beepTick();
    advanceAfterSet();
  }
  function showMot(ex) {
    const box = K.qs("#mot-box");
    if (!box) return;
    const extra = ex.diff >= 3 ? "شدة نار 🔥" : "";
    box.innerHTML = `<div class="wk-mot">“${K.rnd(K.MOT)}”</div>`;
  }

  /* ---------- finish / submit ---------- */
  async function finish() {
    clearTick();
    vm.phase = "summary";
    const duration = Math.max(1, Math.round((Date.now() - vm.startTs) / 60000));
    const payload = { sessionId: vm.session.id, duration, results: vm.results };
    render("saving");
    const r = await K.api.completeWorkout(payload);
    if (r.ok) {
      K.db = r.data.db;
      K.level = r.data.level;
      K.gained = r.data.gained;
      K.ach = mergeAch(r.data.achieved);
      if (K.refresh) K.refresh(true);
      K.confetti(r.data.gained.perfect ? 200 : 110);
      K.beepWin(); K.vibrate([90, 60, 90, 60, 180]);
      render("summary", r.data);
    } else {
      renderSummaryError();
    }
  }
  function renderSummaryError() {
    K.toast("⚠ تعذر حفظ التمرين — السيرفر غير متصل", "error");
    exit();
  }

  /* ---------- achievements merge ---------- */
  function mergeAch(newlyUnlocked) {
    return K.ach.map((a) => {
      if (newlyUnlocked && newlyUnlocked.includes(a.id)) return { ...a, unlocked: true, fresh: true };
      return a;
    });
  }

  /* ---------- binding ---------- */
  function bindIntro() {
    K.qs("#wk-start").addEventListener("click", () => {
      vm.startTs = Date.now();
      vm.phase = "exercise";
      render();
      autoStartTime();
      startTicking();
      try { navigator.wakeLock && navigator.wakeLock.request("screen"); } catch (_) {}
    });
    K.qs("#wk-back").addEventListener("click", () => exit());
    K.qs("#wk-close").addEventListener("click", () => exit());
  }
  function bindExercise() {
    const bound = (id, fn) => { const el = K.qs("#" + id); if (el) el.addEventListener("click", fn); };
    const ex = curEx();
    bound("wk-close", () => exit());
    bound("wk-skip-ex", () => { if (vm.i < vm.steps.length - 1) { vm.i++; vm.set = 0; vm.phase = "transition"; render(); } else finish(); });
    bound("wk-quit", () => {
      if (confirm("هل تريد إنهاء التمرين الآن؟ سيُحفظ ما أنجزته.")) {
        if (vm.timer) clearTick();
        finish();
      }
    });
    if (ex.t === "time") {
      bound("tk-pause", () => { if (vm.timer && vm.timer.active) pauseTimer(); else resumeTimer(); });
      bound("tk-skip", () => completeSet("goal", 0));
    } else {
      const cntEl = K.qs("#rep-cnt");
      let val = Number(cntEl.textContent);
      bound("rep-inc", () => { val++; cntEl.textContent = val; });
      bound("rep-dec", () => { val = Math.max(0, val - 1); cntEl.textContent = val; });
      bound("rep-done", () => completeSet("goal", val));
    }
  }
  function bindRest() {
    const rk = (id, fn) => { const el = K.qs("#" + id); if (el) el.addEventListener("click", fn); };
    rk("rk-skip", () => resumeExercise());
    rk("tk-pause", () => { if (vm.timer && vm.timer.active) pauseTimer(); else resumeTimer(); });
  }
  function bindTransition() {
    let n = 3;
    const fl = K.qs("#tr-flash");
    const cnt = K.qs("#tr-cnt");
    let iv = setInterval(() => {
      n--;
      if (cnt) {
        cnt.textContent = n > 0 ? n : "GO";
        cnt.classList.toggle("go", n <= 0);
        cnt.classList.remove("flip"); void cnt.offsetWidth; cnt.classList.add("flip");
      }
      if (n > 0) K.beepTick(); else { K.beepGo(); clearInterval(iv); }
      if (n === 0) {
        if (fl) { fl.style.opacity = 1; setTimeout(() => { fl.style.opacity = 0; }, 500); }
        setTimeout(() => resumeExercise(), 350);
      }
    }, 800);
    const cl = K.qs("#wk-close");
    if (cl) cl.addEventListener("click", () => { clearInterval(iv); exit(); });
  }
  function bindSummary() {
    K.qs("#wk-done").addEventListener("click", () => { location.hash = "/home"; exit(); });
    K.qs("#wk-replay").addEventListener("click", () => { exit(); K.Workout.start(vm.session.id); });
  }

  /* ---------- render ---------- */
  function render(what, data) {
    const box = K.qs("#workout");
    if (what === "saving") {
      box.innerHTML = shell(`<div class="summary" style="padding-top:60px"><div class="big-emoji">⏳</div><h2>جاري حفظ التمرين…</h2></div>`, { closeBtn: false });
      return;
    }
    if (what === "summary") {
      box.innerHTML = shell(summaryHTML(data), { closeBtn: false });
      bindSummary();
      return;
    }
    if (!vm) return;
    if (vm.phase === "intro") { box.innerHTML = shell(introHTML(), {}); bindIntro(); }
    else if (vm.phase === "exercise") { box.innerHTML = shell(exerciseHTML(), {}); bindExercise(); }
    else if (vm.phase === "rest") { box.innerHTML = shell(restHTML(), {}); bindRest(); }
    else if (vm.phase === "transition") { box.innerHTML = shell(transitionHTML(), {}); bindTransition(); }
  }

  /* ---------- public ---------- */
  function start(sessionId) {
    const sess = K.SESSIONS.find((s) => s.id === sessionId);
    if (!sess) return;
    K.Workout.vm = vm = {
      session: sess,
      steps: stepsOf(sess).map((st) => (Object.assign({}, st, { ex: adjEx(st.ex) }))),
      i: 0, set: 0,
      results: [],
      phase: "intro",
      startTs: Date.now(),
      timer: null
    };
    K.qs("#workout").classList.remove("hidden");
    document.body.classList.add("wk-live");
    document.body.style.overflow = "hidden";
    render();
  }
  function exit() {
    clearTick();
    K.Workout.vm = vm = null;
    K.qs("#workout").classList.add("hidden");
    document.body.classList.remove("wk-live");
    document.body.style.overflow = "";
  }

  K.Workout = { start, exit, vm: null };
})();