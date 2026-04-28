import os
import json
import psycopg2

SCHEMA = "t_p72666246_children_progress_tr"

HEADERS = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Content-Type": "application/json",
}

def handler(event: dict, context) -> dict:
    """Возвращает комментарии для child_id + общие школьные (__school__), новые сверху.
    Если child_id == '__school__' — только школьные."""
    if event.get("httpMethod") == "OPTIONS":
        return {"statusCode": 200, "headers": HEADERS, "body": ""}

    child_id = (event.get("queryStringParameters") or {}).get("child_id", "")
    if not child_id:
        return {"statusCode": 400, "headers": HEADERS, "body": json.dumps({"error": "child_id required"})}

    conn = psycopg2.connect(os.environ["DATABASE_URL"])
    cur = conn.cursor()

    if child_id == "__school__":
        cur.execute(
            f"SELECT id, child_id, text, created_at, author, image_urls FROM {SCHEMA}.comments WHERE child_id = '__school__' ORDER BY created_at DESC"
        )
    else:
        cur.execute(
            f"SELECT id, child_id, text, created_at, author, image_urls FROM {SCHEMA}.comments WHERE child_id = %s OR child_id = '__school__' ORDER BY created_at DESC",
            (child_id,)
        )

    rows = cur.fetchall()
    cur.close()
    conn.close()

    comments = [
        {
            "id": r[0],
            "child_id": r[1],
            "text": r[2],
            "created_at": r[3].isoformat(),
            "author": r[4],
            "image_urls": r[5] if r[5] else [],
        }
        for r in rows
    ]
    return {"statusCode": 200, "headers": HEADERS, "body": json.dumps({"comments": comments})}
