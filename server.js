"use strict";
/*
  سيد الجسد — BODY KING
  تأسيس وإنشاء: محمد غناي (Mohamed Ghannai)
  تطبيق كاليستينيكس احترافي + مدرب ذكاء اصطناعي (Gemini proxy)
  Zero-dependency Node.js server
*/
const http = require("node:http");
const https = require("node:https");
const fs = require("node:fs");
const path = require("node:path");
const os = require("node:os");
const crypto = require("node:crypto");
const dns = require("node:dns");
const { execFile } = require("node:child_process");

try { dns.setDefaultResultOrder("ipv4first"); } catch (_) {}

const ROOT = __dirname;
const PUBLIC = path.join(ROOT, "public");
const SHARED_FILE = path.join(ROOT, "shared.json");

/* ---------------- env ---------------- */
function loadEnv() {
  const env = {};
  try {
    const txt = fs.readFileSync(path.join(ROOT, ".env"), "utf8");
    for (const line of txt.split("\n")) {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/i);
      if (m) env[m[1]] = m[2].trim();
    }
  } catch (_) {}
  return env;
}
const ENV = loadEnv();
const GEMINI_KEY = ENV.GEMINI_API_KEY || process.env.GEMINI_API_KEY || "";
const GEMINI_MODEL = ENV.GEMINI_MODEL || process.env.GEMINI_MODEL || "gemini-3.6-flash";
const PORT = parseInt(process.env.PORT || ENV.PORT || "8080", 10);
const HOST = process.env.HOST || "0.0.0.0";
const DATA_DIR = (process.env.DATA_DIR || ENV.DATA_DIR || path.join(ROOT, "data"));
const DB_FILE = path.join(DATA_DIR, "db.json");
const VAPID_PUBLIC_KEY = process.env.VAPID_PUBLIC_KEY || ENV.VAPID_PUBLIC_KEY || "";
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY || ENV.VAPID_PRIVATE_KEY || "";
const VAPID_SUBJECT = process.env.VAPID_SUBJECT || ENV.VAPID_SUBJECT || "mailto:bodyking@local";

/* ---------------- Web Push (VAPID) ---------------- */
let webpush = null;
if (VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY) {
  try {
    webpush = require("web-push");
    webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);
  } catch (e) {
    console.error("⚠️  web-push غير متوفر:", e.message);
    webpush = null;
  }
}
function sendPush(user, title, body, url) {
  if (!webpush || !user || !user.pushSub) return Promise.resolve();
  return webpush.sendNotification(user.pushSub, JSON.stringify({ title, body, url: url || "/" }))
    .catch((e) => { console.error("push error:", e.message); });
}

/* ---------------- shared data ---------------- */
let SHARED = null;
try { SHARED = JSON.parse(fs.readFileSync(SHARED_FILE, "utf8")); } catch (e) {
  console.error("⚠️  تعذر تحميل shared.json:", e.message);
  process.exit(1);
}
const EX = SHARED.exercises;
const SESSIONS = SHARED.sessions;
const CHARS = SHARED.characters;

/* ---------------- DB (persist) ---------------- */
function dayKey(d) {
  const t = d || new Date();
  return `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, "0")}-${String(t.getDate()).padStart(2, "0")}`;
}
function userDefaults() {
  return {
    trainee: {
      name: (SHARED.app.player && SHARED.app.player.name) || "محمد",
      baseMax: { push: 70, pull: 20, dips: 25 },
      charactersOwned: ["rookie"],
      equippedCharacter: "rookie",
      settings: { sound: true, vibration: true, legendary: true, shieldUsedDate: null }
    },
    stats: {
      xp: 0, points: 0, streak: 0, lastWorkoutDay: null,
      totalWorkouts: 0, totalPush: 0, totalPull: 0, totalDips: 0,
      totalSets: 0, qualitySets: 0, totalMinutes: 0,
      bestSessionPoints: 0, best: { push: 0, pull: 0, dips: 0 },
      mealLog: [], mealCount: 0, kcal: 0, mealStreak: 0, lastMealDay: null
    },
    history: [],
    records: [],
    achievements: [],
    pushSub: null
  };
}
function mergeUser(u) {
  const base = userDefaults();
  u = u || {};
  const trainee = Object.assign({}, base.trainee, u.trainee || {}, {
    settings: Object.assign({}, base.trainee.settings, (u.trainee && u.trainee.settings) || {}),
    baseMax: Object.assign({}, base.trainee.baseMax, (u.trainee && u.trainee.baseMax) || {})
  });
  return {
    id: u.id || crypto.randomUUID(),
    username: u.username || "user",
    salt: u.salt || null,
    hash: u.hash || null,
    token: u.token || null,
    pushSub: u.pushSub || null,
    trainee,
    stats: Object.assign({}, base.stats, u.stats || {}),
    history: Array.isArray(u.history) ? u.history : [],
    records: Array.isArray(u.records) ? u.records : [],
    achievements: Array.isArray(u.achievements) ? u.achievements : []
  };
}
function loadDb() {
  try {
    if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
    if (!fs.existsSync(DB_FILE)) {
      /* النشر الدائم (Render): ابدأ من بيانات الحساب الأساسي عند غياب الملف */
      const seedPath = path.join(ROOT, "data", "seed.json");
      let d = { _v: 2, createdAt: new Date().toISOString(), users: [] };
      try {
        if (fs.existsSync(seedPath)) {
          const seed = JSON.parse(fs.readFileSync(seedPath, "utf8"));
          if (Array.isArray(seed.users) && seed.users.length) {
            d = { _v: 2, createdAt: seed.createdAt || new Date().toISOString(), users: seed.users.map(mergeUser) };
            console.log("  🌱 بدأ من بيانات الحساب الأساسي (seed) — الحساب: " + d.users[0].username);
          }
        }
      } catch (_) {}
      saveDb(d);
      return d;
    }
    const raw = JSON.parse(fs.readFileSync(DB_FILE, "utf8"));
    if (Array.isArray(raw.users)) {
      return { _v: 2, createdAt: raw.createdAt || new Date().toISOString(), users: (raw.users || []).map(mergeUser) };
    }
    /* رفع من النسخة القديمة (مشترك واحد) إلى نظام الحسابات */
    const u = { ...mergeUser(raw), name: (raw.trainee && raw.trainee.name) || "زاكي", username: "zaki" };
    u.salt = crypto.randomBytes(12).toString("hex");
    u.hash = hashPassword("123456", u.salt);
    const migrated = { _v: 2, createdAt: raw.createdAt || new Date().toISOString(), users: [u] };
    saveDb(migrated);
    console.log("");
    console.log("  🔐 تم رفع البيانات إلى نظام الحسابات — حسابك الأساسي:");
    console.log("     اسم المستخدم: zaki   كلمة المرور: 123456");
    console.log("");
    return migrated;
  } catch (e) {
    console.error("⚠️  خطأ في قراءة قاعدة البيانات:", e.message);
    return { _v: 2, createdAt: new Date().toISOString(), users: [] };
  }
}
function saveDb(db) {
  const tmp = DB_FILE + ".tmp";
  fs.writeFileSync(tmp, JSON.stringify(db, null, 2), "utf8");
  fs.renameSync(tmp, DB_FILE);
}

/* ---------------- Auth ---------------- */
function hashPassword(pw, salt) {
  return crypto.scryptSync(String(pw), salt, 32).toString("hex");
}
function newToken() {
  return crypto.randomBytes(24).toString("hex");
}
function authUser(req) {
  const h = (req.headers.authorization || "").trim();
  const t = h.replace(/^Bearer\s+/i, "");
  if (!t) return null;
  return db.users.find((u) => u.token === t && u.token) || null;
}
function publicUser(u) {
  return { id: u.id, username: u.username, name: u.trainee.name };
}
function validUsername(s) {
  return /^[a-zA-Z0-9_]{3,24}$/.test(String(s || "").trim());
}
function validPassword(s) {
  return typeof s === "string" && s.length >= 4;
}

/* ---------------- Levels / XP ---------------- */
const LEVELS = [
  "المبتدئ الجاد", "المندفع", "المتحمس", "المجتهد",
  "المحارب الصاعد", "المحارب", "المحارب القدير", "فارس القوة",
  "البطل", "الأسطورة", "الأسطورة الخالدة"
];
function levelForXp(xp) {
  let lvl = 1;
  let thresh = 200;
  let next = 200;
  while (xp >= thresh) {
    lvl++;
    next = Math.round(thresh * 1.6 + 150);
    thresh += next;
  }
  const tier = 400 + (lvl - 2) * 25;
  return {
    level: lvl,
    name: LEVELS[Math.min(lvl - 1, LEVELS.length - 1)],
    xp,
    into: xp - (thresh - 180),
    need: next,
    pct: Math.min(100, Math.round(((xp - (thresh - next)) / next) * 100)) || (xp > 0 ? 100 : 0)
  };
}

/* ---------------- Achievements ---------------- */
const ACH = [
  { id: "first-workout", em: "🌱", title: "الخطوة الأولى", desc: "أكمل أول تمرين كامل" },
  { id: "workout-5", em: "⚡", title: "خمس أيام حديد", desc: "أكمل 5 تمارين" },
  { id: "workout-25", em: "🔥", title: "الشهر كامل", desc: "أكمل 25 تمرين" },
  { id: "workout-100", em: "💎", title: "مئة معركة", desc: "أكمل 100 تمرين" },
  { id: "streak-3", em: "📆", title: "٣ أيام متواصلة", desc: "سلسلة 3 أيام" },
  { id: "streak-7", em: "📅", title: "أسبوع ناري", desc: "سلسلة 7 أيام" },
  { id: "streak-14", em: "🏵️", title: "أسبوعان بلا توقف", desc: "سلسلة 14 يوم" },
  { id: "streak-30", em: "🏆", title: "شهر كامل", desc: "سلسلة 30 يوم" },
  { id: "points-1k", em: "💡", title: "٥٠٠٠ نقطة", desc: "اجمع +5,000 نقطة" },
  { id: "points-10k", em: "🌟", title: "عشرة آلاف", desc: "اجمع +10,000 نقطة" },
  { id: "points-50k", em: "👑", title: "نصف مئة ألف", desc: "اجمع +50,000 نقطة" },
  { id: "points-100k", em: "🐉", title: "أسطوري النقاط", desc: "اجمع +100,000 نقطة" },
  { id: "push-100", em: "🙌", title: "رئة الضغط", desc: "اجمع 100 ضغطة إجمالية" },
  { id: "push-1000", em: "🗼", title: "ألف ضغطة", desc: "اجمع 1,000 ضغطة إجمالية" },
  { id: "push-5000", em: "🏰", title: "دفع الصامد", desc: "اجمع 5,000 ضغطة" },
  { id: "pull-100", em: "🦾", title: "سيد السحب", desc: "اجمع 100 سحبة إجمالية" },
  { id: "pull-1000", em: "🚀", title: "ألف سحبة", desc: "اجمع 1,000 سحبة" },
  { id: "dips-100", em: "🔱", title: "غاطس أصيل", desc: "اجمع 100 غاطسة" },
  { id: "pr-push-80", em: "💪", title: "قياس جديد", desc: "حقق رقم شخصي جديد في الضغط (+80)" },
  { id: "pr-pull-25", em: "🧗", title: "سحب نادر", desc: "حقق رقم شخصي جديد في السحب (+25)" },
  { id: "pr-dips-30", em: "🤸", title: "غاطس عميق", desc: "حقق رقم شخصي جديد في الغاطس (+30)" },
  { id: "quality-30", em: "🎯", title: "دقة شاهقة", desc: "أنجز 30 مجموعة بجودة كاملة" },
  { id: "perfect-session", em: "✨", title: "جلسة مثالية", desc: "أكمل جلسة بنسبة 100% وبجودة كاملة" },
  { id: "shop-2", em: "🛍️", title: "جامع الشخصيات", desc: "اقتنِ شخصيتين" },
  { id: "shop-5", em: "🧰", title: "سوق البطولات", desc: "اقتنِ 5 شخصيات" },
  { id: "king-owned", em: "👑", title: "الملك", desc: "اقتنِ شخصية أسطورة كاليستينيكس" },
  { id: "meal-1", em: "🥗", title: "أول وجبة مسجلة", desc: "سجّل أول وجبة صحية" },
  { id: "meal-10", em: "🍽️", title: "عشرة أطباق", desc: "سجّل 10 وجبات صحية" },
  { id: "meal-week", em: "📆", title: "أسبوع التغذية", desc: "سلسلة أكل 7 أيام متتالية" },
  { id: "kcal-5000", em: "🔥", title: "وقود أسطوري", desc: "سجّل 5,000 سعرة حرارية" }
];
const ACH_FN = {
  "first-workout": (s) => s.totalWorkouts >= 1,
  "workout-5": (s) => s.totalWorkouts >= 5,
  "workout-25": (s) => s.totalWorkouts >= 25,
  "workout-100": (s) => s.totalWorkouts >= 100,
  "streak-3": (s) => s.streak >= 3,
  "streak-7": (s) => s.streak >= 7,
  "streak-14": (s) => s.streak >= 14,
  "streak-30": (s) => s.streak >= 30,
  "points-1k": (s) => s.points >= 5000,
  "points-10k": (s) => s.points >= 10000,
  "points-50k": (s) => s.points >= 50000,
  "points-100k": (s) => s.points >= 100000,
  "push-100": (s) => s.totalPush >= 100,
  "push-1000": (s) => s.totalPush >= 1000,
  "push-5000": (s) => s.totalPush >= 5000,
  "pull-100": (s) => s.totalPull >= 100,
  "pull-1000": (s) => s.totalPull >= 1000,
  "dips-100": (s) => s.totalDips >= 100,
  "pr-push-80": (s) => s.best.push >= 80,
  "pr-pull-25": (s) => s.best.pull >= 25,
  "pr-dips-30": (s) => s.best.dips >= 30,
  "quality-30": (s) => s.qualitySets >= 30,
  "shop-2": (s, db) => db.trainee.charactersOwned.length >= 2,
  "shop-5": (s, db) => db.trainee.charactersOwned.length >= 5,
  "king-owned": (s, db) => db.trainee.charactersOwned.includes("king"),
  "meal-1": (s) => s.mealCount >= 1,
  "meal-10": (s) => s.mealCount >= 10,
  "meal-week": (s) => s.mealStreak >= 7,
  "kcal-5000": (s) => s.kcal >= 5000
};
function checkAchievements(db) {
  const newly = [];
  for (const a of ACH) {
    if (db.achievements.some((x) => x.id === a.id)) continue;
    const fn = ACH_FN[a.id];
    if (fn && fn(db.stats, db)) {
      db.achievements.push({ id: a.id, at: new Date().toISOString() });
      newly.push(a.id);
    }
  }
  return newly;
}

/* ---------------- Gamification ---------------- */
function exGroupStats(ex) {
  const g = ex.g;
  return {
    push: g === "push",
    pull: g === "pull",
    dips: g === "push" && /غاطس|dips/i.test(ex.n || ex.id || ""),
    core: g === "core",
    legs: g === "legs",
    endr: g === "endr",
    skill: g === "skill"
  };
}
function computeSession(db, body) {
  const { sessionId, duration, results } = body;
  const sess = SESSIONS.find((s) => s.id === sessionId);
  if (!sess) return { error: "جلسة غير معروفة" };
  if (!Array.isArray(results)) return { error: "نتائج غير صالحة" };

  const today = dayKey();
  const perGroup = {};   // points per group for char bonus
  let workSets = 0, qualitySets = 0, totalSets = 0;
  let rawPoints = 0, perfCompleteExercises = 0, perfTotalExercises = 0;
  let donePush = 0, donePull = 0, doneDips = 0;
  let sessionBest = { push: 0, pull: 0, dips: 0 };

  const recorded = new Set(results.map((r) => r.exId));

  for (const block of sess.blocks) {
    for (const exId of block.ex) {
      const ex = EX[exId];
      if (!ex) continue;
      const kind = block.t;
      if (kind === "work") perfTotalExercises++;
      const res = results.find((r) => r.exId === exId);
      const sets = (res && Array.isArray(res.sets)) ? res.sets : [];
      if (sets.length > 0) {
        if (kind === "work") perfCompleteExercises++;
        const q = { below: 0.5, goal: 1, over: 1.25 };
        const diffM = [1, 1, 1.35, 1.7][Math.min(ex.diff || 1, 3)] || 1;
        let total = 0;
        for (const set of sets) {
          const qm = q[set.quality] || 1;
          let base = Math.round(10 * qm * diffM);
          if (kind !== "work") base = 5; // warmup/cooldown
          total += base;
          totalSets++;
          if (set.quality === "goal" || set.quality === "over") qualitySets++;
          if (set.quality !== "below") workSets++;
          const stats = exGroupStats(ex);
          if (stats.push) { const n = set.qty || 0; donePush += n; sessionBest.push = Math.max(sessionBest.push, n); }
          if (stats.pull) { const n = set.qty || 0; donePull += n; sessionBest.pull = Math.max(sessionBest.pull, n); }
          if (stats.dips) { const n = set.qty || 0; doneDips += n; sessionBest.dips = Math.max(sessionBest.dips, n); }
        }
        rawPoints += total;
        perGroup[ex.g] = (perGroup[ex.g] || 0) + total;
        if (ex.diff >= 3) perGroup.force = (perGroup.force || 0) + total;
      }
    }
  }

  // performance / completion bonus
  const ratio = perfTotalExercises ? perfCompleteExercises / perfTotalExercises : 0;
  const perfBonus = Math.round(ratio * 60);
  const perfect = perfTotalExercises > 0 && perfCompleteExercises === perfTotalExercises && qualitySets > 0 && workSets === totalSets;

  // streak
  const was = db.stats.streak;
  const wasToday = db.stats.lastWorkoutDay === today;
  let streak = was;
  let streakBroken = false;
  if (db.stats.lastWorkoutDay !== today) {
    const yest = new Date(Date.now() - 86400000);
    if (db.stats.lastWorkoutDay === dayKey(yest)) streak = was + 1;
    else if (was === 0) streak = 1;
    else {
      const ch = db.trainee.charactersOwned.includes("phoenix") && db.trainee.equippedCharacter === "phoenix";
      const shieldFresh = db.trainee.settings.shieldUsedDate !== today;
      if (ch && shieldFresh) {
        db.trainee.settings.shieldUsedDate = today;
        streak = was; // محفوظة بالدرع
      } else {
        streak = 1; streakBroken = true;
      }
    }
  }
  db.stats.streak = streak;
  db.stats.lastWorkoutDay = today;

  let streakBonus = 0;
  if (streak >= 30) streakBonus = 300;
  else if (streak >= 14) streakBonus = 150;
  else if (streak >= 7) streakBonus = 75;
  else if (streak >= 3) streakBonus = 30;

  let points = rawPoints + perfBonus + streakBonus;
  if (perfect) points += 100;

  // character bonus
  const char = CHARS.find((c) => c.id === db.trainee.equippedCharacter);
  let charBonus = 0;
  if (char && char.bonus) {
    const b = char.bonus;
    if (b.type === "all") {
      charBonus = points * (b.v - 1);
    } else {
      const gp = perGroup[b.type] || 0;
      charBonus = gp * (b.v - 1);
    }
    charBonus = Math.round(charBonus);
    points += charBonus;
  }
  points = Math.round(points);

  // totals
  db.stats.points += points;
  db.stats.xp += points;
  if (!wasToday) db.stats.totalWorkouts += 1; // التمارين المتكررة في نفس اليوم لا تُعدّ يوم تدريب جديد
  db.stats.totalPush += donePush;
  db.stats.totalPull += donePull;
  db.stats.totalDips += doneDips;
  db.stats.totalSets += totalSets;
  db.stats.qualitySets += qualitySets;
  db.stats.totalMinutes += Math.min(Math.max(duration || 0, 5), 180);
  if (points > db.stats.bestSessionPoints) db.stats.bestSessionPoints = points;

  if (sessionBest.push > db.stats.best.push) db.stats.best.push = sessionBest.push;
  if (sessionBest.pull > db.stats.best.pull) db.stats.best.pull = sessionBest.pull;
  if (sessionBest.dips > db.stats.best.dips) db.stats.best.dips = sessionBest.dips;

  // PR fun records (new personal best)
  const newRecords = [];
  const names = { push: "الضغط", pull: "السحب", dips: "الغاطس" };
  for (const k of ["push", "pull", "dips"]) {
    if (sessionBest[k] > 0) {
      const old = db.trainee.baseMax[k] || 0;
      if (sessionBest[k] > old && sessionBest[k] > db.records.reduce((m, r) => (r.key === k ? Math.max(m, r.val) : m), 0)) {
        newRecords.push({ key: k, name: names[k], val: sessionBest[k], date: today });
        db.records.push({ key: k, name: names[k], val: sessionBest[k], date: today });
      }
    }
  }

  const newly = checkAchievements(db);

  db.history.push({
    date: today,
    at: new Date().toISOString(),
    sessionId,
    sessionName: sess.focus,
    duration: Math.min(Math.max(duration || 0, 5), 180),
    points,
    quality: perfect ? "perfect" : ratio >= 0.85 ? "great" : "ok",
    ratio: Math.round(ratio * 100)
  });
  if (db.history.length > 180) db.history = db.history.slice(-180);

  return {
    error: null,
    gained: { points, rawPoints, perfect, ratio: Math.round(ratio * 100), streak, streakBonus, charBonus, wasStreak: was, streakBroken, newRecords },
    achieved: newly,
    state: db
  };
}

/* ---------------- AI proxy ---------------- */
const SYSTEM_PROMPT =
  "أنت «كوتش سيد الجسد» — المدرب الذكي الرسمي داخل تطبيق «سيد الجسد» (BODY KING)، تطبيق الكاليستينيكس الاحترافي الذي تأسس وأنشئ بالكامل من طرف «محمد غناي» (Mohamed Ghannai). " +
  "إذا سألك المتدرب: «من صنعك؟»، «من هو مؤسسك؟»، «شكون صايبك؟»، فعبر بفخر أن التطبيق والروبوت كلهما من تأسيس وإبداع محمد غناي. " +
  "المتدرب اسمه يظهر في سياق المحادثة المرسل مع كل رسالة (اعتمد الاسم من هناك ولا تخترع اسماً). مستواه متقدم «فوق المتوسط»، أرقامه: 70 ضغطة، 20 سحبة، 25 غاطسة. مدة التمرين اليومية 45 إلى 75 دقيقة. هدفه: زيادة القوة، بناء العضلات، وتقوية الجهاز العصبي والاتصال العصبي-العضلي. " +
  "ردّ دائماً بالعربية الفصحى البسيطة أو بالدارجة المغربية حسب لغة المستخدم. كن محفزاً وواقعياً مبتعداً عن المبالغة. أي خطة تعطيها يجب أن تكون ضمن مدة 45-75 دقيقة وتراعي مستواه، مع فترات راحة قصيرة جداً (30-90 ثانية) وتركيز على الشكل المضبوط. " +
  "اجعل ردودك مركزة ومباشرة (بحد أقصى 350 كلمة) وابدأ دائماً مباشرة بالإجابة بدون مقدمات مطولة. " +
  "للتغذية: وجبات المتدرب بسيطة ومرنة (بطاطا، بيض، طون، شوفان، سلطة، سردين، دجاج، أرز). عند سؤاله عن الأكل قدّم خطة عملية بيوم واحد بنفس هذه الأصناف البسيطة مع مواعيد تقريبية (فطور ~8:30، غداء ~13:00، سناك ~17:00، عشاء ~20:00) واذكر الماء والسعرات بشكل مبسّط، وشجّعه على تسجيل كل وجبة في قسم «الغذاء» لأنه يربح نقاطاً ويكوّن سلسلة تغذية.";

function postJsonHttps(urlStr, payload) {
  return new Promise((resolve, reject) => {
    const u = new URL(urlStr);
    const body = JSON.stringify(payload);
    const chunks = [];
    const req = https.request({
      hostname: u.hostname, port: 443, path: u.pathname + u.search,
      method: "POST",
      family: 4,
      headers: { "Content-Type": "application/json", "Content-Length": Buffer.byteLength(body) }
    }, (res) => {
      res.on("data", (c) => chunks.push(c));
      res.on("end", () => {
        try { resolve(JSON.parse(Buffer.concat(chunks).toString("utf8"))); }
        catch { reject(new Error("استجابة غير صالحة من المنصّة")); }
      });
    });
    req.setTimeout(45000, () => req.destroy(new Error("timeout")));
    req.on("error", reject);
    req.write(body);
    req.end();
  });
}
function postJsonCurl(urlStr, payload) {
  return new Promise((resolve, reject) => {
    const tmp = path.join(os.tmpdir(), "kx_" + crypto.randomBytes(6).toString("hex") + ".json");
    try { fs.writeFileSync(tmp, JSON.stringify(payload), "utf8"); } catch (e) { reject(e); return; }
    execFile("curl",
      ["-s", "-m", "50", "-X", "POST", "-H", "Content-Type: application/json", "--data-binary", "@" + tmp, urlStr],
      { timeout: 60000, maxBuffer: 2e6 },
      (err, stdout) => {
        fs.unlink(tmp, () => {});
        if (err) { reject(err); return; }
        try { resolve(JSON.parse(stdout || "{}")); }
        catch { reject(new Error("استجابة غير صالحة من المنصّة")); }
      });
  });
}
function parseGeminiReply(data) {
  const text = data?.candidates?.[0]?.content?.parts?.map((p) => p.text).join("") || "";
  if (!text) throw new Error("استجابة فارغة من النموذج");
  return { text, model: GEMINI_MODEL };
}
function geminiCallOnce(url, payload) {
  // 1) node https 2) curl (أثبت العمل على كل الشبكات)
  return postJsonHttps(url, payload).then(parseGeminiReply).catch(async () => {
    const d = await postJsonCurl(url, payload);
    return parseGeminiReply(d);
  });
}
function geminiChat(messages) {
  const contents = [];
  for (const m of messages) {
    const role = m.role === "assistant" || m.role === "model" ? "model" : "user";
    contents.push({ role, parts: [{ text: String(m.content) }] });
  }
  const url =
    `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(GEMINI_MODEL)}:generateContent?key=${encodeURIComponent(GEMINI_KEY)}`;
  const payload = {
    system_instruction: { parts: [{ text: SYSTEM_PROMPT }] },
    contents,
    generationConfig: { temperature: 0.8, maxOutputTokens: 1100 }
  };
  const attempt = (n) => geminiCallOnce(url, payload).catch((e) => {
    if (n < 3) return new Promise((r) => setTimeout(() => r(attempt(n + 1)), 1500));
    throw e;
  });
  return attempt(0);
}

/* ---------------- HTTP helpers ---------------- */
const MIME = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".webmanifest": "application/manifest+json",
  ".txt": "text/plain; charset=utf-8",
  ".woff2": "font/woff2"
};
function send(res, code, obj) {
  const body = typeof obj === "string" ? obj : JSON.stringify(obj);
  res.writeHead(code, { "Content-Type": typeof obj === "string" ? "text/plain; charset=utf-8" : "application/json; charset=utf-8", "Cache-Control": "no-store", "Access-Control-Allow-Origin": "*" });
  res.end(body);
}
function readBody(req) {
  return new Promise((resolve) => {
    let data = "";
    req.on("data", (c) => { data += c; if (data.length > 1e6) req.destroy(); });
    req.on("end", () => {
      try { resolve(JSON.parse(data || "{}")); }
      catch { resolve({}); }
    });
    req.on("error", () => resolve({}));
  });
}

/* ---------------- Server ---------------- */
const db = loadDb();

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host || "localhost"}`);
  const p = url.pathname;
  const method = req.method;
  console.log(`[${new Date().toISOString()}] ${method} ${p} ${req.headers["user-agent"] ? "" : ""}`);

  /* static shared.json */
  if (p === "/shared.json" && method === "GET") {
    send(res, 200, SHARED);
    return;
  }

  /* API */
  if (p === "/api/health") { send(res, 200, { ok: true, app: "kalistenix", founder: "محمد غناي", model: GEMINI_MODEL }); return; }

  /* ---------- Auth ---------- */
  if (p === "/api/auth/register" && method === "POST") {
    const b = await readBody(req);
    const username = String(b.username || "").trim();
    const password = b.password;
    if (!validUsername(username)) { send(res, 400, { error: "اسم المستخدم: 3-24 حرفاً (حروف/أرقام/شرطة سفلية)" }); return; }
    if (!validPassword(password)) { send(res, 400, { error: "كلمة المرور: 4 أحرف على الأقل" }); return; }
    if (db.users.some((u) => u.username.toLowerCase() === username.toLowerCase())) { send(res, 409, { error: "اسم المستخدم محجوز" }); return; }
    const salt = crypto.randomBytes(12).toString("hex");
    const u = mergeUser({
      id: crypto.randomUUID(),
      username,
      salt,
      hash: hashPassword(password, salt),
      token: newToken(),
      pushSub: null,
      trainee: { name: String(b.name || username).trim().slice(0, 30) }
    });
    db.users.push(u);
    saveDb(db);
    send(res, 200, { token: u.token, user: publicUser(u) });
    return;
  }

  if (p === "/api/auth/login" && method === "POST") {
    const b = await readBody(req);
    const username = String(b.username || "").trim();
    const password = b.password;
    const u = db.users.find((x) => x.username.toLowerCase() === username.toLowerCase());
    if (!u || !u.salt || u.hash !== hashPassword(password, u.salt)) {
      send(res, 401, { error: "اسم المستخدم أو كلمة المرور خاطئة" });
      return;
    }
    u.token = newToken();
    saveDb(db);
    send(res, 200, { token: u.token, user: publicUser(u) });
    return;
  }

  if (p === "/api/auth/logout" && method === "POST") {
    const u = authUser(req);
    if (u) { u.token = null; saveDb(db); }
    send(res, 200, { ok: true });
    return;
  }

  if (p === "/api/auth/me" && method === "GET") {
    const u = authUser(req);
    if (!u) { send(res, 401, { error: "غير مسجل" }); return; }
    send(res, 200, { user: publicUser(u) });
    return;
  }

  /* ---------- Push ---------- */
  if (p === "/api/push/vapid" && method === "GET") {
    send(res, 200, { publicKey: VAPID_PUBLIC_KEY, enabled: !!webpush });
    return;
  }

  if (p === "/api/push/subscribe" && method === "POST") {
    const u = authUser(req);
    if (!u) { send(res, 401, { error: "غير مسجل" }); return; }
    const b = await readBody(req);
    const s = b.subscription;
    if (s && typeof s === "object" && typeof s.endpoint === "string" && /^https:\/\//.test(s.endpoint) && s.keys && s.keys.p256dh && s.keys.auth) {
      u.pushSub = { endpoint: s.endpoint, keys: { p256dh: s.keys.p256dh, auth: s.keys.auth } };
    } else {
      u.pushSub = null;
    }
    saveDb(db);
    send(res, 200, { saved: !!u.pushSub });
    return;
  }

  if (p === "/api/push/test" && method === "POST") {
    const u = authUser(req);
    if (!u) { send(res, 401, { error: "غير مسجل" }); return; }
    if (!u.pushSub) { send(res, 400, { error: "لا يوجد اشتراك إشعارات بعد — فعّل الإشعارات أولاً" }); return; }
    const ok = await sendPush(u, "👑 سيد الجسد", "إشعار اختبار: الإشعارات تعمل 💪", "/home");
    send(res, 200, { sent: true });
    return;
  }

  /* ---------- Data (auth) ---------- */
  if (p === "/api/state" && method === "GET") {
    const u = authUser(req);
    if (!u) { send(res, 401, { error: "سجل دخولك أولاً" }); return; }
    send(res, 200, { app: SHARED.app, program: SHARED.program, plan: SHARED.plan, level: levelForXp(u.stats.xp), db: u, user: publicUser(u) });
    return;
  }

  if (p === "/api/achievements" && method === "GET") {
    const u = authUser(req);
    if (!u) { send(res, 401, { error: "سجل دخولك أولاً" }); return; }
    send(res, 200, { list: ACH, unlocked: u.achievements });
    return;
  }

  if (p === "/api/workout/complete" && method === "POST") {
    const u = authUser(req);
    if (!u) { send(res, 401, { error: "سجل دخولك أولاً" }); return; }
    const body = await readBody(req);
    const out = computeSession(u, body);
    if (out.error) { send(res, 400, { error: out.error }); return; }
    saveDb(db);
    sendPush(u, "🎉 تمرين مكتمل", `+${out.gained.points} نقطة · ${out.gained.newRecords.length ? " رقم شخصي جديد 🏆" : "واصل التقدم 💪"}`, "/home");
    send(res, 200, { gained: out.gained, achieved: out.achieved, level: levelForXp(u.stats.xp), db: u });
    return;
  }

  if (p === "/api/store/buy" && method === "POST") {
    const u = authUser(req);
    if (!u) { send(res, 401, { error: "سجل دخولك أولاً" }); return; }
    const body = await readBody(req);
    const ch = CHARS.find((c) => c.id === body.characterId);
    if (!ch) { send(res, 400, { error: "شخصية غير موجودة" }); return; }
    if (u.trainee.charactersOwned.includes(ch.id)) { send(res, 400, { error: "تملكها أصلًا" }); return; }
    if (u.stats.points < ch.price) { send(res, 400, { error: "النقاط غير كافية", need: ch.price - u.stats.points }); return; }
    u.stats.points -= ch.price;
    u.trainee.charactersOwned.push(ch.id);
    const newly = checkAchievements(u);
    saveDb(db);
    send(res, 200, { bought: ch.id, balance: u.stats.points, achieved: newly });
    return;
  }

  if (p === "/api/store/equip" && method === "POST") {
    const u = authUser(req);
    if (!u) { send(res, 401, { error: "سجل دخولك أولاً" }); return; }
    const body = await readBody(req);
    const ch = CHARS.find((c) => c.id === body.characterId);
    if (!ch) { send(res, 400, { error: "شخصية غير موجودة" }); return; }
    if (!u.trainee.charactersOwned.includes(ch.id)) { send(res, 400, { error: "اشترِ الشخصية أولاً" }); return; }
    u.trainee.equippedCharacter = ch.id;
    saveDb(db);
    send(res, 200, { equipped: ch.id });
    return;
  }

  if (p === "/api/settings" && method === "POST") {
    const u = authUser(req);
    if (!u) { send(res, 401, { error: "سجل دخولك أولاً" }); return; }
    const body = await readBody(req);
    const s = u.trainee.settings;
    if (typeof body.name === "string" && body.name.trim()) u.trainee.name = body.name.trim().slice(0, 30);
    if (typeof body.sound === "boolean") s.sound = body.sound;
    if (typeof body.vibration === "boolean") s.vibration = body.vibration;
    if (typeof body.legendary === "boolean") s.legendary = body.legendary;
    saveDb(db);
    send(res, 200, { saved: true });
    return;
  }

  if (p === "/api/debug/reset" && method === "POST") {
    const u = authUser(req);
    if (!u) { send(res, 401, { error: "سجل دخولك أولاً" }); return; }
    const body = await readBody(req);
    if (body.confirm !== "RESET") { send(res, 400, { error: "تأكيد غير صحيح" }); return; }
    u.stats = userDefaults().stats;
    u.history = [];
    u.records = [];
    u.achievements = [];
    saveDb(db);
    send(res, 200, { reset: true });
    return;
  }

  if (p === "/api/meal/complete" && method === "POST") {
    const u = authUser(req);
    if (!u) { send(res, 401, { error: "سجل دخولك أولاً" }); return; }
    const body = await readBody(req);
    const meal = SHARED.meals.find((m) => m.id === body.mealId);
    if (!meal) { send(res, 400, { error: "وجبة غير موجودة" }); return; }
    const today = dayKey();
    const wasMealToday = Array.isArray(u.stats.mealLog) && u.stats.mealLog.some((m) => m.date === today && m.mealId === meal.id);
    if (wasMealToday) { send(res, 400, { error: "سجلت هذه الوجبة اليوم" }); return; }

    // meal streak
    const wasMeal = u.stats.mealStreak || 0;
    if (u.stats.lastMealDay !== today) {
      const yest = new Date(Date.now() - 86400000);
      u.stats.mealStreak = u.stats.lastMealDay === dayKey(yest) ? wasMeal + 1 : 1;
      u.stats.lastMealDay = today;
    }

    // اليوم بدأ بنشاط؟ (مكافأة أول نشاط في اليوم)
    const firstToday = u.stats.lastWorkoutDay !== today && !(Array.isArray(u.stats.mealLog) && u.stats.mealLog.some((m) => m.date === today));
    let points = 12;
    let bonus = 0;
    if (firstToday) bonus = 5;
    const before = u.stats.points;
    u.stats.points += points + bonus;
    u.stats.xp += points + bonus;
    u.stats.mealCount = (u.stats.mealCount || 0) + 1;
    u.stats.kcal = (u.stats.kcal || 0) + meal.kcal;
    if (!Array.isArray(u.stats.mealLog)) u.stats.mealLog = [];
    u.stats.mealLog.push({ date: today, at: new Date().toISOString(), mealId: meal.id, name: meal.name, em: meal.em, kcal: meal.kcal, points: points + bonus });
    if (u.stats.mealLog.length > 60) u.stats.mealLog = u.stats.mealLog.slice(-60);

    const newly = checkAchievements(u);
    saveDb(db);
    send(res, 200, { gained: { points: points + bonus, base: points, firstBonus: bonus, mealStreak: u.stats.mealStreak }, achieved: newly, before, level: levelForXp(u.stats.xp), db: u });
    return;
  }

  if (p === "/api/ai/chat" && method === "POST") {
    const u = authUser(req);
    if (!u) { send(res, 401, { error: "سجل دخولك أولاً" }); return; }
    const body = await readBody(req);
    const msgs = Array.isArray(body.messages) ? body.messages.slice(-16) : [];
    if (msgs.length === 0) { send(res, 400, { error: "لا رسائل" }); return; }
    for (const m of msgs) {
      if (typeof m.role !== "string" || typeof m.content !== "string" || m.content.length > 3000) {
        send(res, 400, { error: "رسالة غير صالحة" }); return;
      }
    }
    if (!GEMINI_KEY) {
      send(res, 503, { error: "المفتاح غير مضبوط. ضع GEMINI_API_KEY في ملف .env ثم أعد تشغيل السيرفر." });
      return;
    }
    const today = dayKey();
    const recent = (Array.isArray(u.stats.mealLog) ? u.stats.mealLog.slice(-8) : []);
    const todayMeals = recent.filter((m) => m.date === today);
    const mealCtx = recent.length
      ? ` غذاء هذا الأسبوع: ${recent.length} وجبة مسجلة (سعرات إجمالية ${u.stats.kcal || 0})` +
        (todayMeals.length ? `، أكل اليوم: ${todayMeals.map((m) => m.name).join("، ")}` : "، لم يسجل وجبة اليوم بعد") +
        `، سلسلة التغذية: ${u.stats.mealStreak || 0} يوم.`
      : ` لم يسجل أي وجبة بعد — شجّعه على تسجيل وجباته البسيطة (بطاطا، بيض، طون، شوفان، سلطة) في قسم «الغذاء» ليبدأ الإحصاء.`;
    const ctx = {
      role: "user",
      content: `[سياق المتدرب: الاسم الفعلي الحالي ${u.trainee.name} (اعتمد هذا الاسم دائماً مهما ورد غيره)، مستوى متقدم، 70 ضغطة/20 سحبة/25 غاطسة، مدة 45-75 دقيقة، الهدف القوة والاتصال العصبي-العضلي.${mealCtx}]`
    };
    try {
      const r = await geminiChat([ctx, ...msgs]);
      send(res, 200, r);
    } catch (e) {
      console.error("AI error:", e.message);
      send(res, 502, { error: "فشل الاتصال بالمدرب الذكي. تحقق من المفتاح أو الإنترنت.", detail: e.message });
    }
    return;
  }

  /* static files */
  if (method === "GET") {
    let rel = p === "/" ? "/index.html" : p;
    let fp = path.normalize(path.join(PUBLIC, rel));
    if (!fp.startsWith(PUBLIC)) { send(res, 403, "Forbidden"); return; }
    if (!fs.existsSync(fp) || fs.statSync(fp).isDirectory()) {
      fp = path.join(fp, "index.html");
    }
    if (!fs.existsSync(fp)) { send(res, 404, "غير موجود"); return; }
    const ext = path.extname(fp).toLowerCase();
    const type = MIME[ext] || "application/octet-stream";
    res.writeHead(200, { "Content-Type": type, "Cache-Control": ext === ".html" ? "no-cache" : "public, max-age=3600" });
    fs.createReadStream(fp).pipe(res);
    return;
  }
  send(res, 404, "غير موجود");
});

server.listen(PORT, HOST, () => {
  const nets = os.networkInterfaces();
  let lan = "غير معروف";
  for (const name of Object.keys(nets)) {
    for (const ni of nets[name] || []) {
      if (ni.family === "IPv4" && !ni.internal) lan = ni.address;
    }
  }
  console.log("");
  console.log("  ██╗  ██╗ █████╗ ██╗     ██╗███████╗████████╗███████╗███╗   ██╗██╗██╗  ██╗");
  console.log("  ╚██╗██╔╝██╔══██╗██║     ██║██╔════╝╚══██╔══╝██╔════╝████╗  ██║██║╚██╗██╔╝");
  console.log("   ╚███╔╝ ███████║██║     ██║███████╗   ██║   █████╗  ██╔██╗ ██║██║ ╚███╔╝");
  console.log("   ██╔██╗ ██╔══██║██║     ██║╚════██║   ██║   ██╔══╝  ██║╚██╗██║██║ ██╔██╗");
  console.log("  ██╔╝ ██╗██║  ██║███████╗██║███████║   ██║   ███████╗██║ ╚████║██║██╔╝ ██╗");
  console.log("  ╚═╝  ╚═╝╚═╝  ╚═╝╚══════╝╚═╝╚══════╝   ╚═╝   ╚══════╝╚═╝  ╚═══╝╚═╝╚═╝  ╚═╝");
  console.log("");
  console.log(`  👑 سيد الجسد BODY KING — تأسيس وإبداع «محمد غناي»`);
  console.log(`  💬 المدرب الذكي: ${GEMINI_MODEL}  ${GEMINI_KEY ? "✔ مفعّل" : "✘ بدون مفتاح (ضع GEMINI_API_KEY)"}`);
  console.log("");
  console.log(`  🖥  محلياً :  http://localhost:${PORT}`);
  console.log(`  📱 عبر الشبكة: http://${lan}:${PORT}`);
  console.log("");
});