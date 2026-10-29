#!/usr/bin/env python3
"""
EITO TV · Actualizador de contadores de seguidores.

Lo ejecuta GitHub Actions cada 15 minutos (ver .github/workflows/estadisticas.yml).
Consulta solo fuentes oficiales y gratuitas, y escribe un archivo stats.json
que la página lee.

Reglas:
- Nunca inventa cifras ni escribe ceros por errores.
- Si una consulta falla, conserva el último dato válido y lo marca como no actualizado.
- Si una plataforma no tiene sus claves configuradas, simplemente no aparece.

Uso:
    python actualizar_estadisticas.py --previous anterior.json --output stats.json

Solo usa la biblioteca estándar de Python (no hay que instalar nada).
"""
from __future__ import annotations

import argparse
import json
import os
import sys
import urllib.error
import urllib.parse
import urllib.request
from datetime import datetime, timezone

USER_AGENT = "EitoTV-Stats/1.0 (+https://github.com)"
TIMEOUT = 20

# Datos públicos de las plataformas (se pueden cambiar con variables de entorno).
DEFAULTS = {
    "DISCORD_INVITE": "ReUtMYvgrx",
    "YOUTUBE_HANDLE": "@eito_ttv",
    "TWITCH_LOGIN": "eito_ttv",
    "STEAM_ID": "76561199100788703",
}

# Archivo donde se guardan tokens renovados (TikTok / Instagram) para que
# el workflow actualice los secretos del repositorio. Nunca se publica.
ROTATED_TOKENS_FILE = os.environ.get("ROTATED_TOKENS_FILE", "")


class NotConfigured(Exception):
    """La plataforma no tiene sus claves: se omite sin error."""


def env(name: str) -> str:
    return (os.environ.get(name) or DEFAULTS.get(name) or "").strip()


def now_iso() -> str:
    return datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")


def http_json(url: str, *, method: str = "GET", headers: dict | None = None, data: dict | None = None) -> dict:
    body = None
    hdrs = {"User-Agent": USER_AGENT, "Accept": "application/json"}
    if headers:
        hdrs.update(headers)
    if data is not None:
        body = urllib.parse.urlencode(data).encode()
        hdrs.setdefault("Content-Type", "application/x-www-form-urlencoded")
    req = urllib.request.Request(url, data=body, headers=hdrs, method=method)
    try:
        with urllib.request.urlopen(req, timeout=TIMEOUT) as res:
            return json.loads(res.read().decode("utf-8"))
    except urllib.error.HTTPError as e:
        detail = e.read().decode("utf-8", "replace")[:200]
        raise RuntimeError(f"HTTP {e.code}: {detail}") from None
    except urllib.error.URLError as e:
        raise RuntimeError(f"sin conexión: {e.reason}") from None


def as_count(value, *, allow_zero: bool = True) -> int:
    """Convierte a entero y rechaza valores dudosos."""
    if isinstance(value, bool) or value is None:
        raise ValueError("cifra ausente")
    n = int(value)
    if n < 0 or (n == 0 and not allow_zero):
        raise ValueError("cifra no válida")
    return n


def save_rotated_token(name: str, value: str) -> None:
    if not ROTATED_TOKENS_FILE or not value:
        return
    data = {}
    if os.path.exists(ROTATED_TOKENS_FILE):
        with open(ROTATED_TOKENS_FILE, encoding="utf-8") as f:
            data = json.load(f)
    data[name] = value
    with open(ROTATED_TOKENS_FILE, "w", encoding="utf-8") as f:
        json.dump(data, f)


# ---------------------------------------------------------------- Discord
def fetch_discord() -> dict:
    code = env("DISCORD_INVITE")
    if not code:
        raise NotConfigured
    j = http_json(f"https://discord.com/api/v10/invites/{urllib.parse.quote(code)}?with_counts=true")
    stats = {"members": as_count(j.get("approximate_member_count"), allow_zero=False)}
    if j.get("approximate_presence_count") is not None:
        stats["online"] = as_count(j["approximate_presence_count"])
    return stats


# ---------------------------------------------------------------- YouTube
def fetch_youtube() -> dict:
    key = env("YOUTUBE_API_KEY")
    if not key:
        raise NotConfigured
    q = urllib.parse.urlencode({"part": "statistics", "forHandle": env("YOUTUBE_HANDLE"), "key": key})
    j = http_json(f"https://www.googleapis.com/youtube/v3/channels?{q}")
    items = j.get("items") or []
    if not items:
        raise RuntimeError("canal no encontrado")
    s = items[0].get("statistics", {})
    stats = {}
    if not s.get("hiddenSubscriberCount"):
        stats["subscribers"] = as_count(s.get("subscriberCount"))
    if s.get("videoCount") is not None:
        stats["videos"] = as_count(s.get("videoCount"))
    if not stats:
        raise RuntimeError("el canal oculta sus cifras")
    return stats


# ---------------------------------------------------------------- Twitch
def fetch_twitch() -> dict:
    cid, secret = env("TWITCH_CLIENT_ID"), env("TWITCH_CLIENT_SECRET")
    if not cid or not secret:
        raise NotConfigured
    tok = http_json("https://id.twitch.tv/oauth2/token", method="POST",
                    data={"client_id": cid, "client_secret": secret, "grant_type": "client_credentials"})
    headers = {"Client-Id": cid, "Authorization": f"Bearer {tok['access_token']}"}
    users = http_json(f"https://api.twitch.tv/helix/users?login={urllib.parse.quote(env('TWITCH_LOGIN'))}", headers=headers)
    data = users.get("data") or []
    if not data:
        raise RuntimeError("usuario de Twitch no encontrado")
    f = http_json(f"https://api.twitch.tv/helix/channels/followers?broadcaster_id={data[0]['id']}&first=1", headers=headers)
    return {"followers": as_count(f.get("total"))}


# ---------------------------------------------------------------- Steam
def fetch_steam() -> dict:
    key, sid = env("STEAM_API_KEY"), env("STEAM_ID")
    if not key or not sid:
        raise NotConfigured
    base = "https://api.steampowered.com"
    stats = {}
    lvl = http_json(f"{base}/IPlayerService/GetSteamLevel/v1/?key={key}&steamid={sid}")
    level = (lvl.get("response") or {}).get("player_level")
    if level is not None:
        stats["level"] = as_count(level)
    try:
        games = http_json(f"{base}/IPlayerService/GetOwnedGames/v1/?key={key}&steamid={sid}&include_played_free_games=1")
        count = (games.get("response") or {}).get("game_count")
        if count is not None:  # solo existe si la lista de juegos es pública
            stats["games"] = as_count(count)
    except RuntimeError:
        pass
    try:
        fr = http_json(f"{base}/ISteamUser/GetFriendList/v1/?key={key}&steamid={sid}&relationship=friend")
        friends = (fr.get("friendslist") or {}).get("friends")
        if isinstance(friends, list):  # solo existe si la lista de amigos es pública
            stats["friends"] = len(friends)
    except RuntimeError:
        pass
    if not stats:
        raise RuntimeError("el perfil de Steam es privado")
    return stats


# ---------------------------------------------------------------- TikTok (opcional)
def fetch_tiktok() -> dict:
    ck, cs, rt = env("TIKTOK_CLIENT_KEY"), env("TIKTOK_CLIENT_SECRET"), env("TIKTOK_REFRESH_TOKEN")
    if not ck or not cs or not rt:
        raise NotConfigured
    tok = http_json("https://open.tiktokapis.com/v2/oauth/token/", method="POST",
                    data={"client_key": ck, "client_secret": cs, "grant_type": "refresh_token", "refresh_token": rt})
    if "access_token" not in tok:
        raise RuntimeError(tok.get("error_description") or tok.get("error") or "no se pudo renovar el acceso")
    if tok.get("refresh_token") and tok["refresh_token"] != rt:
        save_rotated_token("TIKTOK_REFRESH_TOKEN", tok["refresh_token"])
    j = http_json("https://open.tiktokapis.com/v2/user/info/?fields=follower_count,likes_count",
                  headers={"Authorization": f"Bearer {tok['access_token']}"})
    err = (j.get("error") or {}).get("code")
    if err and err != "ok":
        raise RuntimeError(f"TikTok: {err}")
    user = (j.get("data") or {}).get("user") or {}
    stats = {"followers": as_count(user.get("follower_count"))}
    if user.get("likes_count") is not None:
        stats["likes"] = as_count(user["likes_count"])
    return stats


# ---------------------------------------------------------------- Instagram (opcional)
def fetch_instagram() -> dict:
    token = env("INSTAGRAM_TOKEN")
    if not token:
        raise NotConfigured
    j = http_json("https://graph.instagram.com/me?" + urllib.parse.urlencode(
        {"fields": "username,followers_count,media_count", "access_token": token}))
    stats = {"followers": as_count(j.get("followers_count"))}
    if j.get("media_count") is not None:
        stats["posts"] = as_count(j["media_count"])
    # El token dura 60 días; una vez al día se renueva para que nunca caduque.
    if os.environ.get("REFRESH_TOKENS") != "1":
        return stats
    try:
        r = http_json("https://graph.instagram.com/refresh_access_token?" + urllib.parse.urlencode(
            {"grant_type": "ig_refresh_token", "access_token": token}))
        if r.get("access_token") and r["access_token"] != token:
            save_rotated_token("INSTAGRAM_TOKEN", r["access_token"])
    except RuntimeError as e:
        print(f"  aviso: no se pudo renovar el token de Instagram ({e})", file=sys.stderr)
    return stats


# ---------------------------------------------------------------- Xbox (opcional, OpenXBL)
def fetch_xbox() -> dict:
    key = env("OPENXBL_API_KEY")
    if not key:
        raise NotConfigured
    j = http_json("https://xbl.io/api/v2/account", headers={"X-Authorization": key})
    users = j.get("profileUsers") or []
    if not users:
        raise RuntimeError("perfil de Xbox no encontrado")
    settings = {s.get("id"): s.get("value") for s in users[0].get("settings", [])}
    return {"gamerscore": as_count(settings.get("Gamerscore"))}


FETCHERS = {
    "discord": fetch_discord,
    "youtube": fetch_youtube,
    "twitch": fetch_twitch,
    "steam": fetch_steam,
    "tiktok": fetch_tiktok,
    "instagram": fetch_instagram,
    "xbox": fetch_xbox,
}


def load_previous(path: str | None) -> dict:
    if not path or not os.path.exists(path):
        return {}
    try:
        with open(path, encoding="utf-8") as f:
            data = json.load(f)
        return data.get("platforms", {}) if isinstance(data, dict) else {}
    except (OSError, ValueError):
        return {}


def build(previous: dict, only: list[str] | None = None) -> dict:
    result = {}
    for pid, fetch in FETCHERS.items():
        if only and pid not in only:
            continue
        old = previous.get(pid) or {}
        try:
            stats = fetch()
            result[pid] = {"ok": True, "updatedAt": now_iso(), "stats": stats}
            print(f"✓ {pid}: {stats}")
        except NotConfigured:
            print(f"· {pid}: sin configurar (se omite)")
        except Exception as e:  # noqa: BLE001 - cualquier fallo conserva el dato anterior
            msg = str(e)[:160]
            entry = {"ok": False, "error": msg}
            if old.get("stats") and old.get("updatedAt"):
                entry.update(updatedAt=old["updatedAt"], stats=old["stats"])  # último dato válido
            result[pid] = entry
            print(f"✗ {pid}: {msg}", file=sys.stderr)
    return result


def main() -> int:
    ap = argparse.ArgumentParser(description="Actualiza stats.json de Eito TV")
    ap.add_argument("--previous", help="stats.json anterior (para conservar el último dato válido)")
    ap.add_argument("--output", default="stats.json")
    ap.add_argument("--only", nargs="*", help="limitar a estas plataformas")
    args = ap.parse_args()

    platforms = build(load_previous(args.previous), args.only)
    out = {"version": 1, "generatedAt": now_iso(), "platforms": platforms}
    os.makedirs(os.path.dirname(os.path.abspath(args.output)), exist_ok=True)
    with open(args.output, "w", encoding="utf-8") as f:
        json.dump(out, f, ensure_ascii=False, indent=1)
    ok = sum(1 for p in platforms.values() if p.get("ok"))
    print(f"Listo: {ok} de {len(platforms)} plataformas actualizadas → {args.output}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
