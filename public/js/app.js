/* سيد الجسد — إقلاع التطبيق والملاحة */
(() => {
  const K = window.KX;

  K.authMode = K.authMode || "login";

  const NAV_MAP = ["/home", "/program", "/food", "/coach", "/more"];

  function applyNav() {
    const raw = location.hash.replace(/^#/, "") || "/home";
    K.qsa(".nav-item").forEach((el) => {
      const t = el.dataset.nav;
      el.classList.toggle("active", raw === t || (t === "/program" && raw.startsWith("/program/")));
    });
  }

  function applyUI() {
    const st = K.db.stats;
    K.qs("#pill-streak").textContent = K.fmt(st.streak);
    K.qs("#pill-points").textContent = K.fmt(st.points);
    applyNav();
  }

  function mergeAch() {
    const meta = K.achMeta || [];
    const unlocked = K.db.achievements || [];
    K.ach = meta.map((m) => ({ ...m, unlocked: unlocked.some((x) => x.id === m.id) }));
  }

  async function loadAll() {
    const [s, a, sh] = await Promise.all([K.api.state(), K.api.achievements(), K.api.shared()]);
    if (s.status === 401) { K.showAuth(); return; }
    if (!s.ok || !sh.ok) {
      K.qs("#view").innerHTML = `
        <div class="card center" style="margin-top:40px">
          <div style="font-size:44px">📡</div>
          <h2>لا يمكن الوصول إلى السيرفر</h2>
          <p class="sm muted">تأكد أن السيرفر يعمل (node server.js) ثم أعد المحاولة.</p>
          <button class="btn btn-primary" id="retry" style="margin-top:14px">↻ إعادة المحاولة</button>
        </div>`;
      K.qs("#retry").addEventListener("click", () => loadAll().then(() => router()));
      return;
    }
    applyLoaded(s, a, sh);
  }

  function applyLoaded(s, a, sh) {
    K.APP = s.data.app;
    K.PROGRAM = s.data.program;
    K.PLAN = s.data.plan;
    K.level = s.data.level;
    K.db = s.data.db;
    K.achMeta = a.ok ? a.data.list : [];
    mergeAch();

    K.SESSIONS = sh.data.sessions;
    K.EX = sh.data.exercises;
    K.CHARS = sh.data.characters;
    K.MOT = sh.data.motivation;
    K.MEALS = sh.data.meals || [];

    K.soundOn = K.db.trainee.settings.sound;
    K.vibOn = K.db.trainee.settings.vibration;

    K.qs("#topbar").classList.remove("hidden");
    K.qs("#nav").classList.remove("hidden");
    K._authing = false;
    applyUI();
    router();
  }

  function authHtml() {
    return `
    <div class="auth animate-in">
      <div class="center" style="margin-bottom:18px">
        <div class="auth-logo">👑</div>
        <h1 style="margin:6px 0 2px">سيد الجسد</h1>
        <div class="sm muted">BODY KING · سجل دخولك لتواصل إنجازاتك</div>
      </div>
      <div class="auth-tabs">
        <button class="auth-tab active" id="tab-login">تسجيل الدخول</button>
        <button class="auth-tab" id="tab-reg">حساب جديد</button>
      </div>
      <form id="auth-form" class="card" style="margin-top:12px">
        <div class="f-row" id="f-name-row" style="${K.authMode === "reg" ? "" : "display:none"}">
          <label>اسمك (يناديك به المدرب)</label>
          <input id="a-name" type="text" placeholder="اسمي…" autocomplete="name" />
        </div>
        <div class="f-row">
          <label>اسم المستخدم</label>
          <input id="a-user" type="text" placeholder="مثلاً: zaki" autocomplete="username" />
        </div>
        <div class="f-row">
          <label>كلمة المرور</label>
          <input id="a-pass" type="password" placeholder="••••••" autocomplete="current-password" />
        </div>
        <div class="sm muted f-row" id="a-hint" style="margin-top:2px">${K.authMode === "reg" ? "4 أحرف على الأقل. ستحفظ بياناتك في حسابك الخاص وتصل إليها من أي جهاز." : "تستخدم بياناتها للحساب القديم: zaki"}</div>
        <div class="f-hide" id="a-err" style="display:none"></div>
        <button class="btn btn-cta btn-primary" type="submit" id="a-submit" style="width:100%">${K.authMode === "reg" ? "✨ إنشاء حسابي" : "🚀 دخول"}</button>
      </form>
      <p class="sm muted center" style="margin-top:14px">📱 الإشعارات والأسئلة تعمل من المتصفح (Chrome) عبر HTTPS.</p>
    </div>`;
  }

  async function submitAuth(e) {
    e.preventDefault();
    const mode = K.authMode || "login";
    const username = (K.qs("#a-user").value || "").trim();
    const password = K.qs("#a-pass").value || "";
    const err = K.qs("#a-err");
    const btn = K.qs("#a-submit");
    err.style.display = "none";
    btn.disabled = true;
    let r;
    if (mode === "reg") {
      r = await K.api.auth.register({ username, password, name: K.qs("#a-name").value });
    } else {
      r = await K.api.auth.login({ username, password });
    }
    btn.disabled = false;
    if (!r.ok) {
      err.textContent = r.data.error || "حدث خطأ، حاول مجدداً";
      err.style.display = "block";
      return;
    }
    try { window.localStorage.setItem("kx_token", r.data.token); } catch (_) {}
    K.user = r.data.user || null;
    K.authMode = "login";
    K.enterApp();
  }

  K.showAuth = () => {
    K._authing = true;
    K.qs("#topbar").classList.add("hidden");
    K.qs("#nav").classList.add("hidden");
    K.qs("#view").innerHTML = authHtml();
    if (K.authMode === "reg") { K.qs("#tab-reg").classList.add("active"); K.qs("#tab-login").classList.remove("active"); }
    K.qs("#tab-login").addEventListener("click", () => { K.authMode = "login"; K.showAuth(); });
    K.qs("#tab-reg").addEventListener("click", () => { K.authMode = "reg"; K.showAuth(); });
    K.qs("#auth-form").addEventListener("submit", submitAuth);
  };

  K.enterApp = async () => {
    const s = await K.api.state();
    if (!s.ok) { if (s.status === 401) K.showAuth(); return; }
    const a = await K.api.achievements();
    const sh = await K.api.shared();
    applyLoaded(s, a.ok ? a : { ok: true, data: { list: K.achMeta || [] } }, sh);
  };

  K.logout = async () => {
    await K.api.auth.logout();
    try { window.localStorage.removeItem("kx_token"); } catch (_) {}
    K.enterApp();
  };

  window.addEventListener("kx:unauthorized", () => {
    if ((location.hash || "").replace(/^#/, "")) K.showAuth();
  });

  /* ---------- router ---------- */
  function router() {
    if (K._authing) return;
    const raw = location.hash.replace(/^#/, "") || "/home";
    const seg = raw.split("/").filter(Boolean);
    const v = K.qs("#view");
    let html, bindFn;

    if (raw === "/home") { html = K.views.home(); bindFn = K.bind.home; }
    else if (seg[0] === "program" && seg[1]) {
      html = K.views.programDetail(seg[1]);
      bindFn = () => K.bind.programDetail(seg[1]);
    }
    else if (raw === "/program") { html = K.views.program(); bindFn = K.bind.program; }
    else if (raw === "/food") { html = K.views.food(); bindFn = K.bind.food; }
    else if (raw === "/store") { html = K.views.store(); bindFn = K.bind.store; }
    else if (raw === "/stats") { html = K.views.stats(); bindFn = K.bind.stats; }
    else if (raw === "/more") { html = K.views.more(); bindFn = K.bind.more; }
    else if (raw === "/coach") { html = K.views.coach(); bindFn = K.bind.coach; }
    else { location.hash = "/home"; return; }

    v.innerHTML = html;
    if (bindFn) bindFn();
    applyNav();
    window.scrollTo(0, 0);
  }

  /* ---------- global click delegation (data-nav) ---------- */
  document.addEventListener("click", (e) => {
    const el = e.target.closest("[data-nav]");
    if (el) { const t = el.dataset.nav; if (t) location.hash = t; }
  });
  window.addEventListener("hashchange", router);

  /* ---------- public ---------- */
  K.refresh = async (silent = false) => {
    const [s, a] = await Promise.all([K.api.state(), K.api.achievements()]);
    if (s.ok) {
      K.APP = s.data.app;
      K.PROGRAM = s.data.program;
      K.PLAN = s.data.plan;
      K.level = s.data.level;
K.db = s.data.db;
    K.user = s.data.user || null;
    }
    if (a.ok) { K.achMeta = a.data.list; mergeAch(); }
    applyUI();
    if (!silent) router();
  };

  /* ---------- PWA install ---------- */
  let dInst = null;
  function rerenderIfMore() {
    if ((location.hash || "").replace(/^#/, "") === "/more") router();
  }
  if ("serviceWorker" in navigator && "onbeforeinstallprompt" in window) {
    window.addEventListener("beforeinstallprompt", (e) => { e.preventDefault(); dInst = e; rerenderIfMore(); });
  }
  window.addEventListener("appinstalled", () => { dInst = null; rerenderIfMore(); K.toast("✅ تم إنزال التطبيق!", "success"); });
  K.canInstall = () => !!dInst;
  K.install = () => { if (dInst) { const ev = dInst; dInst = null; ev.prompt(); } };

  /* ---------- boot ---------- */
  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.register("/sw.js").catch(() => {});
  }
  loadAll();
})();