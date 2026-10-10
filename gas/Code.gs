/**
 * We Remind You (WRY) · HIMA IDE ITS
 * Files: Code.gs + Index.html (+ Admin.html di batch 4).
 * Buat dari Spreadsheet → Extensions → Apps Script, lalu jalankan setupSheet() sekali.
 * Helper privat diakhiri '_' supaya tidak bisa dipanggil lewat google.script.run.
 */
const CONFIG = Object.freeze({
  TITLE: "We Remind You! — HIMA IDE ITS",
  TZ: "Asia/Jakarta",
  DAYS: ["Senin", "Selasa", "Rabu", "Kamis", "Jumat"],
  MAX_TASKS_PER_SUBMIT: 10,
  CACHE_SECONDS: 300,
});

const SHEETS = Object.freeze({
  config: { name: "Config", header: ["KEY", "VALUE", "KETERANGAN"] },
  matkul: { name: "Matkul", header: ["Semester", "Hari", "Matkul", "Kelas", "Aktif"] },
  tugas: { name: "Tugas", header: ["ID", "Minggu", "Semester", "Matkul", "Kelas", "Status", "Deskripsi", "Deadline", "Pengisi", "Dibuat", "Diubah"] },
  riwayat: { name: "Riwayat", header: ["Waktu", "ID Tugas", "Aksi", "Pengisi", "Sebelum", "Sesudah"] },
  export: { name: "Export", header: ["Minggu", "Waktu", "Oleh", "Jumlah slide", "Folder"] },
});

/** Status baris Tugas. "tidak-ada" = kelas melapor tidak ada tugas untuk matkul itu. */
const STATUS = Object.freeze({ ada: "ada", tidakAda: "tidak-ada", dihapus: "dihapus" });

/** Data awal semester ganjil 2026/2027: semester|hari|matkul|kelas. */
const MATKUL_SEED = [
  "1|Senin|Design Thinking|A",
  "1|Selasa|Dasar Desain 1|A",
  "1|Selasa|Dasar Desain 1|B",
  "1|Selasa|Dasar Desain 1|C",
  "1|Selasa|Dasar Desain 1|D",
  "1|Rabu|Kreativitas Produk|A",
  "1|Rabu|Kreativitas Produk|B",
  "1|Rabu|Kreativitas Produk|C",
  "1|Kamis|Sejarah Desain|A",
  "1|Kamis|Sejarah Desain|B",
  "1|Kamis|Sejarah Desain|C",
  "1|Kamis|Design Thinking|B",
  "1|Jumat|Gambar Produk 1|A",
  "1|Jumat|Gambar Produk 1|B",
  "1|Jumat|Gambar Produk 1|C",
  "1|Jumat|Gambar Produk 1|D",
  "3|Senin|Semantika Produk|A",
  "3|Senin|Semantika Produk|B",
  "3|Senin|Semantika Produk|C",
  "3|Senin|Prototipe & Model|C",
  "3|Senin|Metode Desain|A",
  "3|Senin|Metode Desain|B",
  "3|Senin|Metode Desain|C",
  "3|Selasa|CAD|C",
  "3|Selasa|SDP 1 Transportasi|A",
  "3|Selasa|SDP 1 Transportasi|B",
  "3|Selasa|SDP 1 Furniture|C",
  "3|Selasa|SDP 1 Furniture|D",
  "3|Selasa|SDP 1 Apparel|E",
  "3|Selasa|SDP 1 Apparel|F",
  "3|Selasa|SDP 1 Appliances|G",
  "3|Selasa|SDP 1 Appliances|H",
  "3|Rabu|Prototipe & Model|A",
  "3|Rabu|Prototipe & Model|B",
  "3|Rabu|CAD|B",
  "3|Rabu|CAD|E",
  "3|Kamis|Ergonomi|A",
  "3|Kamis|Ergonomi|B",
  "3|Kamis|Ergonomi|C",
  "3|Kamis|CAD|A",
  "3|Kamis|CAD|D",
  "5|Senin|Perhiasan|Q",
  "5|Senin|Furniture|Q",
  "5|Senin|Teknik Presentasi|A",
  "5|Senin|Teknik Presentasi|B",
  "5|Senin|Teknik Presentasi|C",
  "5|Selasa|Desain dan Gaya Hidup|A",
  "5|Selasa|Desain dan Gaya Hidup|B",
  "5|Selasa|Desain dan Gaya Hidup|C",
  "5|Rabu|SDP Transportasi|A",
  "5|Rabu|SDP Transportasi|B",
  "5|Rabu|SDP Furniture|C",
  "5|Rabu|SDP Furniture|D",
  "5|Rabu|SDP Apparel|E",
  "5|Rabu|SDP Apparel|F",
  "5|Rabu|SDP Appliances|G",
  "5|Rabu|SDP Appliances|H",
  "5|Kamis|CAM|B",
  "5|Kamis|CAM|C",
  "5|Kamis|Car Styling|Q",
  "5|Kamis|Alat Kesehatan|Q",
  "5|Kamis|Toys|Q",
  "5|Kamis|Apparel|Q",
  "5|Jumat|CAM|A",
  "7|Senin|Pra Tugas Akhir|A",
  "7|Senin|Pra Tugas Akhir|B",
  "7|Senin|Pra Tugas Akhir|C",
  "7|Senin|Pra Tugas Akhir|D",
  "7|Selasa|Etika Profesi|A",
  "7|Kamis|Etika Profesi|B",
  "7|Kamis|Etika Profesi|C",
  "7|Jumat|Manajemen Desain|A",
  "7|Jumat|Manajemen Desain|B",
];

// ───────────────────────── Web app ─────────────────────────

function doGet(e) {
  const page = e && e.parameter && e.parameter.page;
  if (page === "admin") {
    return HtmlService.createHtmlOutput("<p style='font:16px sans-serif;padding:24px'>Backoffice dibangun di batch 4.</p>")
      .setTitle("WRY Backoffice");
  }
  let boot = { assetBase: "", title: CONFIG.TITLE, ready: false };
  try {
    const cfg = loadConfig_();
    boot = { assetBase: cfg.assetBase, title: cfg.title, ready: true, initialWeek: weekNumber_(todayIso_(), cfg) };
  } catch (error) {
    console.warn("Config belum siap: " + error.message);
  }
  const template = HtmlService.createTemplateFromFile("Index");
  // Disisipkan ke <script type="application/json">; '<' di-escape agar tidak menutup tag.
  template.boot = JSON.stringify(boot).replace(/</g, "\\u003c");
  return template.evaluate()
    .setTitle(boot.title)
    .addMetaTag("viewport", "width=device-width, initial-scale=1");
}

// ───────────────────────── Setup admin ─────────────────────────

/** Jalankan sekali dari editor Apps Script. Aman diulang: data lama tidak ditimpa. */
function setupSheet() {
  return locked_(function () {
    const book = SpreadsheetApp.getActiveSpreadsheet();
    if (!book) throw new Error("Buka Apps Script dari Spreadsheet (Extensions → Apps Script).");
    PropertiesService.getScriptProperties().setProperty("SPREADSHEET_ID", book.getId());

    const config = sheet_(book, SHEETS.config);
    const defaults = [
      ["SEMESTER_START", "2026-08-31", "Senin minggu ke-1 perkuliahan, format yyyy-MM-dd. Siklus WRY: Sabtu–Jumat."],
      ["TOTAL_WEEKS", "16", "Jumlah minggu perkuliahan dalam semester (1–30)."],
      ["ACTIVE_TERM", "Ganjil", "Ganjil atau Genap. Menentukan semester yang tampil (1/3/5/7 atau 2/4/6/8)."],
      ["ACCEPT_SUBMISSIONS", "TRUE", "TRUE = form menerima tugas. FALSE = papan tetap tampil, form ditutup."],
      ["ASSET_BASE", "https://cdn.jsdelivr.net/gh/asdipura/weremindyou@main/assets", "URL folder aset (tanpa / di akhir)."],
      ["APP_TITLE", CONFIG.TITLE, "Judul tab browser."],
      ["ADMIN_EMAILS", "admin.wry@example.com | ketua.wry@example.com", "Email yang boleh login backoffice (OTP). Pisahkan dengan |."],
      ["DESIGN_EMAILS", "design.wry@example.com", "Penerima email ringkasan Jumat 23.59. Pisahkan dengan |."],
    ];
    const existing = new Set(config.getDataRange().getDisplayValues().slice(1).map(function (r) { return String(r[0]).trim(); }));
    defaults.forEach(function (row) { if (!existing.has(row[0])) config.appendRow(row); });
    config.getRange(2, 2, Math.max(1, config.getLastRow() - 1), 1).setNumberFormat("@").setBackground("#fff2cc");
    config.setColumnWidth(1, 200); config.setColumnWidth(2, 420); config.setColumnWidth(3, 520);

    const matkul = sheet_(book, SHEETS.matkul);
    if (matkul.getLastRow() < 2) {
      const rows = MATKUL_SEED.map(function (s) { const p = s.split("|"); return [Number(p[0]), p[1], p[2], p[3], "TRUE"]; });
      matkul.getRange(2, 1, rows.length, 5).setValues(rows);
    }
    const tugas = sheet_(book, SHEETS.tugas);
    tugas.getRange("A:K").setNumberFormat("@"); // Simpan tanggal sebagai teks ISO, bebas zona waktu.
    sheet_(book, SHEETS.riwayat).getRange("A:F").setNumberFormat("@");
    sheet_(book, SHEETS.export);
    bumpVersion_();
    SpreadsheetApp.flush();
    const result = { spreadsheet: book.getUrl(), next: "Cek tab Config, lalu Deploy → New deployment → Web app (Execute as: Me, Access: Anyone)." };
    console.log(JSON.stringify(result, null, 2));
    return result;
  });
}

// ───────────────────────── API publik ─────────────────────────

/** Papan tugas satu minggu. Kosong = minggu berjalan. */
function getBoard(week) {
  const cfg = loadConfig_();
  const current = weekNumber_(todayIso_(), cfg);
  const w = week === undefined || week === null ? current : clampWeek_(week, cfg);
  const cache = CacheService.getScriptCache();
  const key = "board_" + version_() + "_" + w + "_" + current;
  const hit = cache.get(key);
  if (hit) return JSON.parse(hit);

  const matkul = readMatkul_(cfg);
  const rows = readTugas_().filter(function (t) { return t.minggu === w && t.status !== STATUS.dihapus; });
  const bySlot = {};
  rows.forEach(function (t) {
    const k = slotKey_(t.semester, t.matkul, t.kelas);
    (bySlot[k] = bySlot[k] || []).push(t);
  });

  const semesters = [];
  matkul.forEach(function (m) {
    let sem = semesters.find(function (s) { return s.semester === m.semester; });
    if (!sem) semesters.push(sem = { semester: m.semester, matkul: [] });
    let group = sem.matkul.find(function (g) { return g.name === m.matkul; });
    if (!group) sem.matkul.push(group = { name: m.matkul, classes: [] });
    const items = bySlot[slotKey_(m.semester, m.matkul, m.kelas)] || [];
    const tasks = items.filter(function (t) { return t.status === STATUS.ada; })
      .sort(function (a, b) { return a.deadline < b.deadline ? -1 : a.deadline > b.deadline ? 1 : 0; })
      .map(publicTask_);
    const none = items.find(function (t) { return t.status === STATUS.tidakAda; });
    group.classes.push({
      kelas: m.kelas,
      hari: m.hari,
      status: tasks.length ? "ada" : none ? "tidak-ada" : "kosong",
      tasks: tasks,
      reportedBy: none && !tasks.length ? none.pengisi : "",
      reportedAt: none && !tasks.length ? none.diubah : "",
    });
  });

  const range = cycleRange_(w, cfg);
  const result = {
    week: w,
    currentWeek: current,
    minWeek: 1,
    maxWeek: Math.min(cfg.totalWeeks, current + 1),
    start: range.start,
    end: range.end,
    term: cfg.term,
    accepting: cfg.accepting,
    semesters: semesters,
  };
  cache.put(key, JSON.stringify(result), CONFIG.CACHE_SECONDS);
  return result;
}

/** Daftar pilihan form (batch 3). */
function getFormOptions() {
  const cfg = loadConfig_();
  const current = weekNumber_(todayIso_(), cfg);
  return {
    accepting: cfg.accepting,
    currentWeek: current,
    weeks: Array.from({ length: Math.min(cfg.totalWeeks, current + 1) }, function (_, i) {
      const r = cycleRange_(i + 1, cfg);
      return { week: i + 1, start: r.start, end: r.end };
    }),
    matkul: readMatkul_(cfg).map(function (m) {
      return { semester: m.semester, hari: m.hari, matkul: m.matkul, kelas: m.kelas };
    }),
  };
}

/** Deadline default: hari kuliah kelas itu, Senin–Jumat setelah minggu WRY ditutup. */
function getDefaultDeadline(week, hari) {
  const cfg = loadConfig_();
  return defaultDeadline_(clampWeek_(week, cfg), hari, cfg);
}

/** Tugas aktif untuk satu slot, dipakai peringatan duplikat di form. */
function checkExisting(week, semester, matkul, kelas) {
  const cfg = loadConfig_();
  const w = clampWeek_(week, cfg);
  const slot = findSlot_(cfg, semester, matkul, kelas);
  return readTugas_().filter(function (t) {
    return t.minggu === w && t.status !== STATUS.dihapus && slotKey_(t.semester, t.matkul, t.kelas) === slotKey_(slot.semester, slot.matkul, slot.kelas);
  }).map(function (t) { return Object.assign(publicTask_(t), { status: t.status }); });
}

/**
 * Simpan laporan satu slot (matkul + kelas + minggu).
 * payload: {week, semester, matkul, kelas, pengisi, mode: "ada"|"tidak-ada", tasks: [{id?, deskripsi, deadline}]}
 */
function saveTasks(payload) {
  if (!payload || typeof payload !== "object") throw new Error("Data tidak valid.");
  const cfg = loadConfig_();
  if (!cfg.accepting) throw new Error("Form unggah sedang ditutup oleh admin WRY.");
  const week = clampWeek_(payload.week, cfg);
  const slot = findSlot_(cfg, payload.semester, payload.matkul, payload.kelas);
  const pengisi = field_(payload.pengisi, "Nama pengisi", 60, true);
  const mode = payload.mode === STATUS.tidakAda ? STATUS.tidakAda : STATUS.ada;
  const tasks = mode === STATUS.ada ? payload.tasks : [];
  if (mode === STATUS.ada && (!Array.isArray(tasks) || !tasks.length || tasks.length > CONFIG.MAX_TASKS_PER_SUBMIT))
    throw new Error("Isi 1–" + CONFIG.MAX_TASKS_PER_SUBMIT + " tugas.");
  const clean = tasks.map(function (t) {
    return {
      id: t.id ? String(t.id) : "",
      deskripsi: field_(t.deskripsi, "Deskripsi tugas", 160, true),
      deadline: isoDate_(t.deadline, "Deadline"),
    };
  });

  return locked_(function () {
    const sheet = sheetByName_(SHEETS.tugas.name);
    const all = readTugas_(sheet);
    const now = new Date().toISOString();
    const inSlot = all.filter(function (t) {
      return t.minggu === week && t.status !== STATUS.dihapus && slotKey_(t.semester, t.matkul, t.kelas) === slotKey_(slot.semester, slot.matkul, slot.kelas);
    });
    const saved = [];

    if (mode === STATUS.tidakAda) {
      if (inSlot.some(function (t) { return t.status === STATUS.ada; }))
        throw new Error("Kelas ini masih punya tugas aktif. Hapus tugasnya dulu bila memang tidak ada tugas.");
      if (!inSlot.length) saved.push(appendTask_(sheet, week, slot, STATUS.tidakAda, "", "", pengisi, now));
      else saved.push(inSlot[0].id);
    } else {
      // Laporan "tidak ada tugas" gugur begitu ada tugas masuk.
      inSlot.filter(function (t) { return t.status === STATUS.tidakAda; }).forEach(function (t) {
        updateRow_(sheet, t, { status: STATUS.dihapus, pengisi: pengisi, diubah: now }, "hapus-otomatis");
      });
      clean.forEach(function (t) {
        if (t.id) {
          const old = all.find(function (x) { return x.id === t.id; });
          if (!old || old.status === STATUS.dihapus) throw new Error("Tugas yang diedit tidak ditemukan. Muat ulang halaman.");
          updateRow_(sheet, old, { minggu: week, semester: slot.semester, matkul: slot.matkul, kelas: slot.kelas, deskripsi: t.deskripsi, deadline: t.deadline, pengisi: pengisi, diubah: now }, "edit");
          saved.push(old.id);
        } else {
          saved.push(appendTask_(sheet, week, slot, STATUS.ada, t.deskripsi, t.deadline, pengisi, now));
        }
      });
    }
    bumpVersion_();
    return { ids: saved, week: week };
  });
}

/** Soft delete: baris tetap ada dengan status "dihapus"; admin bisa memulihkan. */
function deleteTask(id, pengisi) {
  const name = field_(pengisi, "Nama pengisi", 60, true);
  return locked_(function () {
    const sheet = sheetByName_(SHEETS.tugas.name);
    const row = readTugas_(sheet).find(function (t) { return t.id === String(id); });
    if (!row || row.status === STATUS.dihapus) throw new Error("Tugas tidak ditemukan atau sudah dihapus.");
    updateRow_(sheet, row, { status: STATUS.dihapus, pengisi: name, diubah: new Date().toISOString() }, "hapus");
    bumpVersion_();
    return { id: row.id };
  });
}

// ───────────────────────── Minggu & tanggal ─────────────────────────
// Semua tanggal disimpan & dihitung sebagai teks ISO yyyy-MM-dd (WIB) agar bebas pergeseran zona waktu.

function todayIso_() {
  return Utilities.formatDate(new Date(), CONFIG.TZ, "yyyy-MM-dd");
}
function dayNumber_(iso) {
  const p = iso.split("-").map(Number);
  return Math.round(Date.UTC(p[0], p[1] - 1, p[2]) / 86400000);
}
function isoFromDay_(n) {
  return new Date(n * 86400000).toISOString().slice(0, 10);
}
/** Sabtu sebelum Senin minggu ke-1 = awal siklus WRY minggu ke-1. */
function firstCycleDay_(cfg) {
  return dayNumber_(cfg.semesterStart) - 2;
}
function weekNumber_(iso, cfg) {
  const w = Math.floor((dayNumber_(iso) - firstCycleDay_(cfg)) / 7) + 1;
  return Math.min(Math.max(w, 1), cfg.totalWeeks);
}
function cycleRange_(week, cfg) {
  const start = firstCycleDay_(cfg) + 7 * (week - 1);
  return { start: isoFromDay_(start), end: isoFromDay_(start + 6) };
}
function defaultDeadline_(week, hari, cfg) {
  const index = CONFIG.DAYS.indexOf(hari);
  if (index < 0) throw new Error("Hari kuliah tidak valid.");
  return isoFromDay_(firstCycleDay_(cfg) + 7 * week + 2 + index); // Senin setelah Jumat penutupan + offset hari.
}
function clampWeek_(week, cfg) {
  const w = Number(week);
  if (!Number.isInteger(w) || w < 1 || w > cfg.totalWeeks) throw new Error("Minggu tidak valid.");
  return w;
}
function isoDate_(value, label) {
  const s = String(value || "").trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s) || isoFromDay_(dayNumber_(s)) !== s) throw new Error(label + " tidak valid.");
  return s;
}

// ───────────────────────── Config & data ─────────────────────────

function loadConfig_() {
  const book = book_();
  const sheet = book.getSheetByName(SHEETS.config.name);
  if (!sheet) throw new Error("Tab Config tidak ditemukan. Jalankan setupSheet.");
  const map = Object.create(null);
  sheet.getDataRange().getDisplayValues().slice(1).forEach(function (r) {
    const key = String(r[0] || "").trim();
    if (key) map[key] = String(r[1] || "").trim();
  });
  const term = map.ACTIVE_TERM === "Genap" ? "Genap" : "Ganjil";
  const accepting = String(map.ACCEPT_SUBMISSIONS || "TRUE").toUpperCase() === "TRUE";
  const totalWeeks = Number(map.TOTAL_WEEKS || 16);
  if (!Number.isInteger(totalWeeks) || totalWeeks < 1 || totalWeeks > 30) throw new Error("TOTAL_WEEKS harus 1–30.");
  const semesterStart = isoDate_(map.SEMESTER_START, "SEMESTER_START");
  if (new Date(semesterStart + "T00:00:00Z").getUTCDay() !== 1) throw new Error("SEMESTER_START harus hari Senin.");
  return {
    book: book,
    semesterStart: semesterStart,
    totalWeeks: totalWeeks,
    term: term,
    accepting: accepting,
    assetBase: String(map.ASSET_BASE || "").replace(/\/+$/, ""),
    title: map.APP_TITLE || CONFIG.TITLE,
    adminEmails: list_(map.ADMIN_EMAILS),
    designEmails: list_(map.DESIGN_EMAILS),
  };
}

function readMatkul_(cfg) {
  const parity = cfg.term === "Ganjil" ? 1 : 0;
  return sheetByName_(SHEETS.matkul.name).getDataRange().getDisplayValues().slice(1)
    .map(function (r) {
      return { semester: Number(r[0]), hari: String(r[1]).trim(), matkul: String(r[2]).trim(), kelas: String(r[3]).trim(), aktif: String(r[4]).toUpperCase() !== "FALSE" };
    })
    .filter(function (m) { return m.aktif && m.matkul && m.kelas && m.semester % 2 === parity; })
    .sort(function (a, b) {
      return a.semester - b.semester ||
        CONFIG.DAYS.indexOf(a.hari) - CONFIG.DAYS.indexOf(b.hari) ||
        a.matkul.localeCompare(b.matkul, "id") ||
        a.kelas.localeCompare(b.kelas, "id");
    });
}

function readTugas_(sheet) {
  const s = sheet || sheetByName_(SHEETS.tugas.name);
  const last = s.getLastRow();
  if (last < 2) return [];
  return s.getRange(2, 1, last - 1, SHEETS.tugas.header.length).getDisplayValues().map(function (r, i) {
    return {
      row: i + 2, id: r[0], minggu: Number(r[1]), semester: Number(r[2]), matkul: r[3], kelas: r[4],
      status: r[5], deskripsi: r[6], deadline: r[7], pengisi: r[8], dibuat: r[9], diubah: r[10],
    };
  }).filter(function (t) { return t.id; });
}

function findSlot_(cfg, semester, matkul, kelas) {
  const slot = readMatkul_(cfg).find(function (m) {
    return m.semester === Number(semester) && m.matkul === String(matkul) && m.kelas === String(kelas);
  });
  if (!slot) throw new Error("Matkul atau kelas tidak terdaftar.");
  return slot;
}

function publicTask_(t) {
  return { id: t.id, deskripsi: t.deskripsi, deadline: t.deadline, pengisi: t.pengisi, diubah: t.diubah || t.dibuat };
}

function appendTask_(sheet, week, slot, status, deskripsi, deadline, pengisi, now) {
  const id = "T" + Utilities.formatDate(new Date(), CONFIG.TZ, "yyMMdd") + "-" + Utilities.getUuid().slice(0, 6).toUpperCase();
  sheet.appendRow([id, String(week), String(slot.semester), slot.matkul, slot.kelas, status, safeCell_(deskripsi), deadline, safeCell_(pengisi), now, now]);
  log_(id, status === STATUS.ada ? "tambah" : "tidak-ada-tugas", pengisi, "", JSON.stringify({ minggu: week, matkul: slot.matkul, kelas: slot.kelas, deskripsi: deskripsi, deadline: deadline }));
  return id;
}

function updateRow_(sheet, old, changes, action) {
  const next = Object.assign({}, old, changes);
  sheet.getRange(old.row, 2, 1, 10).setValues([[
    String(next.minggu), String(next.semester), next.matkul, next.kelas, next.status,
    safeCell_(next.deskripsi), next.deadline, safeCell_(next.pengisi), next.dibuat, next.diubah,
  ]]);
  const pick = function (t) { return JSON.stringify({ minggu: t.minggu, status: t.status, deskripsi: t.deskripsi, deadline: t.deadline }); };
  log_(old.id, action, next.pengisi, pick(old), pick(next));
}

function log_(id, action, pengisi, before, after) {
  sheetByName_(SHEETS.riwayat.name).appendRow([new Date().toISOString(), id, action, safeCell_(pengisi), before, after]);
}

// ───────────────────────── Utilitas ─────────────────────────

function book_() {
  const id = PropertiesService.getScriptProperties().getProperty("SPREADSHEET_ID");
  if (!id) throw new Error("Jalankan setupSheet dari editor Apps Script terlebih dahulu.");
  return SpreadsheetApp.openById(id);
}
function sheetByName_(name) {
  const s = book_().getSheetByName(name);
  if (!s) throw new Error("Tab " + name + " tidak ditemukan. Jalankan setupSheet.");
  return s;
}
function sheet_(book, def) {
  let s = book.getSheetByName(def.name);
  if (!s) s = book.insertSheet(def.name);
  if (s.getLastRow() === 0) s.appendRow(def.header);
  const current = s.getRange(1, 1, 1, def.header.length).getDisplayValues()[0];
  if (current.join("\u001f") !== def.header.join("\u001f"))
    throw new Error("Header tab " + def.name + " berbeda. Data tidak diubah; cocokkan header dahulu.");
  s.getRange(1, 1, 1, def.header.length).setBackground("#151515").setFontColor("#ffffff").setFontWeight("bold");
  s.setFrozenRows(1);
  return s;
}
function slotKey_(semester, matkul, kelas) {
  return [Number(semester), matkul, kelas].join("\u001f");
}
function list_(value) {
  return String(value || "").split(/[|\r\n,]+/).map(function (s) { return s.trim().toLowerCase(); }).filter(Boolean);
}
function field_(value, label, max, required) {
  if (typeof value !== "string") throw new Error(label + " tidak valid.");
  const s = value.trim();
  if ((required && !s) || s.length > max || /[\u0000-\u0008\u000b\u000c\u000e-\u001f]/.test(s))
    throw new Error("Periksa " + label.toLowerCase() + " (maks. " + max + " karakter).");
  return s;
}
function safeCell_(s) {
  return /^[\s]*[=+\-@]/.test(s) ? "'" + s : s;
}
function version_() {
  return PropertiesService.getScriptProperties().getProperty("DATA_VERSION") || "0";
}
function bumpVersion_() {
  PropertiesService.getScriptProperties().setProperty("DATA_VERSION", String(Date.now()));
}
function locked_(fn) {
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(20000)) throw new Error("Server sedang sibuk. Silakan coba lagi.");
  try {
    return fn();
  } finally {
    lock.releaseLock();
  }
}
