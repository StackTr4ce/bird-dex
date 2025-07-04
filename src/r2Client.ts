import { S3Client } from '@aws-sdk/client-s3';

const bucket = import.meta.env.VITE_R2_BUCKET;
const endpoint = import.meta.env.VITE_R2_ENDPOINT;
const accessKeyId = import.meta.env.VITE_R2_ACCESS_KEY_ID;
const secretAccessKey = import.meta.env.VITE_R2_SECRET_ACCESS_KEY;

export const r2 = new S3Client({
  region: 'auto',
  endpoint,
  credentials: {
    accessKeyId,
    secretAccessKey,
  },
  forcePathStyle: true,
});

export const r2Bucket = bucket;
