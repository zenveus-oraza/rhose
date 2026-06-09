import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { env } from '../config/env.js';

interface UploadFileInput {
  key: string;
  body: Buffer;
  contentType: string;
}

const credentials = env.AWS_ACCESS_KEY_ID && env.AWS_SECRET_ACCESS_KEY
  ? {
      accessKeyId: env.AWS_ACCESS_KEY_ID,
      secretAccessKey: env.AWS_SECRET_ACCESS_KEY,
    }
  : undefined;

const s3Client = new S3Client({
  region: env.AWS_REGION,
  credentials,
});

function trimSlashes(value: string): string {
  return value.replace(/^\/+|\/+$/g, '');
}

function buildPublicUrl(key: string): string {
  if (env.S3_PUBLIC_BASE_URL) {
    return `${trimSlashes(env.S3_PUBLIC_BASE_URL)}/${key}`;
  }

  return `https://${env.S3_BUCKET_NAME}.s3.${env.AWS_REGION}.amazonaws.com/${key}`;
}

export const storageService = {
  async uploadFile({ key, body, contentType }: UploadFileInput) {
    const normalizedKey = trimSlashes(key);

    await s3Client.send(new PutObjectCommand({
      Bucket: env.S3_BUCKET_NAME,
      Key: normalizedKey,
      Body: body,
      ContentType: contentType,
    }));

    return {
      key: normalizedKey,
      url: buildPublicUrl(normalizedKey),
    };
  },
};
