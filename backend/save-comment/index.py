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
    """Создаёт (POST) или обновляет (PUT) комментарий.
    child_id '__school__' — общий для всей школы.
    author: 'admin' | 'parent'. image_urls: список URL картинок.
    """
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
    child_id = body.get("child_id", "__school__").strip() or "__school__"
    text = body.get("text", "").strip()
    author = body.get("author", "admin").strip()
    image_urls = body.get("image_urls", [])
    if author not in ("admin", "parent"):
        author = "admin"
    if not isinstance(image_urls, list):
        image_urls = []

    conn = psycopg2.connect(os.environ["DATABASE_URL"])
    cur = conn.cursor()
    cur.execute(
        f"INSERT INTO {SCHEMA}.comments (child_id, text, author, image_urls) VALUES (%s, %s, %s, %s) RETURNING id, created_at",
        (child_id, text, author, image_urls)
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
