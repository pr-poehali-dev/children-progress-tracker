"""
API для комментариев администратора к детям.
GET  /?child_id=...  — получить комментарии по ребёнку (новые сверху)
POST /               — добавить комментарий { child_id, text }
DELETE /             — удалить комментарий { id }
"""
import json
import os
import psycopg2

HEADERS = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Content-Type": "application/json",
}


def get_conn():
    return psycopg2.connect(os.environ["DATABASE_URL"])


def handler(event: dict, context) -> dict:
    if event.get("httpMethod") == "OPTIONS":
        return {"statusCode": 200, "headers": HEADERS, "body": ""}

    method = event.get("httpMethod", "GET")

    if method == "GET":
        params = event.get("queryStringParameters") or {}
        child_id = params.get("child_id")
        conn = get_conn()
        cur = conn.cursor()
        if child_id:
            cur.execute(
                "SELECT id, child_id, text, created_at FROM t_p72666246_children_progress_tr.comments WHERE child_id = %s ORDER BY created_at DESC",
                (child_id,),
            )
        else:
            cur.execute(
                "SELECT id, child_id, text, created_at FROM t_p72666246_children_progress_tr.comments ORDER BY created_at DESC"
            )
        rows = cur.fetchall()
        conn.close()
        data = [
            {"id": r[0], "child_id": r[1], "text": r[2], "created_at": r[3].isoformat()}
            for r in rows
        ]
        return {"statusCode": 200, "headers": HEADERS, "body": json.dumps(data, ensure_ascii=False)}

    if method == "POST":
        body = json.loads(event.get("body") or "{}")
        child_id = body.get("child_id", "").strip()
        text = body.get("text", "").strip()
        if not child_id or not text:
            return {"statusCode": 400, "headers": HEADERS, "body": json.dumps({"error": "child_id и text обязательны"})}
        conn = get_conn()
        cur = conn.cursor()
        cur.execute(
            "INSERT INTO t_p72666246_children_progress_tr.comments (child_id, text) VALUES (%s, %s) RETURNING id, created_at",
            (child_id, text),
        )
        row = cur.fetchone()
        conn.commit()
        conn.close()
        return {
            "statusCode": 200,
            "headers": HEADERS,
            "body": json.dumps({"id": row[0], "created_at": row[1].isoformat()}, ensure_ascii=False),
        }

    if method == "DELETE":
        body = json.loads(event.get("body") or "{}")
        comment_id = body.get("id")
        if not comment_id:
            return {"statusCode": 400, "headers": HEADERS, "body": json.dumps({"error": "id обязателен"})}
        conn = get_conn()
        cur = conn.cursor()
        cur.execute("DELETE FROM t_p72666246_children_progress_tr.comments WHERE id = %s", (comment_id,))
        conn.commit()
        conn.close()
        return {"statusCode": 200, "headers": HEADERS, "body": json.dumps({"ok": True})}

    return {"statusCode": 405, "headers": HEADERS, "body": json.dumps({"error": "Method not allowed"})}
