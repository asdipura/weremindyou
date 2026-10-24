"""Server pratinjau lokal untuk web/ (frontend Cloudflare Pages) tanpa deploy.

- "/" dan "/admin" menyajikan web/index.html & web/admin.html (meniru pretty URL Pages)
  dengan dev/mock.js disisipkan, jadi semua panggilan API dilayani mock.
  Tambahkan ?api=real untuk memakai apiUrl di web/config.js (Apps Script sungguhan).
- Path lain disajikan statis dari web/; /dev/ dan /data/ dari root project.
Jalankan: python dev/serve.py  →  http://127.0.0.1:5173
"""
import http.server
import pathlib
import socketserver

ROOT = pathlib.Path(__file__).resolve().parent.parent
WEB = ROOT / "web"
PORT = 5173
PAGES = {"/": "index.html", "/index.html": "index.html", "/admin": "admin.html", "/admin/": "admin.html", "/admin.html": "admin.html"}


class Handler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(WEB), **kwargs)

    def translate_path(self, path):
        clean = path.split("?", 1)[0].split("#", 1)[0]
        if clean.startswith(("/dev/", "/data/")):
            return str(ROOT / clean.lstrip("/"))
        return super().translate_path(path)

    def do_GET(self):
        path, _, query = self.path.split("#", 1)[0].partition("?")
        if path in PAGES:
            html = (WEB / PAGES[path]).read_text(encoding="utf-8")
            if "api=real" not in query.split("&"):
                html = html.replace("</head>", '<script src="/dev/mock.js"></script>\n</head>', 1)
            body = html.encode("utf-8")
            self.send_response(200)
            self.send_header("Content-Type", "text/html; charset=utf-8")
            self.send_header("Content-Length", str(len(body)))
            self.end_headers()
            self.wfile.write(body)
            return
        super().do_GET()

    def do_PUT(self):
        """Dev saja: simpan hasil render (mis. slide IG) ke dev/_out/ untuk dicek visual."""
        name = self.path.rsplit("/", 1)[-1]
        if not self.path.startswith("/dev/_out/") or not name or "/" in name or ".." in name:
            self.send_error(400)
            return
        out = ROOT / "dev" / "_out"
        out.mkdir(exist_ok=True)
        length = int(self.headers.get("Content-Length", 0))
        (out / name).write_bytes(self.rfile.read(length))
        self.send_response(204)
        self.end_headers()

    def end_headers(self):
        self.send_header("Cache-Control", "no-store")
        super().end_headers()


# Threading: satu koneksi browser yang menggantung tidak menahan permintaan lain.
socketserver.ThreadingTCPServer.allow_reuse_address = True
socketserver.ThreadingTCPServer.daemon_threads = True
with socketserver.ThreadingTCPServer(("127.0.0.1", PORT), Handler) as httpd:
    print(f"WRY dev: http://127.0.0.1:{PORT}")
    httpd.serve_forever()
