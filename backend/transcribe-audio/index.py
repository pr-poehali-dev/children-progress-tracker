import os
import json
import base64
import tempfile
import urllib.request
import urllib.parse

def handler(event: dict, context) -> dict:
    """Транскрибирует голосовое сообщение в текст через OpenAI Whisper."""
    if event.get("httpMethod") == "OPTIONS":
        return {"statusCode": 200, "headers": {"Access-Control-Allow-Origin": "*", "Access-Control-Allow-Methods": "POST, OPTIONS", "Access-Control-Allow-Headers": "Content-Type", "Access-Control-Max-Age": "86400"}, "body": ""}

    body = json.loads(event.get("body") or "{}")
    audio_b64 = body.get("audio")
    audio_format = body.get("format", "webm")

    if not audio_b64:
        return {"statusCode": 400, "headers": {"Access-Control-Allow-Origin": "*"}, "body": json.dumps({"error": "audio required"})}

    api_key = os.environ.get("OPENAI_API_KEY", "")
    if not api_key:
        return {"statusCode": 500, "headers": {"Access-Control-Allow-Origin": "*"}, "body": json.dumps({"error": "OPENAI_API_KEY not configured"})}

    audio_bytes = base64.b64decode(audio_b64)

    with tempfile.NamedTemporaryFile(suffix=f".{audio_format}", delete=False) as tmp:
        tmp.write(audio_bytes)
        tmp_path = tmp.name

    boundary = "----FormBoundary7MA4YWxkTrZu0gW"
    filename = f"audio.{audio_format}"
    content_type_map = {"webm": "audio/webm", "mp4": "audio/mp4", "wav": "audio/wav", "ogg": "audio/ogg", "m4a": "audio/m4a"}
    file_content_type = content_type_map.get(audio_format, "audio/webm")

    body_parts = []
    body_parts.append(f"--{boundary}\r\nContent-Disposition: form-data; name=\"model\"\r\n\r\nwhisper-1".encode())
    body_parts.append(f"--{boundary}\r\nContent-Disposition: form-data; name=\"language\"\r\n\r\nru".encode())
    body_parts.append(f"--{boundary}\r\nContent-Disposition: form-data; name=\"file\"; filename=\"{filename}\"\r\nContent-Type: {file_content_type}\r\n\r\n".encode() + audio_bytes)
    body_parts.append(f"--{boundary}--".encode())
    request_body = b"\r\n".join(body_parts)

    req = urllib.request.Request(
        "https://api.openai.com/v1/audio/transcriptions",
        data=request_body,
        headers={
            "Authorization": f"Bearer {api_key}",
            "Content-Type": f"multipart/form-data; boundary={boundary}",
        },
        method="POST"
    )

    with urllib.request.urlopen(req) as resp:
        result = json.loads(resp.read().decode())

    text = result.get("text", "").strip()
    return {"statusCode": 200, "headers": {"Access-Control-Allow-Origin": "*"}, "body": json.dumps({"text": text})}
