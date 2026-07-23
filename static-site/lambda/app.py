import base64
import json
import os
import re
import uuid
from datetime import datetime, timezone

import boto3
import jwt
from botocore.exceptions import ClientError
from boto3.dynamodb.conditions import Key


AWS_REGION = os.environ.get("AWS_REGION", "us-east-1")
COGNITO_USER_POOL_ID = os.environ.get("COGNITO_USER_POOL_ID", "")
COGNITO_CLIENT_ID = os.environ.get("COGNITO_CLIENT_ID", "")
DYNAMODB_TABLE_NAME = os.environ.get("DYNAMODB_TABLE_NAME", "")
S3_BUCKET_NAME = os.environ.get("S3_BUCKET_NAME", "")
KMS_KEY_ARN = os.environ.get("KMS_KEY_ARN", "")
ALLOWED_ORIGIN = os.environ.get("ALLOWED_ORIGIN", "*")


session = boto3.session.Session(region_name=AWS_REGION)
cognito = session.client("cognito-idp")
dynamo = session.resource("dynamodb")
table = dynamo.Table(DYNAMODB_TABLE_NAME)
s3 = session.client("s3")


def cors_headers(extra=None):
    headers = {
        "Access-Control-Allow-Origin": ALLOWED_ORIGIN,
        "Access-Control-Allow-Headers": "Content-Type,Authorization",
        "Access-Control-Allow-Methods": "GET,POST,PUT,DELETE,OPTIONS",
        "Content-Type": "application/json",
    }
    if extra:
        headers.update(extra)
    return headers


def json_response(status_code, body, extra_headers=None):
    return {
        "statusCode": status_code,
        "headers": cors_headers(extra_headers),
        "body": json.dumps(body),
    }


def parse_body(event):
    body = event.get("body")
    if not body:
      return {}

    if event.get("isBase64Encoded"):
        body = base64.b64decode(body).decode("utf-8")

    return json.loads(body)


def get_method(event):
    return (
        event.get("requestContext", {})
        .get("http", {})
        .get("method")
        or event.get("httpMethod")
        or "GET"
    )


def get_path(event):
    return event.get("rawPath") or event.get("path") or "/"


def bearer_token(event):
    headers = event.get("headers") or {}
    auth = headers.get("authorization") or headers.get("Authorization") or ""
    return auth[7:] if auth.startswith("Bearer ") else ""


def user_from_token(event):
    token = bearer_token(event)
    if not token:
        raise Exception("Unauthorized")

    jwks_url = f"https://cognito-idp.{AWS_REGION}.amazonaws.com/{COGNITO_USER_POOL_ID}/.well-known/jwks.json"
    issuer = f"https://cognito-idp.{AWS_REGION}.amazonaws.com/{COGNITO_USER_POOL_ID}"

    response = session._session.get_component("event_emitter")  # keep session alive
    _ = response

    # Fetch and validate JWT using Cognito JWKS from the token header.
    import urllib.request

    with urllib.request.urlopen(jwks_url) as jwks_response:
        jwks = json.loads(jwks_response.read().decode("utf-8"))

    unverified_header = jwt.get_unverified_header(token)
    key_data = next((key for key in jwks["keys"] if key["kid"] == unverified_header["kid"]), None)
    if not key_data:
        raise Exception("Unauthorized")

    public_key = jwt.algorithms.RSAAlgorithm.from_jwk(json.dumps(key_data))
    payload = jwt.decode(token, public_key, algorithms=["RS256"], issuer=issuer, options={"verify_aud": False})

    return {
        "sub": str(payload.get("sub", "")),
        "email": str(payload.get("email") or payload.get("username") or ""),
    }


def safe_file_name(name):
    return re.sub(r"[^a-zA-Z0-9.-]", "_", name or "file")


def upload_key(user_id, file_id, file_name):
    return f"vault/{user_id}/{file_id}-{safe_file_name(file_name)}"


def handler(event, context):
    method = get_method(event)
    path = get_path(event)

    if method == "OPTIONS":
        return {"statusCode": 200, "headers": cors_headers(), "body": ""}

    try:
        if method == "POST" and path == "/vault/upload-url":
            user = user_from_token(event)
            body = parse_body(event)
            file_name = body.get("fileName", "file")
            file_type = body.get("fileType", "application/octet-stream")
            file_id = str(uuid.uuid4())
            key = upload_key(user["sub"], file_id, file_name)

            params = {
                "Bucket": S3_BUCKET_NAME,
                "Key": key,
                "ContentType": file_type,
                "ServerSideEncryption": "aws:kms",
            }
            if KMS_KEY_ARN:
                params["SSEKMSKeyId"] = KMS_KEY_ARN

            url = s3.generate_presigned_url(
                ClientMethod="put_object",
                Params=params,
                ExpiresIn=900,
            )

            return json_response(200, {
                "success": True,
                "message": "Upload URL generated.",
                "url": url,
                "fileId": file_id,
                "s3Key": key,
            })

        if method == "POST" and path == "/vault/photos":
            user = user_from_token(event)
            body = parse_body(event)
            item = {
                "userId": user["sub"],
                "fileId": body["fileId"],
                "fileName": body["fileName"],
                "fileType": body["fileType"],
                "fileSize": int(body["fileSize"]),
                "s3Key": body["s3Key"],
                "uploadedAt": datetime.now(timezone.utc).isoformat(),
            }
            table.put_item(Item=item)
            return json_response(200, {"success": True, "message": "Metadata saved.", "data": {"fileId": item["fileId"]}})

        if method == "GET" and path == "/vault/photos":
            user = user_from_token(event)
            result = table.query(
                KeyConditionExpression=Key("userId").eq(user["sub"]),
            )

            photos = []
            for item in result.get("Items", []):
                download_url = s3.generate_presigned_url(
                    ClientMethod="get_object",
                    Params={"Bucket": S3_BUCKET_NAME, "Key": item["s3Key"]},
                    ExpiresIn=900,
                )
                item["downloadUrl"] = download_url
                photos.append(item)

            photos.sort(key=lambda photo: photo.get("uploadedAt", ""), reverse=True)
            return json_response(200, {"success": True, "message": "Photos loaded.", "photos": photos})

        if method == "DELETE" and path.startswith("/vault/photos/"):
            user = user_from_token(event)
            file_id = path.rsplit("/", 1)[-1]
            result = table.get_item(Key={"userId": user["sub"], "fileId": file_id})
            item = result.get("Item")
            if not item:
                return json_response(404, {"success": False, "message": "Photo not found."})

            s3.delete_object(Bucket=S3_BUCKET_NAME, Key=item["s3Key"])
            table.delete_item(Key={"userId": user["sub"], "fileId": file_id})
            return json_response(200, {"success": True, "message": "Photo deleted."})

        return json_response(404, {"success": False, "message": "Route not found."})

    except ClientError as error:
        return json_response(500, {"success": False, "message": str(error)})
    except Exception as error:
        message = str(error) or "Unhandled error."
        status = 401 if message == "Unauthorized" else 500
        return json_response(status, {"success": False, "message": message})
