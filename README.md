# We Remind You!

Sistem pengingat tugas mingguan mahasiswa Desain Produk ITS — program kerja HIMA IDE ITS.
Perwakilan kelas mengunggah tugas lewat web, papan tugas tampil untuk semua, dan slide Instagram
mingguan dibuat otomatis untuk tim design.

## Struktur

| Folder | Isi |
|---|---|
| `gas/` | Kode Google Apps Script: `Code.gs` (server), `Index.html` (halaman publik), `Admin.html` (backoffice) |
| `assets/` | Gambar statis, disajikan lewat jsDelivr |
| `data/` | Data awal matkul per semester |
| `dev/` | Server pratinjau lokal + mock `google.script.run` (tidak ikut ke GAS) |

## Pasang di Google Sheets

1. Buka Spreadsheet → **Extensions → Apps Script**.
2. Salin `gas/Code.gs` ke `Code.gs`; buat file HTML bernama `Index` dan `Admin`, lalu salin `gas/Index.html` dan `gas/Admin.html`.
3. Jalankan fungsi `setupSheet` sekali dan izinkan aksesnya (termasuk **Google Drive** untuk menyimpan slide IG
   ke folder "WRY Export"). Tab **Akun** dibuat berisi 2 akun contoh berpassword acak.
4. Periksa tab **Config** (tanggal mulai semester, `ASSET_BASE`) dan tab **Akun** (email, password, peran).
5. **Deploy → New deployment → Web app** — Execute as: *Me*, Who has access: *Anyone*.

Backoffice ada di URL web app yang sama dengan tambahan `?page=admin`. Login memakai email + password
dari tab **Akun**: peran `admin` (akses penuh) atau `design` (lihat status, data, & export). Ubah password
atau hapus centang **Aktif** di Sheet untuk mencabut akses; sesi yang sedang login ikut berakhir.
Password tersimpan terbuka di Sheet — jangan pakai password pribadi.
Setiap kali kode berubah, buat versi baru: **Deploy → Manage deployments → Edit → Version: New version**.

Aset dimuat dari `https://cdn.jsdelivr.net/gh/asdipura/weremindyou@main/assets`.

## Pratinjau lokal

```bash
python dev/serve.py
```

Buka http://127.0.0.1:5173 (publik) atau http://127.0.0.1:5173/?page=admin (backoffice; akun dev
`admin@wry.test` / `wry-admin` dan `design@wry.test` / `wry-design`). Tambahkan `&mock=error` atau
`&mock=slow` untuk menguji state gagal/lambat. Data mock disimpan di memori dan hilang saat dimuat ulang.
