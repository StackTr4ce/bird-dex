# BirdDex Supabase Deployment Guide

This guide walks you through deploying your BirdDex React application as a Single Page Application (SPA) using Supabase Storage.

## Prerequisites

1. **Supabase Project**: Make sure your Supabase project is set up and running
2. **Environment Variables**: Your `.env.local` should contain:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`

## Step 1: Set Up Storage Bucket

1. Open your Supabase dashboard
2. Go to **SQL Editor**
3. Run the SQL script from `supabase-storage-hosting-setup.sql`

## Step 2: Get Service Key

1. In Supabase Dashboard, go to **Settings** > **API**
2. Copy the `service_role` key (⚠️ Keep this secret!)
3. Add it to your environment:

```bash
# Windows PowerShell
$env:SUPABASE_SERVICE_KEY="your_service_key_here"

# Windows Command Prompt  
set SUPABASE_SERVICE_KEY=your_service_key_here

# Linux/Mac
export SUPABASE_SERVICE_KEY=your_service_key_here
```

## Step 3: Build and Deploy

```bash
# Build the application
npm run build

# Deploy to Supabase
npm run deploy:supabase

# Or do both in one command
npm run build:production
```

## Step 4: Verify Deployment

```bash
# Check deployment status
npm run deploy:check
```

## Step 5: Access Your Application

Your app will be available at:
```
https://[your-project-id].supabase.co/storage/v1/object/public/birddex-app/index.html
```

## Troubleshooting

### Common Issues

1. **403 Forbidden Error**
   - Check RLS policies are set up correctly
   - Verify bucket is public
   - Ensure service key has proper permissions

2. **404 Not Found Error**
   - Verify files were uploaded successfully
   - Check bucket name is correct
   - Run `npm run deploy:check`

3. **SPA Routing Issues**
   - Direct navigation to routes might show 404
   - This is expected with basic storage hosting
   - Consider using Supabase Edge Functions for full SPA support

### Advanced: Custom Domain

1. Set up a custom domain in Supabase Dashboard
2. Update your DNS settings
3. Your app will be available at your custom domain

### Advanced: Edge Functions for SPA Routing

For full SPA routing support (handling direct navigation to routes), you can set up Supabase Edge Functions:

1. Create an Edge Function that serves your static files
2. Implement fallback to `index.html` for client-side routing
3. Deploy the Edge Function alongside your static files

## Environment Variables Summary

Required for deployment:
- `VITE_SUPABASE_URL` - Your Supabase project URL
- `VITE_SUPABASE_ANON_KEY` - Your Supabase anon key  
- `SUPABASE_SERVICE_KEY` - Your Supabase service key (for deployment only)

## Security Notes

- ⚠️ **Never commit service keys to version control**
- 🔒 Service key should only be used for deployment
- 🌐 Only the anon key should be in your built application
- 📝 Consider using CI/CD environment variables for production

## Next Steps

After successful deployment:
1. Test all application features
2. Verify authentication works correctly
3. Check that all API calls function properly
4. Test on different devices and browsers
5. Consider setting up monitoring and analytics
