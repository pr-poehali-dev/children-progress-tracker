import os
import json
import psycopg2

SCHEMA = os.environ.get("MAIN_DB_SCHEMA", "public")

def handler(event: dict, context) -> dict:
    """Возвращает список комментариев для указанного ребёнка (child_id)."""
    if event.get("httpMethod") == "OPTIONS":
        return {"statusCode": 200, "headers": {"Access-Control-Allow-Origin": "*", "Access-Control-Allow-Methods": "GET, OPTIONS", "Access-Control-Allow-Headers": "Content-Type", "Access-Control-Max-Age": "86400"}, "body": ""}

    child_id = (event.get("queryStringParameters") or {}).get("child_id", "")
    if not child_id:
        return {"statusCode": 400, "headers": {"Access-Control-Allow-Origin": "*"}, "body": json.dumps({"error": "child_id required"})}

    conn = psycopg2.connect(os.environ["DATABASE_URL"])
    cur = conn.cursor()
    cur.execute(
        f"SELECT id, child_id, text, created_at FROM {SCHEMA}.comments WHERE child_id = '{child_id}' ORDER BY created_at DESC"
    )
    rows = cur.fetchall()
    cur.close()
    conn.close()

    comments = [
        {"id": r[0], "child_id": r[1], "text": r[2], "created_at": r[3].isoformat()}
        for r in rows
    ]
    return {"statusCode": 200, "headers": {"Access-Control-Allow-Origin": "*"}, "body": json.dumps({"comments": comments})}
