#!/usr/bin/env python3
"""Simple local dev server for Aya's Mini Games.
Run: python3 server.py
"""
import http.server
import socketserver
import os
import webbrowser

PORT = 8080
ROOT = os.path.dirname(os.path.abspath(__file__))

class NoListingHandler(http.server.SimpleHTTPRequestHandler):
    """Serve files but never show directory listings."""

    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=ROOT, **kwargs)

    def list_directory(self, path):
        """Block directory listing — redirect to root instead."""
        self.send_response(302)
        self.send_header("Location", "/")
        self.end_headers()
        return None

    def log_message(self, fmt, *args):
        print(f"  {self.address_string()} → {fmt % args}")

os.chdir(ROOT)

with socketserver.TCPServer(("", PORT), NoListingHandler) as httpd:
    url = f"http://localhost:{PORT}"
    print(f"\n🌸 Aya's Mini Games")
    print(f"   Serving at {url}")
    print(f"   Press Ctrl+C to stop\n")
    webbrowser.open(url)
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print("\n   Server stopped.")
