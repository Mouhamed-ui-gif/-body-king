/* سيد الجسد — طبقة الاتصال بالسيرفر */
(() => {
  const K = window.KX;

  function token() {
    try { return window.localStorage.getItem("kx_token") || null; } catch (_) { return null; }
  }
  K.token = token;

  async function req(url, opts = {}) {
    const isForm = opts.body instanceof FormData;
    const t = token();
    const headers = {};
    if (!isForm) headers["Content-Type"] = "application/json";
    if (t) headers["Authorization"] = "Bearer " + t;
    try {
      const res = await fetch(url, {
        method: opts.method || "GET",
        headers,
        body: opts.body !== undefined && !isForm ? JSON.stringify(opts.body) : opts.body
      });
      let data = null;
      try { data = await res.json(); } catch (_) {}
      if (res.status === 401 && t) {
        window.dispatchEvent(new CustomEvent("kx:unauthorized"));
      }
      if (!res.ok) return { ok: false, status: res.status, data };
      return { ok: true, data };
    } catch (e) {
      return { ok: false, status: 0, data: { error: "لا يمكن الوصول إلى السيرفر" }, err: e };
    }
  }

  K.api = {
    state: () => req("/api/state"),
    achievements: () => req("/api/achievements"),
    shared: () => req("/shared.json"),
    chat: (messages) => req("/api/ai/chat", { method: "POST", body: { messages } }),
    completeWorkout: (payload) => req("/api/workout/complete", { method: "POST", body: payload }),
    meal: (mealId) => req("/api/meal/complete", { method: "POST", body: { mealId } }),
    buy: (characterId) => req("/api/store/buy", { method: "POST", body: { characterId } }),
    equip: (characterId) => req("/api/store/equip", { method: "POST", body: { characterId } }),
    settings: (obj) => req("/api/settings", { method: "POST", body: obj }),
    reset: () => req("/api/debug/reset", { method: "POST", body: { confirm: "RESET" } }),
    auth: {
      register: (u) => req("/api/auth/register", { method: "POST", body: u }),
      login: (u) => req("/api/auth/login", { method: "POST", body: u }),
      logout: () => req("/api/auth/logout", { method: "POST" }),
      me: () => req("/api/auth/me")
    },
    push: {
      vapid: () => req("/api/push/vapid"),
      subscribe: (subscription) => req("/api/push/subscribe", { method: "POST", body: { subscription } }),
      test: () => req("/api/push/test", { method: "POST" })
    }
  };

  K.b64u = (s) => {
    const pad = s.replace(/-/g, "+").replace(/_/g, "/");
    const b = atob(pad);
    const a = new Uint8Array(b.length);
    for (let i = 0; i < b.length; i++) a[i] = b.charCodeAt(i);
    return a;
  };

  K.isSecure = () => !!window.isSecureContext && "serviceWorker" in navigator && "PushManager" in window;
})();