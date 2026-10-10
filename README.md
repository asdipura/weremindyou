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
3. Jalankan fungsi `setupSheet` sekali dan izinkan aksesnya (termasuk **mengirim email** untuk kode OTP backoffice
   dan **Google Drive** untuk menyimpan slide IG ke folder "WRY Export").
4. Periksa tab **Config** (tanggal mulai semester, `ADMIN_EMAILS`, `DESIGN_EMAILS`, `ASSET_BASE`).
5. **Deploy → New deployment → Web app** — Execute as: *Me*, Who has access: *Anyone*.

Backoffice ada di URL web app yang sama dengan tambahan `?page=admin`. Login memakai kode 6 angka
yang dikirim ke email di `ADMIN_EMAILS` (akses penuh) atau `DESIGN_EMAILS` (lihat status & data).
Setiap kali kode berubah, buat versi baru: **Deploy → Manage deployments → Edit → Version: New version**.

Aset dimuat dari `https://cdn.jsdelivr.net/gh/asdipura/weremindyou@main/assets`.

## Pratinjau lokal

```bash
python dev/serve.py
```

Buka http://127.0.0.1:5173 (publik) atau http://127.0.0.1:5173/?page=admin (backoffice; email
`admin.wry@example.com` / `design.wry@example.com`, kode `123456`). Tambahkan `&mock=error` atau
`&mock=slow` untuk menguji state gagal/lambat. Data mock disimpan di memori dan hilang saat dimuat ulang.
