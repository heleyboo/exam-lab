import { GetObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

/**
 * Lưu file đề gốc, ảnh trang, hình đã cắt và ảnh bài làm của học sinh.
 * MinIO khi chạy máy dev, Cloudflare R2 khi lên production - cùng giao thức S3
 * nên code không đổi, chỉ đổi biến môi trường.
 */
function required(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Thiếu biến môi trường ${name}. Xem .env.example.`);
  return value;
}

let client: S3Client | null = null;

function s3(): S3Client {
  client ??= new S3Client({
    region: process.env.S3_REGION ?? "auto",
    endpoint: required("S3_ENDPOINT"),
    // MinIO không hỗ trợ kiểu địa chỉ virtual-host nên phải bật path style.
    forcePathStyle: true,
    credentials: {
      accessKeyId: required("S3_ACCESS_KEY"),
      secretAccessKey: required("S3_SECRET_KEY"),
    },
  });
  return client;
}

function bucket(): string {
  return required("S3_BUCKET");
}

export async function putObject(
  key: string,
  body: Buffer | Uint8Array | string,
  contentType: string,
): Promise<void> {
  await s3().send(
    new PutObjectCommand({ Bucket: bucket(), Key: key, Body: body, ContentType: contentType }),
  );
}

/**
 * Đường dẫn ký hạn ngắn.
 * Ảnh bài làm của học sinh là dữ liệu cá nhân nên không để bucket công khai.
 */
export async function getSignedReadUrl(key: string, expiresInSeconds = 300): Promise<string> {
  return getSignedUrl(s3(), new GetObjectCommand({ Bucket: bucket(), Key: key }), {
    expiresIn: expiresInSeconds,
  });
}
