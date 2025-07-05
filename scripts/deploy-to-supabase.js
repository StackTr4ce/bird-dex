import { createClient } from '@supabase/supabase-js'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// Environment variables
const supabaseUrl = process.env.VITE_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing required environment variables:')
  console.error('   VITE_SUPABASE_URL:', supabaseUrl ? '✓' : '❌')
  console.error('   SUPABASE_SERVICE_KEY:', supabaseKey ? '✓' : '❌')
  console.error('\nPlease set these environment variables before deploying.')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

// MIME type mapping
function getContentType(filePath) {
  const ext = path.extname(filePath).toLowerCase()
  const types = {
    '.html': 'text/html; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.js': 'application/javascript; charset=utf-8',
    '.json': 'application/json; charset=utf-8',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.svg': 'image/svg+xml',
    '.ico': 'image/x-icon',
    '.woff': 'font/woff',
    '.woff2': 'font/woff2',
    '.ttf': 'font/ttf',
    '.otf': 'font/otf'
  }
  return types[ext] || 'application/octet-stream'
}

// Upload a single file
async function uploadFile(filePath, bucketPath) {
  try {
    const fileBuffer = fs.readFileSync(filePath)
    const contentType = getContentType(filePath)
    
    console.log(`📤 Uploading: ${bucketPath} (${(fileBuffer.length / 1024).toFixed(1)}KB)`)
    
    const { data, error } = await supabase.storage
      .from('birddex-app')
      .upload(bucketPath, fileBuffer, {
        contentType,
        upsert: true,
        cacheControl: filePath.includes('/assets/') ? '31536000' : '3600' // 1 year for assets, 1 hour for HTML
      })
    
    if (error) {
      console.error(`❌ Error uploading ${bucketPath}:`, error.message)
      throw error
    }
    
    return data
  } catch (error) {
    console.error(`❌ Failed to upload ${bucketPath}:`, error.message)
    throw error
  }
}

// Recursively upload directory
async function uploadDirectory(dirPath, bucketPrefix = '') {
  const files = fs.readdirSync(dirPath)
  
  for (const file of files) {
    const filePath = path.join(dirPath, file)
    const stat = fs.statSync(filePath)
    
    if (stat.isDirectory()) {
      await uploadDirectory(filePath, `${bucketPrefix}${file}/`)
    } else {
      const bucketPath = `${bucketPrefix}${file}`
      await uploadFile(filePath, bucketPath)
    }
  }
}

// Create storage bucket if it doesn't exist
async function ensureBucketExists() {
  console.log('🔍 Checking if storage bucket exists...')
  
  const { data: buckets, error: listError } = await supabase.storage.listBuckets()
  
  if (listError) {
    console.error('❌ Error listing buckets:', listError.message)
    throw listError
  }
  
  const bucketExists = buckets.some(bucket => bucket.name === 'birddex-app')
  
  if (!bucketExists) {
    console.log('📦 Creating storage bucket...')
    const { error: createError } = await supabase.storage.createBucket('birddex-app', {
      public: true,
      allowedMimeTypes: [
        'text/html',
        'text/css',
        'application/javascript',
        'application/json',
        'image/*',
        'font/*'
      ]
    })
    
    if (createError) {
      console.error('❌ Error creating bucket:', createError.message)
      throw createError
    }
    
    console.log('✅ Storage bucket created successfully!')
  } else {
    console.log('✅ Storage bucket already exists')
  }
}

// Main deployment function
async function deployToSupabase() {
  console.log('🚀 Starting BirdDex deployment to Supabase...')
  
  const distPath = path.join(__dirname, '../dist')
  
  // Check if dist folder exists
  if (!fs.existsSync(distPath)) {
    console.error('❌ dist folder not found. Please run "npm run build" first.')
    process.exit(1)
  }
  
  try {
    // Ensure bucket exists
    await ensureBucketExists()
    
    // Upload all files
    console.log('📁 Uploading files from dist folder...')
    await uploadDirectory(distPath)
    
    // Get the public URL
    const { data: urlData } = supabase.storage
      .from('birddex-app')
      .getPublicUrl('index.html')
    
    console.log('\n🎉 Deployment completed successfully!')
    console.log('🌐 Your app is now available at:')
    console.log(`   ${urlData.publicUrl}`)
    console.log('\n📝 Next steps:')
    console.log('   1. Set up RLS policies for public access (if not done already)')
    console.log('   2. Configure custom domain (optional)')
    console.log('   3. Test your application thoroughly')
    
  } catch (error) {
    console.error('❌ Deployment failed:', error.message)
    process.exit(1)
  }
}

// Run deployment
deployToSupabase()
