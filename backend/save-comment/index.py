import os
import json
import psycopg2

SCHEMA = os.environ.get("MAIN_DB_SCHEMA", "public")

def handler(event: dict, context) -> dict:
    """Сохраняет новый комментарий к ребёнку в БД."""
    if event.get("httpMethod") == "OPTIONS":
        return {"statusCode": 200, "headers": {"Access-Control-Allow-Origin": "*", "Access-Control-Allow-Methods": "POST, OPTIONS", "Access-Control-Allow-Headers": "Content-Type", "Access-Control-Max-Age": "86400"}, "body": ""}

    body = json.loads(event.get("body") or "{}")
    child_id = body.get("child_id", "").strip()
    text = body.get("text", "").strip()

    if not child_id or not text:
        return {"statusCode": 400, "headers": {"Access-Control-Allow-Origin": "*"}, "body": json.dumps({"error": "child_id and text required"})}

    safe_child_id = child_id.replace("'", "''")
    safe_text = text.replace("'", "''")

    conn = psycopg2.connect(os.environ["DATABASE_URL"])
    cur = conn.cursor()
    cur.execute(
        f"INSERT INTO {SCHEMA}.comments (child_id, text) VALUES ('{safe_child_id}', '{safe_text}') RETURNING id, created_at"
    )
    row = cur.fetchone()
    conn.commit()
    cur.close()
    conn.close()

    return {
        "statusCode": 200,
        "headers": {"Access-Control-Allow-Origin": "*"},
        "body": json.dumps({"id": row[0], "created_at": row[1].isoformat()})
    }
