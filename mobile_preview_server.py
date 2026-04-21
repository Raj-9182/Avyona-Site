from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
import os


ROOT = Path(__file__).resolve().parent
DIST_DIR = ROOT / "dist"
HOST = "0.0.0.0"
PORT = 8000


class SpaHandler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(DIST_DIR), **kwargs)

    def do_GET(self):
        requested = self.path.split("?", 1)[0].split("#", 1)[0]
        if requested.startswith("/assets/"):
            return super().do_GET()

        target = DIST_DIR / requested.lstrip("/")
        if requested in {"", "/"} or target.exists():
            return super().do_GET()

        self.path = "/index.html"
        return super().do_GET()


def main():
    os.chdir(DIST_DIR)
    server = ThreadingHTTPServer((HOST, PORT), SpaHandler)
    print(f"Serving {DIST_DIR} on http://{HOST}:{PORT}")
    server.serve_forever()


if __name__ == "__main__":
    main()
