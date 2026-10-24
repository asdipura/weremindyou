# We Remind You!

Sistem pengingat tugas mingguan mahasiswa Desain Produk ITS — program kerja HIMA IDE ITS.
Perwakilan kelas mengunggah tugas lewat web, papan tugas tampil untuk semua, dan slide Instagram
mingguan dibuat otomatis untuk tim design.

## Struktur

| Folder | Isi |
|---|---|
| `web/` | Frontend statis untuk Cloudflare Pages: `index.html` (publik, `/`), `admin.html` (backoffice, `/admin`), `assets/`, `config.js`, `api.js` |
| `gas/` | `Code.gs`: backend Google Apps Script (API JSON lewat `doPost`, data di Spreadsheet) |
| `data/` | Data awal matkul per semester |
| `dev/` | Server pratinjau lokal + mock API (tidak ikut di-deploy) |

## 1. Backend: Google Apps Script

1. Buka Spreadsheet → **Extensions → Apps Script**, salin `gas/Code.gs` ke `Code.gs`
   (file HTML `Index`/`Admin` lama boleh dihapus).
2. Jalankan fungsi `setupSheet` sekali dan izinkan aksesnya (termasuk **Google Drive** untuk menyimpan slide IG
   ke folder "WRY Export"). Tab **Akun** dibuat berisi 2 akun contoh berpassword acak.
3. Periksa tab **Config** (tanggal mulai semester, `PUBLIC_URL` = URL Cloudflare Pages) dan tab **Akun**.
4. **Deploy → New deployment → Web app** — Execute as: *Me*, Who has access: *Anyone*. Salin URL yang
   berakhiran `/exec`.

Setiap kali `Code.gs` berubah: **Deploy → Manage deployments → Edit → Version: New version** (URL tetap sama).
URL web app lama yang dibuka langsung akan menampilkan tautan ke `PUBLIC_URL`.

## 2. Frontend: Cloudflare Pages

1. Isi `apiUrl` di `web/config.js` dengan URL `/exec` tadi, commit, push.
2. Cloudflare dashboard → **Workers & Pages → Create → Pages → Connect to Git** → pilih repo ini.
3. Build settings: Framework preset *None*, Build command *(kosong)*, Build output directory **`web`**.
4. Setiap push ke `main` otomatis ter-deploy. Publik di `https://<proyek>.pages.dev/`,
   backoffice di `https://<proyek>.pages.dev/admin`.

Login backoffice memakai email + password dari tab **Akun**: peran `admin` (akses penuh) atau `design`
(lihat status, data, & export). Ubah password atau hapus centang **Aktif** di Sheet untuk mencabut akses;
sesi yang sedang login ikut berakhir. Password tersimpan terbuka di Sheet — jangan pakai password pribadi.

## Pratinjau lokal

```bash
python dev/serve.py
```

Buka http://127.0.0.1:5173 (publik) atau http://127.0.0.1:5173/admin (backoffice; akun dev
`admin@wry.test` / `wry-admin` dan `design@wry.test` / `wry-design`). Tambahkan `?mock=error` atau
`?mock=slow` untuk menguji state gagal/lambat, atau `?api=real` untuk memakai Apps Script sungguhan
dari `web/config.js`. Data mock disimpan di memori dan hilang saat dimuat ulang.
