/**
 * Mock google.script.run untuk pratinjau lokal. Meniru getBoard() di gas/Code.gs
 * dengan data matkul dari data/matkul-ganjil.csv dan tugas contoh acak-tetap.
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

  const SAMPLE = [
    "Menyelesaikan 1 buah headpiece & 1 mekanisme",
    "Sketsa 20 alternatif bentuk, dikumpulkan di Miro kelas",
    "Revisi moodboard & user persona, presentasi 5 menit",
    "Membuat model skala 1:5 dari foam board",
    "Rangkuman bab 3 & 4, maks. 2 halaman",
    "Render 3 view produk (KeyShot), format A3 landscape",
  ];
  const NAMES = ["Raka", "Nadia", "Bima", "Salsa", "Dimas", "Aulia"];
  const rand = (seed) => { let x = Math.sin(seed) * 10000; return x - Math.floor(x); };

  let matkulPromise;
  function matkul() {
    matkulPromise = matkulPromise || fetch("/data/matkul-ganjil.csv").then((r) => r.text()).then((text) =>
      text.trim().split(/\r?\n/).slice(1).map((line) => {
        const [semester, hari, name, kelas] = line.split(",");
        return { semester: Number(semester), hari, matkul: name, kelas };
      }));
    return matkulPromise;
  }

  async function getBoard(week) {
    const current = weekOf(today());
    const w = week == null ? current : Number(week);
    const rows = await matkul();
    const semesters = [];
    rows.forEach((m, i) => {
      let sem = semesters.find((s) => s.semester === m.semester);
      if (!sem) semesters.push(sem = { semester: m.semester, matkul: [] });
      let g = sem.matkul.find((x) => x.name === m.matkul);
      if (!g) sem.matkul.push(g = { name: m.matkul, classes: [] });
      const r = w > current ? 1 : rand(i * 31 + w * 7);
      const ago = new Date(Date.now() - rand(i + w) * 4 * 864e5).toISOString();
      const status = r < 0.45 ? "ada" : r < 0.58 ? "tidak-ada" : "kosong";
      const n = status === "ada" ? (rand(i * 3 + w) < 0.25 ? 2 : 1) : 0;
      g.classes.push({
        kelas: m.kelas, hari: m.hari, status,
        tasks: Array.from({ length: n }, (_, k) => ({
          id: "T" + w + "-" + i + "-" + k,
          deskripsi: SAMPLE[Math.floor(rand(i * 7 + k + w) * SAMPLE.length)],
          deadline: k ? deadline(w, DAYS[Math.min(4, DAYS.indexOf(m.hari) + 2)]) : deadline(w, m.hari),
          pengisi: NAMES[i % NAMES.length], diubah: ago,
        })),
        reportedBy: status === "tidak-ada" ? NAMES[(i + 2) % NAMES.length] : "",
        reportedAt: status === "tidak-ada" ? ago : "",
      });
    });
    const start = first + 7 * (w - 1);
    return { week: w, currentWeek: current, minWeek: 1, maxWeek: Math.min(TOTAL_WEEKS, current + 1), start: isoOf(start), end: isoOf(start + 6), term: "Ganjil", accepting: true, semesters };
  }

  const api = { getBoard };
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
              success && success(await api[name](...args));
            } catch (e) { failure && failure(e); }
          }, delay);
        };
      },
    });
  }
  window.google = { script: { run: runner() } };
})();
