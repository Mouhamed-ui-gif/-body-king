/* سيد الجسد — الواجهات */
(() => {
  const K = window.KX;

  /* ---------- shared helpers ---------- */
  const WOOD = ["السبت", "الأحد", "الاثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة"];
  const exTarget = (ex) => ex.t === "time"
    ? `${ex.sets} × ${ex.sec}ث`
    : `${ex.sets} × ${ex.rmin}–${ex.rmax}`;
  const diffStars = (d) => (d == null ? 0 : Math.min(d, 3));
  const sessionLength = (sess) => {
    let sum = 0;
    for (const b of sess.blocks) for (const id of b.ex) {
      const ex = K.EX[id];
      if (!ex) continue;
      const w = ex.t === "time" ? ex.sec : (ex.rmin + ex.rmax) / 2;
      sum += ex.sets * (w + (ex.rest || 0) / 2);
    }
    return Math.round(sum / 60);
  };
  const todaySession = () => K.PLAN[K.weekdayName()];
  const doneToday = (sid) => (K.db.history || []).some((h) => h.sessionId === sid && h.date === K.key(new Date()));

  const groupLabel = {
    warmup: ["🔥", "الإحماء"],
    work: ["💪", "التمرين الرئيسي"],
    cooldown: ["🧘", "التهدئة والتمدد"]
  };
  const charBonusText = (c) => {
    const b = c.bonus;
    if (b.type === "all") return `+${Math.round((b.v - 1) * 100)}% على كل النقاط`;
    const names = { push: "الدفع", pull: "السحب", core: "الجذع", legs: "الأرجل", endr: "التحمل", force: "القوة القصوى", skill: "المهارات" };
    return `+${Math.round((b.v - 1) * 100)}% على نقاط ${names[b.type] || b.type}`;
  };

  const section = (t, link) =>
    `<div class="sec"><h2>${t}</h2>${link ? `<a href="${link}">عرض الكل ←</a>` : ""}</div>`;

  /* ================= HOME ================= */
  function home() {
    const now = new Date();
    const hh = now.getHours();
    const greet = hh < 6 ? "ليلة سعيدة" : hh < 12 ? "صباح النور" : hh < 18 ? "مساء الحماس" : "مساء الحديد";
    const sid = todaySession();
    const sess = K.SESSIONS.find((s) => s.id === sid);
    const lvl = K.level;
    const st = K.db.stats;
    const char = K.CHARS.find((c) => c.id === K.db.trainee.equippedCharacter) || K.CHARS[0];
    const recents = [...K.db.history].slice(-3).reverse();

    let hero;
    if (sess) {
      const done = doneToday(sess.id);
      hero = `
      <div class="hero">
        <div class="hero-tag">${svgSpark()} تمرين اليوم · ${sess.day} · ${sess.dur}</div>
        <h1>${sess.em} ${K.esc(sess.focus)}</h1>
        <p>${K.esc(sess.desc)}</p>
        <div class="hero-actions">
          <button class="btn btn-cta" id="start-today">${done ? "↻ إعادة التمرين" : "🚀 ابدأ التمرين"}</button>
        </div>
        ${done ? `<div style="margin-top:10px;position:relative;z-index:2"><span class="chip lime">✅ تم إنجازه اليوم</span></div>` : ""}
      </div>`;
    } else {
      hero = `
      <div class="hero">
        <div class="hero-tag">${svgSpark()} اليوم ${K.weekdayName()} · يوم تعافٍ</div>
        <h1>🌿 راحة وتعافي</h1>
        <p>أرِح جسمك، خذ مشية خفيفة، نَم جيداً، وتزود بالماء. التعافي جزء من القوة.</p>
        <div class="hero-actions">
          <button class="btn btn-cta" id="go-program">📋 شوف أيام التدريب</button>
        </div>
      </div>`;
    }

    const achOpen = K.ach.filter((a) => a.unlocked).slice(-3).reverse();

    return `
      <div class="animate-in">
        ${hero}

        <div class="card" style="margin-top:14px">
          <div class="spread">
            <div>
              <div class="card-title" style="margin-bottom:0">مرحباً، ${K.esc(K.db.trainee.name)} 👋</div>
              <div class="sm muted" style="margin-top:3px">${greet} · ${lvl.name} · المستوى ${lvl.level}</div>
            </div>
            <div class="chip cyan">⚡ ${K.esc(K.PROGRAM.level)}</div>
          </div>
          <div class="xpbar">
            <div class="row"><span>نقطة الخبرة (XP)</span><b>${K.fmt(lvl.xp)} / ${K.fmt(lvl.need)}</b></div>
            <div class="xp-track"><div class="xp-fill" style="width:${lvl.pct}%"></div></div>
          </div>
        </div>

        <div class="statgrid" style="margin-top:14px">
          <div class="stat"><div class="n" style="color:var(--gold)">${K.fmt(st.streak)}</div><div class="l">🔥 سلسلة الأيام</div></div>
          <div class="stat"><div class="n" style="color:var(--accent)">${K.fmt(st.points)}</div><div class="l">⭐ النقاط</div></div>
          <div class="stat"><div class="n" style="color:var(--accent2)">${K.fmt(st.totalWorkouts)}</div><div class="l">🏋️ تمرين مكتمل</div></div>
        </div>

        ${section("غذاء اليوم 🥗", "/food")}
        <div class="card" style="display:flex;align-items:center;gap:14px;padding:14px;" data-nav="/food">
          <div style="font-size:40px">🥗</div>
          <div style="flex:1">
            <b style="font-size:15px">وجباتك: ${(st.mealLog || []).filter((m) => m.date === K.key(new Date())).length} / 4</b>
            <div class="sm muted mt10">سجّل أكلتك البسيطة تكسب نقاطاً وتبني سلسلة تغذية</div>
          </div>
          <span class="pill"><span class="pill-ico">🍽</span><b>افتح</b></span>
        </div>

        ${section("بطل اليوم", "/store")}
        <div class="card" style="display:flex;align-items:center;gap:14px;padding:14px;" data-nav="/store">
          <div style="font-size:44px">${char.em}</div>
          <div style="flex:1">
            <b style="font-size:15px">${K.esc(char.name)}</b>
            <div class="sm muted mt10">${K.esc(charBonusText(char))}</div>
          </div>
          <span class="pill"><span class="pill-ico">${K.db.trainee.equippedCharacter === char.id ? "✔" : "🎮"}</span><b>مفعّل</b></span>
        </div>

        ${section("أرقامك", "/stats")}
        <div class="card">
          <div class="rows">
            <div class="rowx"><span>💪 إجمالي الضغط</span><b>${K.fmt(st.totalPush)}</b></div>
            <div class="rowx"><span>🦾 إجمالي السحب</span><b>${K.fmt(st.totalPull)}</b></div>
            <div class="rowx"><span>🔱 إجمالي الغاطس</span><b>${K.fmt(st.totalDips)}</b></div>
            <div class="rowx"><span>⏱️ دقائق التدريب</span><b>${K.fmt(st.totalMinutes)}</b></div>
          </div>
        </div>

        ${recents.length ? section("آخر التمارين") : ""}
        ${recents.length ? `<div class="rows">${recents.map((r) => `
          <div class="rowx">
            <span>${K.esc(r.sessionName)} <small>· ${r.date}</small></span>
            <b>+${K.fmt(r.points)} ⭐</b>
          </div>`).join("")}</div>` : ""}

        ${achOpen.length ? section("أوسمتك الأخيرة", "/stats") : ""}
        ${achOpen.length ? `<div class="ach-grid">${achOpen.map((a) => `
          <div class="ach"><div class="em">${a.em}</div><b>${K.esc(a.title)}</b><span>${K.esc(a.desc)}</span></div>`).join("")}</div>` : ""}

        <footer class="credit">
          👑 <b>${K.esc(K.APP.name)}</b> — تأسيس وإبداع <b>${K.esc(K.APP.founder)}</b><br/>
          <span class="sm">الإصدار ${K.esc(K.APP.version)} · مدعوم بالذكاء الاصطناعي</span>
        </footer>
      </div>`;
  }
  function bindHome() {
    const st = K.qs("#start-today");
    if (st) st.addEventListener("click", () => K.Workout.start(todaySession()));
    const goP = K.qs("#go-program");
    if (goP) goP.addEventListener("click", () => { location.hash = "/program"; });
  }

  /* ================= PROGRAM ================= */
  function program() {
    const rows = WOOD.map((wd) => {
      const sid = K.PLAN[wd];
      if (sid === "rest" || !sid) {
        return `
        <div class="session-row" style="cursor:default;opacity:.75">
          <div class="session-ico">🌿</div>
          <div class="session-info">
            <b>${wd} · يوم راحة وتعافي</b>
            <span>نوّم زين، كول مليح، عوّض الماء</span>
          </div>
          <div class="session-start">😴</div>
        </div>`;
      }
      const s = K.SESSIONS.find((x) => x.id === sid);
      if (!s) return "";
      const done = doneToday(s.id);
      const durMin = sessionLength(s);
      return `
      <div class="session-row" data-sid="${s.id}">
        <div class="session-ico">${s.em}</div>
        <div class="session-info">
          <b>${s.day} · ${K.esc(s.focus)}</b>
          <span>${K.esc(s.dur)} · ${K.esc(s.tag)}</span>
        </div>
        <div class="session-start ${done ? "session-done" : ""}">${done ? "✅ تم" : "⏱ " + durMin + " د"}</div>
      </div>`;
    }).join("");

    return `
    <div class="animate-in">
      <div class="card" style="background:linear-gradient(140deg,rgba(34,211,238,.12),rgba(163,230,53,.06))">
        <div class="card-title">🎯 ${K.esc(K.PROGRAM.name)}</div>
        <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:10px">
          <span class="chip cyan">📈 ${K.esc(K.PROGRAM.level)}</span>
          <span class="chip lime">⏱ ${K.esc(K.PROGRAM.session)}</span>
          <span class="chip">🗓 ${K.esc(K.PROGRAM.duration)}</span>
          ${K.db.trainee.settings.legendary ? `<span class="chip legend">🔥 أسطوري</span>` : ""}
        </div>
        <p class="sm muted">${K.esc(K.PROGRAM.desc)}</p>
      </div>
      <div class="rows" style="margin-top:14px">${rows}</div>
    </div>`;
  }
  function bindProgram() {
    K.qsa(".session-row").forEach((row) => row.addEventListener("click", () => { location.hash = "/program/" + row.dataset.sid; }));
  }

  /* ================= PROGRAM DETAIL ================= */
  function programDetail(sid) {
    const s = K.SESSIONS.find((x) => x.id === sid);
    if (!s) return `<div class="card">جلسة غير موجودة</div>`;

    let body = "";
    for (const b of s.blocks) {
      const [em, label] = groupLabel[b.t];
      body += `
      <div class="sec" style="margin-top:18px"><h2>${em} ${label}</h2><span class="chip grey">${b.ex.length} تمارين</span></div>
      <div>${b.ex.map((id, i) => {
        const ex = K.EX[id];
        if (!ex) return "";
        return `
        <div class="ex-item">
          <div class="ex-num">${i + 1}</div>
          <div class="ex-body">
            <b>${ex.tempo ? `${K.esc(ex.n)} <span class="chip lime">${K.esc(ex.tempo)}</span>` : K.esc(ex.n)}</b>
            <div class="d">${K.esc(ex.d)}${ex.note ? ` · <span class="cyan" style="color:var(--accent)">${K.esc(ex.note)}</span>` : ""}</div>
          </div>
          <div class="ex-meta">
            <b>${exTarget(ex)}</b>
            <span>راحة ${ex.rest}ث · ${"◆".repeat(diffStars(ex.diff))}</span>
          </div>
        </div>`;
      }).join("")}</div>`;
    }

    return `
    <div class="animate-in">
      <div class="session-row" data-nav="/program" style="cursor:pointer">
        <div class="session-ico">↪</div>
        <div class="session-info"><b>العودة إلى البرنامج</b></div>
      </div>
      <div class="card" style="margin-top:14px">
        <div class="card-title">${s.em} ${s.day} · ${K.esc(s.focus)}</div>
        <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:10px">
          <span class="chip lime">⏱ ${K.esc(s.dur)}</span>
          <span class="chip">🏷 ${K.esc(s.tag)}</span>
        </div>
        <p class="sm muted">${K.esc(s.desc)}</p>
      </div>
      ${body}
      <button class="btn btn-cta btn-primary" style="margin-top:22px" id="start-session">🚀 ابدأ ${s.em} ${K.esc(s.focus)}</button>
    </div>`;
  }
  function bindProgramDetail(sid) {
    const b = K.qs("#start-session");
    if (b) b.addEventListener("click", () => K.Workout.start(sid));
  }

  /* ================= STORE ================= */
  function store() {
    const owned = K.db.trainee.charactersOwned;
    const equipped = K.db.trainee.equippedCharacter;

    const grid = K.CHARS.map((c) => {
      const isOwned = owned.includes(c.id);
      const isEq = equipped === c.id;
      const rarityClass = { "البداية": "r-beg", "نادر": "r-nader", "مميز": "r-mumayez", "أسطوري": "r-asstura", "ميثيقي": "r-mithiqi" }[c.rarity] || "r-beg";
      const statsBar = (s) => `<div class="sbar"><span>قوة</span><div class="s-track"><div class="s-fill" style="width:${s.power * 10}%"></div></div></div>
        <div class="sbar"><span>تحمل</span><div class="s-track"><div class="s-fill" style="width:${s.delay * 10}%"></div></div></div>
        <div class="sbar"><span>مهارة</span><div class="s-track"><div class="s-fill" style="width:${s.skill * 10}%"></div></div></div>`;
      const btn = isEq
        ? `<button class="btn btn-sm btn-success store-btn" disabled>✔ مرتدية</button>`
        : isOwned
          ? `<button class="btn btn-sm btn-primary store-btn" data-act="equip" data-id="${c.id}">ألبسها</button>`
          : `<button class="btn btn-sm store-btn" data-act="buy" data-id="${c.id}" data-price="${c.price}">⭐ ${K.fmt(c.price)} · اشترِ</button>`;
      return `
      <div class="store-card ${isOwned ? "owned" : ""} ${isEq ? "equipped" : ""}">
        <span class="rarity ${rarityClass}">${K.esc(c.rarity)}</span>
        <span class="store-emoji">${c.em}</span>
        <div class="store-name">${K.esc(c.name)}</div>
        <div class="store-desc">${K.esc(c.desc)}</div>
        <span class="store-bonus">${charBonusText(c)}</span>
        <div style="margin-bottom:10px">${statsBar(c.stats)}</div>
        ${btn}
      </div>`;
    }).join("");

    return `
    <div class="animate-in">
      <div class="card">
        <div class="spread">
          <div class="card-title" style="margin-bottom:0">🛍️ متجر الشخصيات</div>
          <div class="pill pill-points"><span class="pill-ico">⭐</span><b>${K.fmt(K.db.stats.points)}</b></div>
        </div>
        <p class="sm muted mt10">اكسب النقاط من التمارين اليومية واشترِ شخصيات رياضية ترفع مكافآتك مثل النمر 🐆 والملك 👑.</p>
      </div>
      <div class="store-grid" style="margin-top:14px">${grid}</div>
    </div>`;
  }
  function bindStore() {
    K.qsa("[data-act]").forEach((btn) => {
      btn.addEventListener("click", async () => {
        const id = btn.dataset.id;
        const act = btn.dataset.act;
        btn.disabled = true;
        if (act === "buy") {
          const r = await K.api.buy(id);
          if (!r.ok) { K.toast(r.data.error ? `❌ ${r.data.error}` + (r.data.need ? ` · تحتاج ${K.fmt(r.data.need)} نقطة` : "") : "❌ لم تتم العملية", "error"); btn.disabled = false; return; }
          if (r.data.achieved && r.data.achieved.length) K.toast(`🎉 شخصية جديدة! + أوسمة: ${r.data.achieved.length}`, "success");
          else K.toast(`🎉 امتلكت "${K.CHARS.find((c) => c.id === id).name}"`, "success");
          await K.refresh();
        } else {
          const r = await K.api.equip(id);
          if (!r.ok) { K.toast(r.data.error || "لم تتم العملية", "error"); btn.disabled = false; return; }
          const c = K.CHARS.find((x) => x.id === id);
          K.toast(`👑 ${c.name} أصبحت بطلك`, "success");
          await K.refresh();
        }
      });
    });
  }

  /* ================= FOOD ================= */
  const FOOD_TYPES = [
    { id: "breakfast", label: "الفطور", em: "🌅", icon: "☀️", tip: "وقود بداية اليوم" },
    { id: "lunch", label: "الغداء", em: "🏞", icon: "☀️", tip: "أهم وجبة" },
    { id: "snack", label: "السناك", em: "⚡", icon: "⚡", tip: "طاقة سريعة" },
    { id: "dinner", label: "العشاء", em: "🌙", icon: "🌙", tip: "دعم التعافي" }
  ];
  const MACRO_TARGET = { p: 120, c: 280, f: 75 };
  const macroChips = (m) => `
    <span class="chip cyan" style="padding:3px 8px;font-size:11px">💪 ${m.p}g</span>
    <span class="chip" style="padding:3px 8px;font-size:11px">🔥 ${m.c}g</span>
    <span class="chip lime" style="padding:3px 8px;font-size:11px">🥑 ${m.f}g</span>`;
  function food() {
    const meals = K.MEALS || [];
    const st = K.db.stats;
    const today = K.key(new Date());
    const dayNum = Math.floor(Date.now() / 86400000);
    const todayLog = (st.mealLog || []).filter((m) => m.date === today);
    const loggedIds = new Set(todayLog.map((m) => m.mealId));

    const slots = FOOD_TYPES.map((t) => {
      const opts = meals.filter((m) => m.type === t.id) || [];
      const chosen = opts[dayNum % opts.length] || opts[0];
      if (!chosen) return "";
      const logged = loggedIds.has(chosen.id);
      return `
      <div class="meal-slot">
        <div class="meal-time">${t.icon} ${K.esc(t.time)}</div>
        <div class="meal-big">${chosen.em}</div>
        <div class="meal-name">${K.esc(chosen.name)}</div>
        <div class="sm muted" style="margin-bottom:8px">${K.esc(t.tip)}</div>
        <div class="meal-macros">${macroChips(chosen)}</div>
        <div class="meal-kcal">${chosen.kcal} <span class="sm">ك.س</span></div>
        <button class="btn btn-sm meal-btn ${logged ? "btn-success" : ""}" ${logged ? "disabled" : ""} data-mid="${chosen.id}">
          ${logged ? "✔ تم تسجيلها" : `سجّلها · 12⭐`}
        </button>
      </div>`;
    }).join("");

    const sumKcal = todayLog.reduce((a, m) => a + (m.kcal || 0), 0);
    const sumP = todayLog.reduce((a, m) => a + ((K.MEALS.find((x) => x.id === m.mealId) || {}).p || 0), 0);
    const sumC = todayLog.reduce((a, m) => a + ((K.MEALS.find((x) => x.id === m.mealId) || {}).c || 0), 0);
    const sumF = todayLog.reduce((a, m) => a + ((K.MEALS.find((x) => x.id === m.mealId) || {}).f || 0), 0);
    const macroBar = (label, val, target, color) => `
      <div class="rowx"><span>${label}</span><b style="color:${color}">${K.fmt(val)} / ${K.fmt(target)}g</b></div>
      <div class="xp-track" style="height:8px;margin:2px 0 8px"><div class="xp-fill" style="width:${Math.min(100, (val / target) * 100)}%;background:${color}"></div></div>`;

    const typeFilter = (f, label) => `<span class="chip ${f === "all" ? "cyan" : ""}" data-f="${f}" style="cursor:pointer">${label}</span>`;
    const grid = meals.map((m) => `
      <div class="meal-card" data-type="${m.type}">
        <div class="meal-card-em">${m.em}</div>
        <b style="font-size:12.5px;line-height:1.4">${K.esc(m.name)}</b>
        <div class="sm muted">${m.kcal} ك.س · ${K.esc(m.tags.join(" · "))}</div>
        <div class="meal-macros">${macroChips(m)}</div>
        <button class="btn btn-sm meal-btn ${loggedIds.has(m.id) ? "btn-success" : ""}" ${loggedIds.has(m.id) ? "disabled" : ""} data-mid="${m.id}">
          ${loggedIds.has(m.id) ? "✔ تم" : "تسجيل"}
        </button>
      </div>`).join("");

    return `
    <div class="animate-in">
      <div class="card" style="background:linear-gradient(140deg,rgba(240,185,67,.12),rgba(232,149,58,.05))">
        <div class="spread">
          <div class="card-title" style="margin-bottom:0">🍽 قسم الغذاء</div>
          <div class="pill pill-streak" title="سلسلة التغذية"><span class="pill-ico">🥗</span><b>${K.fmt(st.mealStreak || 0)}</b></div>
        </div>
        <p class="sm muted mt10">وجبات بسيطة ومغذية (بطاطا · بيض · طون · شوفان · سلطة). كل وجبة مسجلة = <b style="color:var(--accent)">12⭐</b>، وأول نشاط في اليوم ياخذ <b style="color:var(--accent)">+5⭐</b> إضافية.</p>
      </div>

      <div class="sec" style="margin-top:16px"><h2>🌤 وجبات اليوم <small class="muted">(${todayLog.length}/4 مسجلة)</small></h2></div>
      <div class="meal-slots">${slots}</div>

      <div class="card" style="margin-top:14px">
        <div class="card-title" style="margin-bottom:10px">📊 مغذيات اليوم</div>
        <div class="rowx"><span>🍽 السعرات المسجلة</span><b style="color:var(--gold)">${K.fmt(sumKcal)} ك.س</b></div>
        <div class="xp-track" style="height:8px;margin:2px 0 10px"><div class="xp-fill" style="width:${Math.min(100, (sumKcal / 2400) * 100)}%;background:var(--gold)"></div></div>
        ${macroBar("💪 البروتين", sumP, MACRO_TARGET.p, "var(--accent)")}
        ${macroBar("🔥 الكربوهيدرات", sumC, MACRO_TARGET.c, "var(--gold)")}
        ${macroBar("🥑 الدهون", sumF, MACRO_TARGET.f, "var(--lime)")}
      </div>

      ${todayLog.length ? `
      <div class="sec" style="margin-top:16px"><h2>🗂 ما أكلته اليوم</h2></div>
      <div class="rows">${todayLog.map((m) => `
        <div class="rowx"><span>${m.em} ${K.esc(m.name)} <small>· ${m.at ? new Date(m.at).toLocaleTimeString("ar", { hour: "2-digit", minute: "2-digit" }) : "اليوم"}</small></span><b>+${m.points}⭐</b></div>`).join("")}</div>` : ""}

      <div class="sec" style="margin-top:16px"><h2>🍱 كل الوجبات</h2></div>
      <div class="chips" id="food-filters" style="margin-bottom:12px">
        ${typeFilter("all", "الكل")}
        ${FOOD_TYPES.map((t) => typeFilter(t.id, t.label)).join("")}
      </div>
      <div class="meal-grid" id="meal-grid">${grid}</div>

      <footer class="credit" style="margin-top:22px">
        <span class="sm muted">مدربك الذكي يبني لك خطة أكل مفصّلة — اسأله في قسم «المدرب» 👇</span>
      </footer>
    </div>`;
  }
  function bindFood() {
    const done = async (btn) => {
      const mid = btn.dataset.mid;
      btn.disabled = true;
      const r = await K.api.meal(mid);
      if (!r.ok) { K.toast(r.data.error ? `❌ ${r.data.error}` : "❌ لم تتم العملية", "error"); btn.disabled = false; return; }
      const meal = (K.MEALS || []).find((m) => m.id === mid) || {};
      if (r.data.achieved && r.data.achieved.length) K.toast(`🎉 ${meal.em} مسجلة! +${r.data.gained.points}⭐ وأوسمة جديدة 🎉`, "success");
      else K.toast(`${meal.em} ${meal.name} → +${r.data.gained.points}⭐`, "success");
      if (r.data.gained.mealStreak > (K.db.stats.mealStreak || 0)) {
        setTimeout(() => K.toast(`🥗 سلسلة التغذية: ${r.data.gained.mealStreak} يوم 🔥`, "success"), 700);
      }
      await K.refresh();
    };
    K.qsa(".meal-btn").forEach((btn) => btn.addEventListener("click", () => done(btn)));
    const filters = K.qs("#food-filters");
    if (filters) {
      filters.addEventListener("click", (e) => {
        const chip = e.target.closest("[data-f]");
        if (!chip) return;
        const f = chip.dataset.f;
        filters.querySelectorAll("[data-f]").forEach((c) => c.classList.toggle("cyan", c === chip));
        K.qsa("#meal-grid .meal-card").forEach((card) => {
          card.classList.toggle("hidden", f !== "all" && card.dataset.type !== f);
        });
      });
    }
  }

  /* ================= STATS ================= */
  function stats() {
    const st = K.db.stats;
    const achOwned = K.ach.filter((a) => a.unlocked).length;
    const chart = chartBars();
    const records = [...K.db.records].reverse();

    return `
    <div class="animate-in">
      <div class="card">
        <div class="card-title">📊 إحصائياتك</div>
        <div class="statgrid">
          <div class="stat"><div class="n" style="color:var(--accent)">${K.fmt(st.points)}</div><div class="l">⭐ النقاط</div></div>
          <div class="stat"><div class="n" style="color:var(--gold)">${K.fmt(st.streak)}</div><div class="l">🔥 السلسلة</div></div>
          <div class="stat"><div class="n" style="color:var(--purple)">${K.fmt(st.xp)}</div><div class="l">✦ XP</div></div>
          <div class="stat"><div class="n" style="color:var(--accent2)">${K.fmt(st.totalWorkouts)}</div><div class="l">🏋️ التمارين</div></div>
          <div class="stat"><div class="n">${K.fmt(st.totalMinutes)}</div><div class="l">⏱ الدقائق</div></div>
          <div class="stat"><div class="n" style="color:var(--gold)">${K.fmt(st.bestSessionPoints)}</div><div class="l">🏆 أفضل جلسة</div></div>
          <div class="stat"><div class="n">${K.fmt(st.totalPush)}</div><div class="l">💪 الضغط</div></div>
          <div class="stat"><div class="n">${K.fmt(st.totalPull)}</div><div class="l">🦾 السحب</div></div>
          <div class="stat"><div class="n">${K.fmt(st.totalDips)}</div><div class="l">🔱 الغاطس</div></div>
        </div>
      </div>

      <div class="card" style="margin-top:14px">
        <div class="card-title">📈 آخر 14 يوماً <small>النقاط المكتسبة</small></div>
        <div class="chart">${chart}</div>
      </div>

      <div class="card" style="margin-top:14px">
        <div class="card-title">🍽 التغذية</div>
        <div class="statgrid">
          <div class="stat"><div class="n" style="color:var(--lime)">${K.fmt(st.mealCount || 0)}</div><div class="l">🥗 وجبات مسجلة</div></div>
          <div class="stat"><div class="n" style="color:var(--gold)">${K.fmt(st.kcal || 0)}</div><div class="l">🔥 سعرات</div></div>
          <div class="stat"><div class="n" style="color:var(--accent)">${K.fmt(st.mealStreak || 0)}</div><div class="l">🥗 سلسلة التغذية</div></div>
        </div>
      </div>

      ${records.length ? `<div class="card" style="margin-top:14px">
        <div class="card-title">🎯 أرقامك الشخصية القياسية</div>
        <div class="rows">${records.map((r) => `
          <div class="rowx"><span>${r.name === "الضغط" ? "💪" : r.name === "السحب" ? "🦾" : "🔱"} ${K.esc(r.name)}</span><b>${K.fmt(r.val)} <small>${r.date}</small></b></div>`).join("")}</div>
      </div>` : ""}

      ${section("الأوسمة", "")}
      <div class="card">
        <div class="rows"><div class="rowx"><span>🏅 الأوسمة المكتسبة</span><b>${achOwned} / ${K.ach.length}</b></div></div>
      </div>
      <div class="ach-grid" style="margin-top:12px">
        ${K.ach.map((a) => `
        <div class="ach ${a.unlocked ? "" : "locked"}">
          <div class="em">${a.unlocked ? a.em : "🔒"}</div>
          <b>${K.esc(a.title)}</b><span>${K.esc(a.desc)}</span>
        </div>`).join("")}
      </div>
    </div>`;
  }
  function chartBars() {
    const days = [];
    for (let i = 13; i >= 0; i--) {
      const d = new Date(Date.now() - i * 86400000);
      days.push({ k: K.key(d), label: ["أحد", "اثن", "ثلا", "أرب", "خمي", "جمع", "سبت"][d.getDay()] });
    }
    const byDate = {};
    for (const h of K.db.history) byDate[h.date] = (byDate[h.date] || 0) + h.points;
    const max = Math.max(1, ...days.map((d) => byDate[d.k] || 0));
    return days.map((d) => {
      const v = byDate[d.k] || 0;
      const h = Math.max(v > 0 ? 8 : 3, (v / max) * 100);
      return `<div class="bar" style="height:${h}%"><span>${v > 0 ? (v >= 1000 ? `${Math.round(v / 100)}k` : v) : "·"}</span></div>`;
    }).join("");
  }
  function bindStats() {}

  /* ================= MORE ================= */
  function more() {
    const s = K.db.trainee.settings;
    const user = K.user || { username: K.db.trainee.name || "" };
    return `
    <div class="animate-in">
      ${K.canInstall ? K.canInstall() ? `
      <div class="card" style="border-color:rgba(240,185,67,.35);background:linear-gradient(160deg,rgba(240,185,67,.10),rgba(10,11,15,0.2))">
        <div class="card-title" style="margin-bottom:4px">📱 تطبيق على هاتفك</div>
        <p class="sm muted" style="margin:0 0 12px">ثبّت «${K.esc(K.APP.name)}» كتطبيق مستقل — يُفتح بنقرة واحدة ويعمل أسرع.</p>
        <button class="btn btn-cta btn-primary" id="install-app">⬇️ إنزال التطبيق الآن</button>
      </div>
      <div style="height:14px"></div>` : "" : ""}
      <div class="card" style="border-color:rgba(34,211,238,.18)">
        <div class="spread">
          <div class="card-title" style="margin-bottom:0">👤 حسابك</div>
          <button class="btn btn-sm" id="logout-btn" style="background:rgba(248,113,113,.12);color:var(--danger)">⏻ خروج</button>
        </div>
        <div class="rowx" style="margin-top:6px"><span>اسم المستخدم</span><b>${K.esc(user.username)}</b></div>
        <p class="sm muted" style="margin:4px 0 0">سجل الدخول من أي جهاز يبق لك في متناول يدك تدريبك ونقاطك.</p>
      </div>
      <div class="card" style="margin-top:14px;border-color:rgba(34,211,238,.25)">
        <div class="card-title" style="margin-bottom:4px">🔔 الإشعارات</div>
        <div class="set-row">
          <div><b>إشعارات الهاتف</b><small>تنبيه عند إنجاز التمرين (تعمل من المتصفح عبر HTTPS)</small></div>
          <div class="switch pswitch" id="sw-push" data-k="push"></div>
        </div>
        <button class="btn btn-sm mt10" id="test-push">📨 إرسال إشعار تجريبي</button>
      </div>
      <div class="card" style="border-color:rgba(240,185,67,.18)">
        <div class="card-title" style="margin-bottom:4px">🗂 الأقسام</div>
        <div class="menu-row" data-nav="/food"><span class="menu-ico">🍽</span><b>قسم الغذاء</b><small>وجباتك ونقاط الأكل</small><span class="menu-go">←</span></div>
        <div class="menu-row" data-nav="/store"><span class="menu-ico">🛍️</span><b>متجر الشخصيات</b><small>اشترِ أبطالك بالنقاط</small><span class="menu-go">←</span></div>
        <div class="menu-row" data-nav="/stats"><span class="menu-ico">📊</span><b>إحصائياتك</b><small>التقدم والأوسمة</small><span class="menu-go">←</span></div>
        <div class="menu-row" data-nav="/coach"><span class="menu-ico">🤖</span><b>المدرب الذكي</b><small>أي سؤال عن التدريب والأكل</small><span class="menu-go">←</span></div>
      </div>
      <div class="card" style="margin-top:14px">
        <div class="card-title">👑 عن التطبيق</div>
        <div class="center">
          <div style="font-size:44px">👑</div>
          <b style="font-size:17px">${K.esc(K.APP.name)} ${K.esc(K.APP.nameEn)}</b>
          <div class="sm muted mt10">${K.esc(K.APP.slogan)}</div>
          <div class="chips" style="justify-content:center">
            <span class="chip cyan">الإصدار ${K.esc(K.APP.version)}</span>
            <span class="chip lime">🤖 مدعوم بالذكاء الاصطناعي</span>
          </div>
          <div class="mt16">
            <span class="chip" style="padding:10px 16px;font-size:13px">👑 التأسيس والإبداع: <b style="color:var(--accent)">${K.esc(K.APP.founder)}</b></span>
          </div>
          <p class="sm muted mt16" style="max-width:280px;margin:14px auto 0">من مستوى ${K.esc(K.PROGRAM.level)}، بأرقام ${K.esc(K.APP.player.maxPush)} ضغطة / ${K.esc(K.APP.player.maxPull)} سحبة / ${K.esc(K.APP.player.maxDips)} غاطسة، ومدد ${K.esc(K.PROGRAM.session)} يومياً.</p>
        </div>
      </div>

      <div class="card" style="margin-top:14px">
        <div class="card-title">⚙️ الإعدادات</div>
        <div class="set-row" style="border-color:rgba(52,211,153,.22)">
          <div><b style="color:var(--good)">🔥 الوضع الأسطوري</b><small>تمرين أقسى: مجموعة إضافية + راحة أقصر + هدف أعلى</small></div>
          <div class="switch ${s.legendary ? "on" : ""}" id="sw-legendary" data-k="legendary"></div>
        </div>
        <div class="set-row">
          <div><b>الاسم</b><small>الاسم الذي يناديك به المدرب</small></div>
          <input id="set-name" type="text" value="${K.esc(K.db.trainee.name)}" style="width:120px;background:var(--surface);border:1px solid var(--card-border);border-radius:10px;padding:8px 10px;color:var(--text);font-family:var(--font);font-size:13px" />
        </div>
        <div class="set-row">
          <div><b>الأصوات</b><small>نغمات نهاية الجولة والجلسة</small></div>
          <div class="switch ${s.sound ? "on" : ""}" id="sw-sound" data-k="sound"></div>
        </div>
        <div class="set-row">
          <div><b>الاهتزاز</b><small>تنبيهات ذبذبة على الهاتف</small></div>
          <div class="switch ${s.vibration ? "on" : ""}" id="sw-vib" data-k="vibration"></div>
        </div>
        <button class="btn btn-sm mt10" id="save-name">💾 حفظ الاسم</button>
      </div>

      <div class="card" style="margin-top:14px;border-color:rgba(248,113,113,.25)">
        <div class="card-title">⚠️ منطقة الخطر</div>
        <p class="sm muted">حذف كل التقدم والنقاط والجوائز نهائياً.</p>
        <button class="btn btn-sm btn-danger mt10" id="reset-all">🗑 إعادة تعيين كل شيء</button>
      </div>
    </div>`;
  }
  function bindMore() {
    const inst = K.qs("#install-app");
    if (inst) inst.addEventListener("click", () => K.install());
    const name = K.qs("#set-name");
    const save = K.qs("#save-name");
    if (save) save.addEventListener("click", async () => {
      await K.api.settings({ name: name.value });
      K.toast("💾 تم حفظ الاسم", "success");
      K.refresh();
    });
    const sws = K.qsa(".switch");
    sws.forEach((sw) => {
      sw.addEventListener("click", async () => {
        const key = sw.dataset.k;
        if (key === "push") return;
        const on = !sw.classList.contains("on");
        sw.classList.toggle("on", on);
        await K.api.settings({ [key]: on });
        K.db.trainee.settings[key] = on;
        K.soundOn = K.db.trainee.settings.sound;
        K.vibOn = K.db.trainee.settings.vibration;
        if (on) { K.beepGo(); K.vibrate(30); }
      });
    });

    /* ---------- push notifications ---------- */
    const pushSw = K.qs("#sw-push");
    if (pushSw) {
      const setPush = async (on, sw) => {
        sw.classList.toggle("on", on);
        try {
          if (on) {
            if (!K.isSecure()) {
              K.toast("🔔 الإشعارات تعمل من المتصفح (Chrome) عبر HTTPS", "error");
              sw.classList.remove("on"); return;
            }
            if (window.Notification && Notification.permission !== "granted") {
              const p = await Notification.requestPermission();
              if (p !== "granted") { sw.classList.remove("on"); K.toast("❌ رفضت الإذن", "error"); return; }
            }
            const reg = await navigator.serviceWorker.ready;
            let sub = await reg.pushManager.getSubscription();
            if (!sub) {
              const v = await K.api.push.vapid();
              if (!v.ok || !v.data.publicKey) { sw.classList.remove("on"); K.toast("الخادم بدون مفاتيح دفع", "error"); return; }
              sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: K.b64u(v.data.publicKey) });
            }
            const r = await K.api.push.subscribe(JSON.parse(JSON.stringify(sub)));
            if (!r.ok || !r.data.saved) { sw.classList.remove("on"); K.toast("تعذر تفعيل الإشعارات", "error"); return; }
            K.toast("🔔 الإشعارات مفعّلة", "success");
          } else {
            const reg = await navigator.serviceWorker.ready.catch(() => null);
            if (reg && reg.pushManager) { const sub = await reg.pushManager.getSubscription(); if (sub) await sub.unsubscribe(); }
            await K.api.push.subscribe(null);
            K.toast("🔕 أوقفت الإشعارات", "success");
          }
        } catch (e) {
          sw.classList.remove("on");
          K.toast("❌ " + (e && e.message ? e.message : "تعذر تفعيل الإشعارات"), "error");
        }
      };
      if (K.isSecure() && navigator.serviceWorker && navigator.serviceWorker.ready) {
        navigator.serviceWorker.ready
          .then((r) => r.pushManager.getSubscription())
          .then((s) => { if (s) pushSw.classList.add("on"); })
          .catch(() => {});
      }
      pushSw.addEventListener("click", () => setPush(!pushSw.classList.contains("on"), pushSw));
    }
    const tp = K.qs("#test-push");
    if (tp) tp.addEventListener("click", async () => {
      const r = await K.api.push.test();
      K.toast(r.ok ? "📨 أُرسل إشعار تجريبي" : ("⚠ " + (r.data.error || "فعّل الإشعارات أولاً")), r.ok ? "success" : "error");
    });
    const lg = K.qs("#logout-btn");
    if (lg) lg.addEventListener("click", async () => { if (confirm("تسجيل الخروج؟")) K.logout(); });

    const reset = K.qs("#reset-all");
    if (reset) reset.addEventListener("click", async () => {
      if (!confirm("متأكد؟ سيتم حذف كل التقدم والنقاط نهائياً!")) return;
      const r = await K.api.reset();
      if (r.ok) { K.toast("🗑 تمت إعادة التعيين", "success"); K.refresh(); }
    });
  }

  /* ================= COACH ================= */
  function coach() {
    const msgs = K.coachMessages || [];
    const first = msgs.length === 0;
    const list = first
      ? renderCoachMsg({ role: "assistant", content: `أهلاً ${K.esc(K.db.trainee.name)} 👋 أنا «كوتش ${K.esc(K.APP.name)}»، مدربك الذكي من تطبيق ${K.esc(K.APP.name)}. أعرف أرقامك: ${K.APP.player.maxPush} ضغطة · ${K.APP.player.maxPull} سحبة · ${K.APP.player.maxDips} غاطسة، وهدفك القوة وتقوية الأعصاب.

اسألني أي شيء: خطة، تقنية تمرين، تغذية، أو حتى «من صنعك؟» 😉` })
      : msgs.map((m) => renderCoachMsg(m)).join("");

    return `
    <div class="animate-in chat-wrap">
      <div class="card">
        <div class="spread">
          <div class="card-title" style="margin-bottom:0">🤖 المدرب الذكي</div>
          <span class="chip cyan">● متصل</span>
        </div>
      </div>
      <div class="chat-list" id="chat-list">
        ${list}
        <div id="typing" class="hidden"><div class="coach-avatar"><div class="my-avatar">🤖</div><div class="typing"><i></i><i></i><i></i></div></div></div>
      </div>
      <div class="chips" id="quick-chips">
        <span class="chip" data-q="خطة أكل ليوم كامل بالمغذيات">🍽 خطة أكل ليوم</span>
        <span class="chip cyan" data-q="خطة أسبوعية لمستواي">📅 خطة أسبوعية</span>
        <span class="chip lime" data-q="كيف أحسن وقتي تحت الشد لتقوية الأعصاب؟">🧠 اتصال عصبي</span>
        <span class="chip" data-q="نصيحة تقنية للضغط والغاطس">💪 تقنية الضغط</span>
        <span class="chip" data-q="كيف أزيد من 20 سحبة؟">🦾 سحب أقوى</span>
        <span class="chip" data-q="من صنعك؟">🛠 من صنعك؟</span>
      </div>
      <div class="chat-input">
        <input id="chat-in" type="text" placeholder="اكتب سؤالك هنا…" />
        <button class="send-btn" id="chat-send">➤</button>
      </div>
    </div>`;
  }
  function renderCoachMsg(m) {
    if (m.role === "user") return `<div class="msg msg-user">${K.esc(m.content)}</div>`;
    return `<div class="coach-avatar"><div class="my-avatar">🤖</div><div class="msg msg-coach">${K.esc(m.content)}</div></div>`;
  }
  function bindCoach() {
    const list = K.qs("#chat-list");
    const input = K.qs("#chat-in");
    const typing = K.qs("#typing");
    const send = async () => {
      const txt = (input.value || "").trim();
      if (!txt) return;
      input.value = "";
      K.coachMessages = K.coachMessages || [];
      K.coachMessages.push({ role: "user", content: txt });
      list.insertAdjacentHTML("beforeend", renderCoachMsg({ role: "user", content: txt }));
      typing.classList.remove("hidden");
      list.scrollTop = list.scrollHeight;
      const r = await K.api.chat(K.coachMessages);
      typing.classList.add("hidden");
      if (r.ok) {
        const text = (r.data.text || "").trim();
        K.coachMessages.push({ role: "assistant", content: text });
        list.insertAdjacentHTML("beforeend", renderCoachMsg({ role: "assistant", content: text }));
        K.beepTick();
      } else {
        const fallback = ["🔥 قوة في التمرين تكون عندك في الخصوص، صبر علي وخطة وبالوقت. جرب ما أنت جاوبتي آنية العينية؟", "أنا هنا لكن الاتصال بالمودل انقطع. دوزلي شبكة وإن شاء الله أنجيب. 📶"].join("\n");
        K.toast("⚠ المدرب غير متصل — تحقق من الإنترنت", "error");
        list.insertAdjacentHTML("beforeend", renderCoachMsg({ role: "assistant", content: fallback }));
      }
      list.scrollTop = list.scrollHeight;
    };
    K.qs("#chat-send").addEventListener("click", send);
    input.addEventListener("keydown", (e) => { if (e.key === "Enter") send(); });
    K.qsa("#quick-chips .chip").forEach((c) => c.addEventListener("click", () => { input.value = c.dataset.q; send(); }));
  }

  /* ---------- svg ---------- */
  function svgSpark() {
    return `<svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M13 2 4 14h6l-1 8 9-12h-6l1-8z" fill="#f0b943"/></svg>`;
  }

  /* ---------- export ---------- */
  K.views = { home, program, programDetail, food, store, stats, more, coach };
  K.bind = { home: bindHome, program: bindProgram, programDetail: bindProgramDetail, food: bindFood, store: bindStore, stats: bindStats, more: bindMore, coach: bindCoach };
})();