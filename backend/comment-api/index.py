import os
import json
import base64
import uuid
import psycopg2
import boto3

SCHEMA = "t_p72666246_children_progress_tr"
HEADERS = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Content-Type": "application/json",
}
ALLOWED_TYPES = {"jpg": "image/jpeg", "jpeg": "image/jpeg", "png": "image/png", "gif": "image/gif", "webp": "image/webp"}


def get_conn():
    return psycopg2.connect(os.environ["DATABASE_URL"])


def handle_get(params: dict) -> dict:
    """GET ?child_id=... — комментарии ребёнка + общие школьные."""
    child_id = params.get("child_id", "")
    if not child_id:
        return {"statusCode": 400, "headers": HEADERS, "body": json.dumps({"error": "child_id required"})}

    conn = get_conn()
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
        {"id": r[0], "child_id": r[1], "text": r[2], "created_at": r[3].isoformat(), "author": r[4], "image_urls": r[5] if r[5] else []}
        for r in rows
    ]
    return {"statusCode": 200, "headers": HEADERS, "body": json.dumps({"comments": comments})}


def handle_post(body: dict) -> dict:
    """POST — создать комментарий. { child_id, text, author, image_urls }"""
    child_id = body.get("child_id", "__school__").strip() or "__school__"
    text = body.get("text", "").strip()
    author = body.get("author", "admin").strip()
    image_urls = body.get("image_urls", [])
    if author not in ("admin", "parent"):
        author = "admin"
    if not isinstance(image_urls, list):
        image_urls = []

    conn = get_conn()
    cur = conn.cursor()
    cur.execute(
        f"INSERT INTO {SCHEMA}.comments (child_id, text, author, image_urls) VALUES (%s, %s, %s, %s) RETURNING id, created_at",
        (child_id, text, author, image_urls)
    )
    row = cur.fetchone()
    conn.commit()
    cur.close()
    conn.close()
    return {"statusCode": 200, "headers": HEADERS, "body": json.dumps({"id": row[0], "created_at": row[1].isoformat()})}


def handle_put(body: dict) -> dict:
    """PUT — обновить текст комментария. { id, text }"""
    comment_id = body.get("id")
    text = body.get("text", "").strip()
    if not comment_id or not text:
        return {"statusCode": 400, "headers": HEADERS, "body": json.dumps({"error": "id and text required"})}

    conn = get_conn()
    cur = conn.cursor()
    cur.execute(f"UPDATE {SCHEMA}.comments SET text = %s WHERE id = %s", (text, comment_id))
    conn.commit()
    cur.close()
    conn.close()
    return {"statusCode": 200, "headers": HEADERS, "body": json.dumps({"ok": True})}


def handle_delete(body: dict) -> dict:
    """DELETE — удалить комментарий. { id }"""
    comment_id = body.get("id")
    if not comment_id:
        return {"statusCode": 400, "headers": HEADERS, "body": json.dumps({"error": "id required"})}

    conn = get_conn()
    cur = conn.cursor()
    cur.execute(f"DELETE FROM {SCHEMA}.comments WHERE id = %s", (comment_id,))
    conn.commit()
    cur.close()
    conn.close()
    return {"statusCode": 200, "headers": HEADERS, "body": json.dumps({"ok": True})}


def handle_upload(body: dict) -> dict:
    """POST ?action=upload — загрузить изображения. { images: [{name, data}] }"""
    images = body.get("images", [])
    if not images or not isinstance(images, list):
        return {"statusCode": 400, "headers": HEADERS, "body": json.dumps({"error": "images array required"})}

    s3 = boto3.client(
        "s3",
        endpoint_url="https://bucket.poehali.dev",
        aws_access_key_id=os.environ["AWS_ACCESS_KEY_ID"],
        aws_secret_access_key=os.environ["AWS_SECRET_ACCESS_KEY"],
    )
    key_id = os.environ["AWS_ACCESS_KEY_ID"]
    urls = []

    for img in images[:10]:
        name = img.get("name", "image.jpg")
        data_b64 = img.get("data", "")
        ext = name.rsplit(".", 1)[-1].lower() if "." in name else "jpg"
        content_type = ALLOWED_TYPES.get(ext, "image/jpeg")
        file_data = base64.b64decode(data_b64)
        key = f"comments/{uuid.uuid4().hex}.{ext}"
        s3.put_object(Bucket="files", Key=key, Body=file_data, ContentType=content_type)
        urls.append(f"https://cdn.poehali.dev/projects/{key_id}/bucket/{key}")

    return {"statusCode": 200, "headers": HEADERS, "body": json.dumps({"urls": urls})}


def handler(event: dict, context) -> dict:
    """Единый API для комментариев и загрузки изображений.
    GET  ?child_id=...         — получить комментарии
    POST                       — создать комментарий
    PUT                        — обновить комментарий
    DELETE                     — удалить комментарий
    POST ?action=upload        — загрузить изображения
    """
    if event.get("httpMethod") == "OPTIONS":
        return {"statusCode": 200, "headers": HEADERS, "body": ""}

    method = event.get("httpMethod", "GET")
    params = event.get("queryStringParameters") or {}
    body = json.loads(event.get("body") or "{}")

    if method == "GET":
        return handle_get(params)
    if method == "POST" and params.get("action") == "upload":
        return handle_upload(body)
    if method == "POST":
        return handle_post(body)
    if method == "PUT":
        return handle_put(body)
    if method == "DELETE":
        return handle_delete(body)

    return {"statusCode": 405, "headers": HEADERS, "body": json.dumps({"error": "method not allowed"})}
