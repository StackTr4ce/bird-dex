# Cloudflare R2 Setup for BirdDex

Follow these steps to set up Cloudflare R2 for storing user-uploaded photos.

## 1. Create an R2 Bucket
- Log in to your Cloudflare dashboard.
- Go to R2 > Create Bucket.
- Name your bucket (e.g., `birddex-photos`).

## 2. Create an API Token
- Go to My Profile > API Tokens > Create Token.
- Use the "Edit Cloudflare R2 Storage" template.
- Grant permissions to the new bucket.
- Save the Access Key ID and Secret Access Key.

## 3. Configure CORS (if needed)
- In the R2 bucket settings, add CORS rules to allow your frontend domain.

## 4. Example Upload Command (using AWS CLI)
```sh
aws s3 cp <file> s3://birddex-photos/<path> --endpoint-url=https://<accountid>.r2.cloudflarestorage.com
```

## 5. Environment Variables
- Store your R2 credentials and bucket info in your project environment (e.g., `.env.local`):
  ```env
  VITE_R2_BUCKET=birddex-photos
  VITE_R2_ENDPOINT=https://<accountid>.r2.cloudflarestorage.com
  VITE_R2_ACCESS_KEY_ID=...
  VITE_R2_SECRET_ACCESS_KEY=...
  ```

---

**Perform these steps in the Cloudflare dashboard and your local environment.**
