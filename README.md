# We Remind You!

Sistem pengingat tugas mingguan mahasiswa Desain Produk ITS — program kerja HIMA IDE ITS.
Perwakilan kelas mengunggah tugas lewat web, papan tugas tampil untuk semua, dan slide Instagram
mingguan dibuat otomatis untuk tim design.

## Struktur

| Folder | Isi |
|---|---|
| `gas/` | Kode Google Apps Script: `Code.gs` (server) dan `Index.html` (halaman publik) |
| `assets/` | Gambar statis, disajikan lewat jsDelivr |
| `data/` | Data awal matkul per semester |
| `dev/` | Server pratinjau lokal + mock `google.script.run` (tidak ikut ke GAS) |

## Pasang di Google Sheets

1. Buka Spreadsheet → **Extensions → Apps Script**.
2. Salin `gas/Code.gs` ke `Code.gs`; buat file HTML bernama `Index` lalu salin `gas/Index.html`.
3. Jalankan fungsi `setupSheet` sekali dan izinkan aksesnya.
4. Periksa tab **Config** (tanggal mulai semester, email admin, `ASSET_BASE`).
5. **Deploy → New deployment → Web app** — Execute as: *Me*, Who has access: *Anyone*.

Aset dimuat dari `https://cdn.jsdelivr.net/gh/asdipura/weremindyou@main/assets`.

## Pratinjau lokal

```bash
python dev/serve.py
```

Buka http://127.0.0.1:5173. Tambahkan `?mock=error` atau `?mock=slow` untuk menguji state gagal/lambat.
