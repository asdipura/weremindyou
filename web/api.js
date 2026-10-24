/**
 * Pemanggil API Apps Script (doPost di gas/Code.gs). Body text/plain supaya browser tidak mengirim preflight CORS.
 * Saat dev, dev/mock.js mengisi window.WRY_MOCK dan semua panggilan dilayani mock.
 */
(function () {
  const apiUrl = () => ((window.WRY_CONFIG && window.WRY_CONFIG.apiUrl) || "").trim();
  window.WRY_API = {
    get ready() { return !!(window.WRY_MOCK || apiUrl()); },
    async call(fn, args) {
      if (window.WRY_MOCK) return window.WRY_MOCK.call(fn, args);
      let res;
      try {
        res = await fetch(apiUrl(), { method: "POST", headers: { "Content-Type": "text/plain;charset=utf-8" }, body: JSON.stringify({ fn: fn, args: args }) });
      } catch (_) {
        throw new Error("Tidak bisa terhubung ke server. Periksa koneksi internet.");
      }
      if (!res.ok) throw new Error("Server sedang bermasalah (HTTP " + res.status + ").");
      let out;
      try { out = await res.json(); } catch (_) { throw new Error("Balasan server tidak terbaca. Coba lagi sebentar."); }
      if (!out.ok) throw new Error(out.error || "Terjadi kesalahan di server.");
      return out.data;
    },
  };
})();
