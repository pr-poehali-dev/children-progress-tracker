"""
Загружает изображения в S3 и возвращает публичные CDN URL.
POST / — body: { images: [ { name: "file.jpg", data: "<base64>" }, ... ] }
"""
import os
import json
import base64
import uuid
import boto3

HEADERS = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Content-Type": "application/json",
}

ALLOWED_TYPES = {"jpg": "image/jpeg", "jpeg": "image/jpeg", "png": "image/png", "gif": "image/gif", "webp": "image/webp"}


def handler(event: dict, context) -> dict:
    if event.get("httpMethod") == "OPTIONS":
        return {"statusCode": 200, "headers": HEADERS, "body": ""}

    body = json.loads(event.get("body") or "{}")
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
        cdn_url = f"https://cdn.poehali.dev/projects/{key_id}/bucket/{key}"
        urls.append(cdn_url)

    return {"statusCode": 200, "headers": HEADERS, "body": json.dumps({"urls": urls})}
