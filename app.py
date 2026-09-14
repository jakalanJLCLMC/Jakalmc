import json
import os
import uuid
from datetime import datetime

from flask import Flask, render_template, request, redirect, url_for, session

app = Flask(__name__)

# Ganti nilai default ini (atau, lebih aman, set sebagai Environment
# Variable di dashboard Render: SECRET_KEY, ADMIN_USERNAME, ADMIN_PASSWORD).
app.secret_key = os.environ.get("SECRET_KEY", "ganti-secret-key-ini-sebelum-deploy")
ADMIN_USERNAME = os.environ.get("ADMIN_USERNAME", "admin")
ADMIN_PASSWORD = os.environ.get("ADMIN_PASSWORD", "admin123")

DATA_FILE = os.path.join(os.path.dirname(os.path.abspath(__file__)), "data.json")


def load_links():
    """Baca semua link dari data.json. Kalau file belum ada / rusak, kembalikan list kosong."""
    if not os.path.exists(DATA_FILE):
        return []
    try:
        with open(DATA_FILE, "r", encoding="utf-8") as f:
            return json.load(f)
    except (json.JSONDecodeError, OSError):
        return []


def save_links(links):
    with open(DATA_FILE, "w", encoding="utf-8") as f:
        json.dump(links, f, indent=2, ensure_ascii=False)


def is_admin():
    return bool(session.get("is_admin"))


@app.route("/")
def index():
    links = sorted(load_links(), key=lambda x: x.get("added_at", ""), reverse=True)
    return render_template("index.html", links=links, is_admin=is_admin(), login_error=None)


@app.route("/login", methods=["POST"])
def login():
    username = request.form.get("username", "").strip()
    password = request.form.get("password", "")

    if username == ADMIN_USERNAME and password == ADMIN_PASSWORD:
        session["is_admin"] = True
        return redirect(url_for("index"))

    links = sorted(load_links(), key=lambda x: x.get("added_at", ""), reverse=True)
    return render_template(
        "index.html", links=links, is_admin=False, login_error="Username atau password salah."
    )


@app.route("/logout", methods=["POST"])
def logout():
    session.pop("is_admin", None)
    return redirect(url_for("index"))


@app.route("/add", methods=["POST"])
def add_link():
    if not is_admin():
        return redirect(url_for("index"))

    name = request.form.get("name", "").strip()
    category = request.form.get("category", "").strip()
    link = request.form.get("link", "").strip()

    if name and category and link:
        links = load_links()
        links.append(
            {
                "id": uuid.uuid4().hex[:10],
                "name": name,
                "category": category,
                "link": link,
                "added_at": datetime.utcnow().isoformat(),
            }
        )
        save_links(links)

    return redirect(url_for("index"))


@app.route("/delete/<link_id>", methods=["POST"])
def delete_link(link_id):
    if not is_admin():
        return redirect(url_for("index"))

    links = [item for item in load_links() if item.get("id") != link_id]
    save_links(links)
    return redirect(url_for("index"))


if __name__ == "__main__":
    # Untuk development lokal saja — di Render, gunicorn yang menjalankan app-nya (lihat Procfile).
    app.run(debug=True)
