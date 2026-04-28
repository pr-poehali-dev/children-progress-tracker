import os
import json
import psycopg2

SCHEMA = "t_p72666246_children_progress_tr"

HEADERS = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, PUT, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Content-Type": "application/json",
}

def handler(event: dict, context) -> dict:
    """Создаёт (POST) или обновляет (PUT) комментарий. author: 'admin' | 'parent'."""
    if event.get("httpMethod") == "OPTIONS":
        return {"statusCode": 200, "headers": HEADERS, "body": ""}

    body = json.loads(event.get("body") or "{}")
    method = event.get("httpMethod", "POST")

    if method == "PUT":
        comment_id = body.get("id")
        text = body.get("text", "").strip()
        if not comment_id or not text:
            return {"statusCode": 400, "headers": HEADERS, "body": json.dumps({"error": "id and text required"})}
        conn = psycopg2.connect(os.environ["DATABASE_URL"])
        cur = conn.cursor()
        cur.execute(
            f"UPDATE {SCHEMA}.comments SET text = %s WHERE id = %s",
            (text, comment_id)
        )
        conn.commit()
        cur.close()
        conn.close()
        return {"statusCode": 200, "headers": HEADERS, "body": json.dumps({"ok": True})}

    # POST — создать
    child_id = body.get("child_id", "").strip()
    text = body.get("text", "").strip()
    author = body.get("author", "admin").strip()
    if author not in ("admin", "parent"):
        author = "admin"
    if not child_id or not text:
        return {"statusCode": 400, "headers": HEADERS, "body": json.dumps({"error": "child_id and text required"})}
    conn = psycopg2.connect(os.environ["DATABASE_URL"])
    cur = conn.cursor()
    cur.execute(
        f"INSERT INTO {SCHEMA}.comments (child_id, text, author) VALUES (%s, %s, %s) RETURNING id, created_at",
        (child_id, text, author)
    )
    row = cur.fetchone()
    conn.commit()
    cur.close()
    conn.close()
    return {
        "statusCode": 200,
        "headers": HEADERS,
        "body": json.dumps({"id": row[0], "created_at": row[1].isoformat()})
    }