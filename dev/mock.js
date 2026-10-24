/**
 * Mock API Apps Script untuk pratinjau lokal. Meniru API di gas/Code.gs dengan
 * data matkul dari data/matkul-ganjil.csv dan tugas contoh yang disimpan di memori
 * (hilang saat halaman dimuat ulang).
 * Tambahkan ?mock=error atau ?mock=slow di URL untuk menguji state gagal/lambat.
 */
(function () {
  const SEMESTER_START = "2026-08-31";
  const TOTAL_WEEKS = 16;
  const DAYS = ["Senin", "Selasa", "Rabu", "Kamis", "Jumat"];
  const mode = new URLSearchParams(location.search).get("mock");

  const dayNum = (iso) => { const p = iso.split("-").map(Number); return Math.round(Date.UTC(p[0], p[1] - 1, p[2]) / 864e5); };
  const isoOf = (n) => new Date(n * 864e5).toISOString().slice(0, 10);
  const today = () => new Date(Date.now() + 7 * 3600e3).toISOString().slice(0, 10);
  const first = dayNum(SEMESTER_START) - 2;
  const weekOf = (iso) => Math.min(Math.max(Math.floor((dayNum(iso) - first) / 7) + 1, 1), TOTAL_WEEKS);
  const classDate = (week, hari) => isoOf(first + 7 * (week - 1) + 2 + DAYS.indexOf(hari));
  const current = () => weekOf(today());

  const SAMPLE = [
    "Menyelesaikan 1 buah headpiece & 1 mekanisme",
    "Sketsa 20 alternatif bentuk, dikumpulkan di Miro kelas",
    "Revisi moodboard & user persona, presentasi 5 menit",
    "Membuat model skala 1:5 dari foam board",
    "Rangkuman bab 3 & 4, maks. 2 halaman",
    "Render 3 view produk (KeyShot), format A3 landscape",
  ];
  const NAMES = ["Raka", "Nadia", "Bima", "Salsa", "Dimas", "Aulia"];
  const rand = (seed) => { const x = Math.sin(seed) * 10000; return x - Math.floor(x); };
  let nextId = 1;

  let matkulPromise;
  function matkul() {
    matkulPromise = matkulPromise || fetch("/data/matkul-ganjil.csv").then((r) => r.text()).then((text) =>
      text.trim().split(/\r?\n/).slice(1).map((line) => {
        const [semester, hari, name, kelas] = line.split(",");
        return { semester: Number(semester), hari, matkul: name, kelas };
      }));
    return matkulPromise;
  }

  /** Baris "sheet Tugas" per minggu, dibuat sekali dengan isi acak-tetap. */
  const store = new Map();
  async function rows(week) {
    if (store.has(week)) return store.get(week);
    const list = [];
    const ms = await matkul();
    if (week <= current()) ms.forEach((m, i) => {
      const r = rand(i * 31 + week * 7);
      const ago = new Date(Date.now() - rand(i + week) * 4 * 864e5).toISOString();
      const base = { minggu: week, semester: m.semester, matkul: m.matkul, kelas: m.kelas, dibuat: ago, diubah: ago };
      if (r < 0.45) {
        const n = rand(i * 3 + week) < 0.25 ? 2 : 1;
        for (let k = 0; k < n; k++) list.push(Object.assign({}, base, {
          id: "T" + nextId++, status: "ada", pengisi: NAMES[i % NAMES.length],
          deskripsi: SAMPLE[Math.floor(rand(i * 7 + k + week) * SAMPLE.length)],
          tanggal: classDate(week, m.hari),
        }));
      } else if (r < 0.58) {
        list.push(Object.assign({}, base, { id: "T" + nextId++, status: "tidak-ada", pengisi: NAMES[(i + 2) % NAMES.length], deskripsi: "", tanggal: "" }));
      }
    });
    store.set(week, list);
    return list;
  }
  const slotKey = (s, m, k) => [Number(s), m, k].join("|");
  const pub = (t) => ({ id: t.id, deskripsi: t.deskripsi, tanggal: t.tanggal, pengisi: t.pengisi, diubah: t.diubah });

  async function getBoard(week) {
    const cur = current();
    const w = week == null ? cur : Number(week);
    const ms = await matkul();
    const active = (await rows(w)).filter((t) => t.status !== "dihapus");
    const semesters = [];
    ms.forEach((m) => {
      let sem = semesters.find((s) => s.semester === m.semester);
      if (!sem) semesters.push(sem = { semester: m.semester, matkul: [] });
      let g = sem.matkul.find((x) => x.name === m.matkul);
      if (!g) sem.matkul.push(g = { name: m.matkul, classes: [] });
      const items = active.filter((t) => slotKey(t.semester, t.matkul, t.kelas) === slotKey(m.semester, m.matkul, m.kelas));
      const tasks = items.filter((t) => t.status === "ada").sort((a, b) => a.dibuat.localeCompare(b.dibuat)).map(pub);
      const none = items.find((t) => t.status === "tidak-ada");
      g.classes.push({
        kelas: m.kelas, hari: m.hari, status: tasks.length ? "ada" : none ? "tidak-ada" : "kosong", tasks,
        reportedBy: none && !tasks.length ? none.pengisi : "", reportedAt: none && !tasks.length ? none.diubah : "",
      });
    });
    const start = first + 7 * (w - 1);
    return { week: w, currentWeek: cur, minWeek: 1, maxWeek: Math.min(TOTAL_WEEKS, cur + 1), start: isoOf(start), end: isoOf(start + 6), term: "Ganjil", accepting: true, semesters };
  }

  async function getFormOptions() {
    const cur = current();
    return {
      accepting: mode !== "closed" && settings.accepting,
      currentWeek: cur,
      weeks: Array.from({ length: Math.min(TOTAL_WEEKS, cur + 1) }, (_, i) => {
        const s = first + 7 * i;
        return { week: i + 1, start: isoOf(s), end: isoOf(s + 6) };
      }),
      matkul: await matkul(),
    };
  }

  async function checkExisting(week, semester, mk, kelas) {
    return (await rows(Number(week)))
      .filter((t) => t.status !== "dihapus" && slotKey(t.semester, t.matkul, t.kelas) === slotKey(semester, mk, kelas))
      .map((t) => Object.assign(pub(t), { status: t.status }));
  }

  async function saveTasks(p) {
    if (mode === "save-error") throw new Error("Server sedang sibuk. Silakan coba lagi.");
    const week = Number(p.week);
    const list = await rows(week);
    const now = new Date().toISOString();
    const inSlot = list.filter((t) => t.status !== "dihapus" && slotKey(t.semester, t.matkul, t.kelas) === slotKey(p.semester, p.matkul, p.kelas));
    const base = { minggu: week, semester: Number(p.semester), matkul: p.matkul, kelas: p.kelas, dibuat: now, diubah: now, pengisi: (p.pengisi || "").trim() || "Kontributor Kelas" };
    const ids = [];
    const slot = (await matkul()).find((m) => slotKey(m.semester, m.matkul, m.kelas) === slotKey(p.semester, p.matkul, p.kelas));
    const tanggal = classDate(week, slot.hari);
    if (p.mode === "tidak-ada") {
      if (inSlot.some((t) => t.status === "ada")) throw new Error("Kelas ini masih punya tugas aktif. Hapus tugasnya dulu bila memang tidak ada tugas.");
      if (!inSlot.length) { const r = Object.assign({}, base, { id: "T" + nextId++, status: "tidak-ada", deskripsi: "", tanggal: "" }); list.push(r); ids.push(r.id); }
      else ids.push(inSlot[0].id);
    } else {
      inSlot.filter((t) => t.status === "tidak-ada").forEach((t) => { t.status = "dihapus"; });
      p.tasks.forEach((t) => {
        if (t.id) {
          const old = list.find((x) => x.id === t.id);
          if (!old || old.status === "dihapus") throw new Error("Tugas yang diedit tidak ditemukan. Muat ulang halaman.");
          Object.assign(old, { deskripsi: t.deskripsi.trim(), tanggal, pengisi: base.pengisi, diubah: now });
          ids.push(old.id);
        } else {
          const r = Object.assign({}, base, { id: "T" + nextId++, status: "ada", deskripsi: t.deskripsi.trim(), tanggal });
          list.push(r); ids.push(r.id);
        }
      });
    }
    return { ids, week };
  }

  async function deleteTask(id, pengisi) {
    for (const list of store.values()) {
      const row = list.find((t) => t.id === id);
      if (row && row.status !== "dihapus") { row.status = "dihapus"; row.pengisi = pengisi || "Kontributor Kelas"; return { id }; }
    }
    throw new Error("Tugas tidak ditemukan atau sudah dihapus.");
  }

  // ───── Backoffice (mock) ─────
  // Akun dev (meniru tab Akun): admin@wry.test / wry-admin, design@wry.test / wry-design.
  const ACCOUNTS = [
    { email: "admin@wry.test", password: "wry-admin", role: "admin", active: true },
    { email: "design@wry.test", password: "wry-design", role: "design", active: true },
    { email: "alumni@wry.test", password: "x", role: "design", active: false },
  ];
  const ROLES = Object.fromEntries(ACCOUNTS.filter((a) => a.active).map((a) => [a.email, a.role]));
  const settings = { accepting: true };
  const history = new Map();
  /** Entri pertama "tambah" dibuat dari isi asli baris sebelum perubahan pertama. */
  const logH = (row, before, aksi) => {
    if (!history.has(row.id)) history.set(row.id, [{ waktu: row.dibuat, aksi: before.deskripsi ? "tambah" : "tidak-ada-tugas", pengisi: before.pengisi, sebelum: null, sesudah: snap(before) }]);
    history.get(row.id).push({ waktu: new Date().toISOString(), aksi, pengisi: row.pengisi, sebelum: snap(before), sesudah: snap(row) });
  };
  const snap = (t) => ({ minggu: t.minggu, status: t.status, deskripsi: t.deskripsi, tanggal: t.tanggal });
  function session(token, needAdmin) {
    const email = String(token || "").split("|")[1];
    const role = ROLES[email];
    if (!String(token || "").startsWith("mock|") || !role) throw new Error("SESI_HABIS: Sesi berakhir. Silakan masuk lagi.");
    if (needAdmin && role !== "admin") throw new Error("Hanya admin WRY yang bisa melakukan ini.");
    return { email, role };
  }
  async function findRow(id) {
    for (const list of store.values()) { const row = list.find((t) => t.id === id); if (row) return { row, list }; }
    throw new Error("Tugas tidak ditemukan.");
  }

  let fails = 0;
  async function adminLogin(email, password) {
    if (fails >= 5) throw new Error("Terlalu banyak percobaan. Coba lagi 15 menit lagi.");
    const acc = ACCOUNTS.find((a) => a.active && a.email === String(email).trim().toLowerCase());
    if (!acc || acc.password !== password) { fails++; throw new Error("Email atau password salah."); }
    fails = 0;
    return { token: "mock|" + acc.email, email: acc.email, role: acc.role, expires: Date.now() + 7 * 864e5 };
  }
  async function adminSession(token) { const s = session(token); return { email: s.email, role: s.role, canEdit: s.role === "admin" }; }
  async function adminLogout() { return { ok: true }; }
  async function adminStatus(token, week) {
    session(token);
    const cur = current();
    const w = week == null ? cur : Number(week);
    const ms = await matkul();
    const active = (await rows(w)).filter((t) => t.status !== "dihapus");
    const semesters = [];
    ms.forEach((m) => {
      let sem = semesters.find((s) => s.semester === m.semester);
      if (!sem) semesters.push(sem = { semester: m.semester, kelas: [] });
      let k = sem.kelas.find((x) => x.kelas === m.kelas);
      if (!k) sem.kelas.push(k = { kelas: m.kelas, slots: [] });
      const items = active.filter((t) => slotKey(t.semester, t.matkul, t.kelas) === slotKey(m.semester, m.matkul, m.kelas));
      const ada = items.filter((t) => t.status === "ada");
      k.slots.push({ matkul: m.matkul, hari: m.hari, status: ada.length ? "ada" : items.length ? "tidak-ada" : "kosong", count: ada.length });
    });
    semesters.forEach((s) => s.kelas.sort((a, b) => a.kelas.localeCompare(b.kelas)));
    const start = first + 7 * (w - 1);
    return { week: w, currentWeek: cur, maxWeek: Math.min(TOTAL_WEEKS, cur + 1), start: isoOf(start), end: isoOf(start + 6), accepting: settings.accepting, term: "Ganjil", semesters };
  }
  async function adminTasks(token, week) {
    session(token);
    const ms = await matkul();
    const hari = (t) => (ms.find((m) => slotKey(m.semester, m.matkul, m.kelas) === slotKey(t.semester, t.matkul, t.kelas)) || {}).hari || "";
    return (await rows(Number(week))).map((t) => Object.assign({}, t, { hari: hari(t) }))
      .sort((a, b) => a.semester - b.semester || DAYS.indexOf(a.hari) - DAYS.indexOf(b.hari) || a.matkul.localeCompare(b.matkul) || a.kelas.localeCompare(b.kelas));
  }
  async function adminHistory(token, id) {
    session(token);
    const { row } = await findRow(id);
    const list = history.get(id) || [{ waktu: row.dibuat, aksi: row.deskripsi ? "tambah" : "tidak-ada-tugas", pengisi: row.pengisi, sebelum: null, sesudah: snap(row) }];
    return list.slice().reverse();
  }
  async function adminUpdateTask(token, id, changes) {
    const s = session(token, true);
    const { row } = await findRow(id);
    const before = Object.assign({}, row);
    Object.assign(row, { deskripsi: changes.deskripsi, pengisi: "Admin (" + s.email + ")", diubah: new Date().toISOString() });
    logH(row, before, "edit-admin");
    return { id };
  }
  async function adminDeleteTask(token, id) {
    const s = session(token, true);
    const { row } = await findRow(id);
    if (row.status === "dihapus") throw new Error("Tugas sudah dihapus.");
    const before = Object.assign({}, row);
    Object.assign(row, { status: "dihapus", pengisi: "Admin (" + s.email + ")", diubah: new Date().toISOString() });
    logH(row, before, "hapus-admin");
    return { id };
  }
  async function adminRestoreTask(token, id) {
    const s = session(token, true);
    const { row, list } = await findRow(id);
    const as = row.deskripsi ? "ada" : "tidak-ada";
    const sib = list.filter((t) => t.id !== id && t.status !== "dihapus" && slotKey(t.semester, t.matkul, t.kelas) === slotKey(row.semester, row.matkul, row.kelas));
    if (as === "tidak-ada" && sib.length) throw new Error("Kelas ini sudah punya laporan lain di minggu yang sama.");
    sib.filter((t) => t.status === "tidak-ada").forEach((t) => { t.status = "dihapus"; });
    const before = Object.assign({}, row);
    Object.assign(row, { status: as, pengisi: "Admin (" + s.email + ")", diubah: new Date().toISOString() });
    logH(row, before, "pulihkan");
    return { id, status: as };
  }
  async function adminSetAccepting(token, accepting) { session(token, true); settings.accepting = !!accepting; return { accepting: settings.accepting }; }
  async function adminSettings(token) {
    const s = session(token);
    return {
      accepting: settings.accepting, term: "Ganjil", semesterStart: SEMESTER_START, totalWeeks: TOTAL_WEEKS, currentWeek: current(),
      accounts: s.role === "admin" ? ACCOUNTS.map(({ email, role, active }) => ({ email, role, active })) : [], designEmails: ["design.wry@example.com"],
      spreadsheetUrl: s.role === "admin" ? "https://docs.google.com/spreadsheets/" : "",
      matkul: await matkul(),
    };
  }

  // ───── Export IG (mock): tidak ada Drive; folder & file hanya dicatat di memori ─────
  const exportsLog = [];
  async function getExportData(token, week) {
    session(token);
    const cur = current();
    const w = week == null ? cur : Number(week);
    const ms = await matkul();
    const hariOf = (t) => (ms.find((m) => slotKey(m.semester, m.matkul, m.kelas) === slotKey(t.semester, t.matkul, t.kelas)) || {}).hari || "";
    const all = await rows(w);
    const tasks = all.filter((t) => t.status === "ada").map((t) => ({ semester: t.semester, hari: hariOf(t), matkul: t.matkul, kelas: t.kelas, deskripsi: t.deskripsi, tanggal: t.tanggal }))
      .sort((a, b) => a.semester - b.semester || DAYS.indexOf(a.hari) - DAYS.indexOf(b.hari) || a.matkul.localeCompare(b.matkul) || a.kelas.localeCompare(b.kelas));
    const last = exportsLog.filter((e) => e.week === w).pop() || null;
    const start = first + 7 * (w - 1);
    return {
      week: w, currentWeek: cur, maxWeek: Math.min(TOTAL_WEEKS, cur + 1), term: "Ganjil", start: isoOf(start), end: isoOf(start + 6),
      semesters: [...new Set(ms.map((m) => m.semester))].sort(), tasks, lastExport: last,
      changedSince: last ? all.filter((t) => t.diubah > last.waktu).length : 0, publicUrl: location.origin + "/",
    };
  }
  async function beginExport(token) { session(token); return { folderId: "mockFolder" + Date.now() }; }
  async function uploadExportSlide(token, folderId, index, name, base64) {
    session(token);
    const bin = atob(base64.slice(0, 400));
    if (bin.charCodeAt(0) !== 0xff || bin.charCodeAt(1) !== 0xd8) throw new Error("Slide harus JPEG 1080 × 1350.");
    console.info("[mock] slide", index + 1, name, Math.round(base64.length * 0.75 / 1024) + " KB");
    return { index };
  }
  async function finishExport(token, week, folderId, count) {
    const s = session(token);
    const rec = { week: Number(week), waktu: new Date().toISOString(), oleh: s.email, slides: count, url: folderId ? "https://drive.google.com/drive/folders/" + folderId : "" };
    exportsLog.push(rec);
    return rec;
  }

  const api = {
    getExportData, beginExport, uploadExportSlide, finishExport,
    getBoard, getFormOptions, checkExisting, saveTasks, deleteTask,
    adminLogin, adminSession, adminLogout, adminStatus, adminTasks, adminHistory,
    adminUpdateTask, adminDeleteTask, adminRestoreTask, adminSetAccepting, adminSettings,
  };
  /** Dipakai web/api.js: semua panggilan dilayani mock dengan jeda seperti server sungguhan. */
  window.WRY_MOCK = {
    call(name, args) {
      return new Promise((resolve, reject) => setTimeout(async () => {
        try {
          if (mode === "error") throw new Error("Mock: server tidak merespons");
          if (!api[name]) throw new Error("Mock belum ada untuk " + name);
          resolve(await api[name](...JSON.parse(JSON.stringify(args))));
        } catch (e) { reject(e); }
      }, mode === "slow" ? 2500 : 450));
    },
  };
})();
