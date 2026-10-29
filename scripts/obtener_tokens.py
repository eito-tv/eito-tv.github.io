#!/usr/bin/env python3
"""
EITO TV · Ayuda para obtener los tokens de TikTok e Instagram (solo una vez).

Se ejecuta en tu computadora, no en la página:
    python obtener_tokens.py tiktok
    python obtener_tokens.py instagram

Te pedirá los datos de tu app, te dará un enlace para autorizar TU cuenta
y, al pegar la dirección a la que te redirige, mostrará el token que debes
guardar como secreto en GitHub. No guarda nada en disco.
"""
import json
import sys
import urllib.error
import urllib.parse
import urllib.request
import secrets


def post(url, data):
    req = urllib.request.Request(url, data=urllib.parse.urlencode(data).encode(),
                                 headers={"Content-Type": "application/x-www-form-urlencoded"})
    try:
        with urllib.request.urlopen(req, timeout=30) as r:
            return json.loads(r.read().decode())
    except urllib.error.HTTPError as e:
        sys.exit(f"Error {e.code}: {e.read().decode(errors='replace')[:400]}")


def get(url):
    try:
        with urllib.request.urlopen(url, timeout=30) as r:
            return json.loads(r.read().decode())
    except urllib.error.HTTPError as e:
        sys.exit(f"Error {e.code}: {e.read().decode(errors='replace')[:400]}")


def code_from(redirected):
    q = urllib.parse.parse_qs(urllib.parse.urlparse(redirected.strip()).query)
    if "code" not in q:
        sys.exit("No encontré el parámetro 'code' en esa dirección.")
    return q["code"][0].removesuffix("#_")


def tiktok():
    ck = input("TikTok Client key: ").strip()
    cs = input("TikTok Client secret: ").strip()
    redirect = input("Redirect URI registrada en la app (por ejemplo, tu página): ").strip()
    state = secrets.token_urlsafe(12)
    url = "https://www.tiktok.com/v2/auth/authorize/?" + urllib.parse.urlencode({
        "client_key": ck, "scope": "user.info.basic,user.info.stats", "response_type": "code",
        "redirect_uri": redirect, "state": state})
    print("\n1) Abre este enlace, inicia sesión con tu cuenta y acepta:\n" + url)
    code = code_from(input("\n2) Pega aquí la dirección completa a la que te llevó: "))
    tok = post("https://open.tiktokapis.com/v2/oauth/token/", {
        "client_key": ck, "client_secret": cs, "code": code,
        "grant_type": "authorization_code", "redirect_uri": redirect})
    if "refresh_token" not in tok:
        sys.exit(f"TikTok respondió: {tok}")
    print("\nGuarda estos secretos en GitHub:")
    print("  TIKTOK_CLIENT_KEY    =", ck)
    print("  TIKTOK_CLIENT_SECRET = (el que ya tienes)")
    print("  TIKTOK_REFRESH_TOKEN =", tok["refresh_token"])


def instagram():
    cid = input("Instagram App ID: ").strip()
    cs = input("Instagram App secret: ").strip()
    redirect = input("Redirect URI registrada en la app: ").strip()
    url = "https://www.instagram.com/oauth/authorize?" + urllib.parse.urlencode({
        "client_id": cid, "redirect_uri": redirect, "response_type": "code",
        "scope": "instagram_business_basic"})
    print("\n1) Abre este enlace, inicia sesión con tu cuenta profesional y acepta:\n" + url)
    code = code_from(input("\n2) Pega aquí la dirección completa a la que te llevó: "))
    short = post("https://api.instagram.com/oauth/access_token", {
        "client_id": cid, "client_secret": cs, "grant_type": "authorization_code",
        "redirect_uri": redirect, "code": code})
    if "access_token" not in short:
        sys.exit(f"Instagram respondió: {short}")
    long_lived = get("https://graph.instagram.com/access_token?" + urllib.parse.urlencode({
        "grant_type": "ig_exchange_token", "client_secret": cs, "access_token": short["access_token"]}))
    print("\nGuarda este secreto en GitHub (dura 60 días y el actualizador lo renueva solo):")
    print("  INSTAGRAM_TOKEN =", long_lived.get("access_token"))


if __name__ == "__main__":
    opts = {"tiktok": tiktok, "instagram": instagram}
    if len(sys.argv) != 2 or sys.argv[1] not in opts:
        sys.exit("Uso: python obtener_tokens.py tiktok | instagram")
    opts[sys.argv[1]]()
