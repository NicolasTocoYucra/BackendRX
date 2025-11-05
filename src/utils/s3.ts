import { PutObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";
import { Upload } from "@aws-sdk/lib-storage";
import { s3Client } from "../config/s3";

const BUCKET = process.env.S3_BUCKET!;
const BASE = process.env.S3_PUBLIC_BASE; // opcional

// key sugerida: `${repoId}/${Date.now()}_${sanitize(originalname)}`
export async function uploadBufferPublic(
  key: string,
  buffer: Buffer,
  contentType: string
) {
  // Con Object Ownership "Bucket owner enforced" las ACL están desactivadas.
  // La "publicidad" la da la bucket policy (GetObject abierto), no el ACL.
  const uploader = new Upload({
    client: s3Client,
    params: {
      Bucket: BUCKET,
      Key: key,
      Body: buffer,
      ContentType: contentType
      // ACL: "public-read"  <-- NO es necesario (y puede fallar si ACLs están deshabilitadas)
    },
  });
  const result = await uploader.done();
  return {
    key,
    url: publicUrl(key),
    etag: (result as any).ETag,
  };
}

export function publicUrl(key: string) {
  if (BASE) return `${BASE}/${encodeURI(key)}`;
  const region = process.env.AWS_REGION!;
  return `https://${BUCKET}.s3.${region}.amazonaws.com/${encodeURI(key)}`;
}

export async function removeObject(key: string) {
  await s3Client.send(new DeleteObjectCommand({ Bucket: BUCKET, Key: key }));
}
