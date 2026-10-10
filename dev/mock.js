/**
 * Mock google.script.run untuk pratinjau lokal. Meniru API di gas/Code.gs dengan
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
  const deadline = (week, hari) => isoOf(first + 7 * week + 2 + DAYS.indexOf(hari));
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
          deadline: k ? deadline(week, DAYS[Math.min(4, DAYS.indexOf(m.hari) + 2)]) : deadline(week, m.hari),
        }));
      } else if (r < 0.58) {
        list.push(Object.assign({}, base, { id: "T" + nextId++, status: "tidak-ada", pengisi: NAMES[(i + 2) % NAMES.length], deskripsi: "", deadline: "" }));
      }
    });
    store.set(week, list);
    return list;
  }
  const slotKey = (s, m, k) => [Number(s), m, k].join("|");
  const pub = (t) => ({ id: t.id, deskripsi: t.deskripsi, deadline: t.deadline, pengisi: t.pengisi, diubah: t.diubah });

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
      const tasks = items.filter((t) => t.status === "ada").sort((a, b) => a.deadline.localeCompare(b.deadline)).map(pub);
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
      accepting: mode !== "closed",
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
    const base = { minggu: week, semester: Number(p.semester), matkul: p.matkul, kelas: p.kelas, dibuat: now, diubah: now, pengisi: p.pengisi.trim() };
    const ids = [];
    if (p.mode === "tidak-ada") {
      if (inSlot.some((t) => t.status === "ada")) throw new Error("Kelas ini masih punya tugas aktif. Hapus tugasnya dulu bila memang tidak ada tugas.");
      if (!inSlot.length) { const r = Object.assign({}, base, { id: "T" + nextId++, status: "tidak-ada", deskripsi: "", deadline: "" }); list.push(r); ids.push(r.id); }
      else ids.push(inSlot[0].id);
    } else {
      inSlot.filter((t) => t.status === "tidak-ada").forEach((t) => { t.status = "dihapus"; });
      p.tasks.forEach((t) => {
        if (t.id) {
          const old = list.find((x) => x.id === t.id);
          if (!old || old.status === "dihapus") throw new Error("Tugas yang diedit tidak ditemukan. Muat ulang halaman.");
          Object.assign(old, { deskripsi: t.deskripsi.trim(), deadline: t.deadline, pengisi: base.pengisi, diubah: now });
          ids.push(old.id);
        } else {
          const r = Object.assign({}, base, { id: "T" + nextId++, status: "ada", deskripsi: t.deskripsi.trim(), deadline: t.deadline });
          list.push(r); ids.push(r.id);
        }
      });
    }
    return { ids, week };
  }

  async function deleteTask(id, pengisi) {
    for (const list of store.values()) {
      const row = list.find((t) => t.id === id);
      if (row && row.status !== "dihapus") { row.status = "dihapus"; row.pengisi = pengisi; return { id }; }
    }
    throw new Error("Tugas tidak ditemukan atau sudah dihapus.");
  }

  const api = { getBoard, getFormOptions, checkExisting, saveTasks, deleteTask };
  function runner(success, failure) {
    return new Proxy({}, {
      get(_, name) {
        if (name === "withSuccessHandler") return (fn) => runner(fn, failure);
        if (name === "withFailureHandler") return (fn) => runner(success, fn);
        return (...args) => {
          const delay = mode === "slow" ? 2500 : 450;
          setTimeout(async () => {
            try {
              if (mode === "error") throw new Error("Mock: server tidak merespons");
              if (!api[name]) throw new Error("Mock belum ada untuk " + name);
              success && success(await api[name](...JSON.parse(JSON.stringify(args))));
            } catch (e) { failure && failure(e); }
          }, delay);
        };
      },
    });
  }
  window.google = { script: { run: runner() } };
})();
