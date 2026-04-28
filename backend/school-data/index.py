import os
import json
import psycopg2
from psycopg2.extras import Json

SCHEMA = "t_p72666246_children_progress_tr"
HEADERS = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Content-Type": "application/json",
}


def get_children(conn):
    cur = conn.cursor()
    cur.execute(
        f"SELECT id, name, parent_login, system, entries FROM {SCHEMA}.children ORDER BY created_at ASC"
    )
    rows = cur.fetchall()
    cur.close()
    return [
        {"id": r[0], "name": r[1], "parentLogin": r[2], "system": r[3], "entries": r[4]}
        for r in rows
    ]


def save_children(conn, children):
    cur = conn.cursor()
    incoming_ids = [c["id"] for c in children if c.get("id")]
    for c in children:
        cid = c.get("id", "").strip()
        name = c.get("name", "").strip()
        parent_login = c.get("parentLogin", "").strip().lower()
        system = int(c.get("system", 1))
        entries = c.get("entries", [])
        if not cid or not name:
            continue
        cur.execute(
            f"""INSERT INTO {SCHEMA}.children (id, name, parent_login, system, entries, updated_at)
                VALUES (%s, %s, %s, %s, %s, NOW())
                ON CONFLICT (id) DO UPDATE
                SET name = EXCLUDED.name,
                    parent_login = EXCLUDED.parent_login,
                    system = EXCLUDED.system,
                    entries = EXCLUDED.entries,
                    updated_at = NOW()""",
            (cid, name, parent_login, system, Json(entries))
        )
    if incoming_ids:
        placeholders = ",".join(["%s"] * len(incoming_ids))
        cur.execute(
            f"DELETE FROM {SCHEMA}.children WHERE id NOT IN ({placeholders})",
            incoming_ids
        )
    else:
        cur.execute(f"DELETE FROM {SCHEMA}.children")
    conn.commit()
    cur.close()


def get_attendance(conn):
    cur = conn.cursor()
    cur.execute(f"SELECT data FROM {SCHEMA}.attendance ORDER BY id DESC LIMIT 1")
    row = cur.fetchone()
    cur.close()
    return row[0] if row else []


def save_attendance(conn, attendance):
    cur = conn.cursor()
    cur.execute(f"SELECT id FROM {SCHEMA}.attendance ORDER BY id DESC LIMIT 1")
    row = cur.fetchone()
    if row:
        cur.execute(
            f"UPDATE {SCHEMA}.attendance SET data = %s, updated_at = NOW() WHERE id = %s",
            (Json(attendance), row[0])
        )
    else:
        cur.execute(f"INSERT INTO {SCHEMA}.attendance (data) VALUES (%s)", (Json(attendance),))
    conn.commit()
    cur.close()


def handler(event: dict, context) -> dict:
    """Единый эндпоинт для данных школы.
    GET  ?type=children           → список детей
    GET  ?type=attendance         → посещаемость
    POST ?type=children    body={children:[...]}
    POST ?type=attendance  body={attendance:[...]}
    POST ?type=all         body={children:[...], attendance:[...]}  — сохранить всё сразу
    """
    if event.get("httpMethod") == "OPTIONS":
        return {"statusCode": 200, "headers": HEADERS, "body": ""}

    method = event.get("httpMethod", "GET")
    params = event.get("queryStringParameters") or {}
    data_type = params.get("type", "children")

    conn = psycopg2.connect(os.environ["DATABASE_URL"])

    if method == "GET":
        if data_type == "attendance":
            result = {"attendance": get_attendance(conn)}
        else:
            result = {"children": get_children(conn)}
        conn.close()
        return {"statusCode": 200, "headers": HEADERS, "body": json.dumps(result)}

    if method == "POST":
        body = json.loads(event.get("body") or "{}")
        if data_type == "all":
            if "children" in body:
                save_children(conn, body["children"])
            if "attendance" in body:
                save_attendance(conn, body["attendance"])
            conn.close()
            return {"statusCode": 200, "headers": HEADERS, "body": json.dumps({"ok": True})}
        if data_type == "attendance":
            save_attendance(conn, body.get("attendance", []))
            conn.close()
            return {"statusCode": 200, "headers": HEADERS, "body": json.dumps({"ok": True})}
        save_children(conn, body.get("children", []))
        conn.close()
        return {"statusCode": 200, "headers": HEADERS, "body": json.dumps({"ok": True})}

    conn.close()
    return {"statusCode": 405, "headers": HEADERS, "body": json.dumps({"error": "method not allowed"})}
