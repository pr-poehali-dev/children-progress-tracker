import os
import json
import psycopg2

SCHEMA = "t_p72666246_children_progress_tr"

HEADERS = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Content-Type": "application/json",
}

def handler(event: dict, context) -> dict:
    """Сохраняет новый комментарий к ребёнку в БД."""
    if event.get("httpMethod") == "OPTIONS":
        return {"statusCode": 200, "headers": HEADERS, "body": ""}

    body = json.loads(event.get("body") or "{}")
    child_id = body.get("child_id", "").strip()
    text = body.get("text", "").strip()

    if not child_id or not text:
        return {"statusCode": 400, "headers": HEADERS, "body": json.dumps({"error": "child_id and text required"})}

    conn = psycopg2.connect(os.environ["DATABASE_URL"])
    cur = conn.cursor()
    cur.execute(
        f"INSERT INTO {SCHEMA}.comments (child_id, text) VALUES (%s, %s) RETURNING id, created_at",
        (child_id, text)
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
