"""Server pratinjau lokal untuk gas/Index.html (tanpa deploy GAS).

- "/" menyajikan gas/Index.html dengan scriptlet <?!= boot ?> diisi data dev
  dan dev/mock.js disisipkan sebagai pengganti google.script.run.
- Path lain disajikan statis dari root project (assets/, data/, dev/).
Jalankan: python dev/serve.py  →  http://127.0.0.1:5173
"""
import http.server
import json
import pathlib
import socketserver

ROOT = pathlib.Path(__file__).resolve().parent.parent
PORT = 5173


class Handler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(ROOT), **kwargs)

    def do_GET(self):
        path, _, query = self.path.split("#", 1)[0].partition("?")
        if path in ("/", "/index.html"):
            admin = "page=admin" in query.split("&")
            html = (ROOT / "gas" / ("Admin.html" if admin else "Index.html")).read_text(encoding="utf-8")
            boot = json.dumps({"assetBase": "/assets", "title": "WRY (dev)", "ready": True,
                               "publicUrl": f"http://127.0.0.1:{PORT}/"})
            html = html.replace("<?!= boot ?>", boot.replace("<", "\\u003c"))
            html = html.replace("</head>", '<script src="/dev/mock.js"></script>\n</head>', 1)
            body = html.encode("utf-8")
            self.send_response(200)
            self.send_header("Content-Type", "text/html; charset=utf-8")
            self.send_header("Cache-Control", "no-store")
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


socketserver.TCPServer.allow_reuse_address = True
with socketserver.TCPServer(("127.0.0.1", PORT), Handler) as httpd:
    print(f"WRY dev: http://127.0.0.1:{PORT}")
    httpd.serve_forever()
