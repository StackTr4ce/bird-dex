import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

// Load environment variables from .env file
dotenv.config()

const supabaseUrl = process.env.VITE_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing environment variables')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function checkDeployment() {
  console.log('🔍 Checking deployment status...')
  
  try {
    // Check if bucket exists
    const { data: buckets, error: bucketError } = await supabase.storage.listBuckets()
    if (bucketError) throw bucketError
    
    const bucket = buckets.find(b => b.name === 'birddex-app')
    if (!bucket) {
      console.log('❌ Storage bucket "birddex-app" not found')
      console.log('💡 Run "npm run deploy:supabase" to deploy your app')
      return
    }
    
    console.log('✅ Storage bucket exists')
    
    // Check if index.html exists
    const { data: files, error: listError } = await supabase.storage
      .from('birddex-app')
      .list('', { limit: 10 })
    
    if (listError) throw listError
    
    const hasIndex = files.some(file => file.name === 'index.html')
    if (!hasIndex) {
      console.log('❌ index.html not found in storage')
      console.log('💡 Run "npm run deploy:supabase" to deploy your app')
      return
    }
    
    console.log('✅ Application files found')
    
    // Get public URL
    const { data: urlData } = supabase.storage
      .from('birddex-app')
      .getPublicUrl('index.html')
    
    console.log('\n🌐 Your BirdDex app is deployed at:')
    console.log(`   ${urlData.publicUrl}`)
    
    // Test if the URL is accessible
    console.log('\n🧪 Testing accessibility...')
    try {
      const response = await fetch(urlData.publicUrl)
      if (response.ok) {
        console.log('✅ Application is accessible')
      } else {
        console.log(`❌ Application returned status: ${response.status}`)
        console.log('💡 Check your RLS policies and bucket configuration')
      }
    } catch (fetchError) {
      console.log('❌ Unable to access application')
      console.log('💡 Check your internet connection and Supabase configuration')
    }
    
  } catch (error) {
    console.error('❌ Error checking deployment:', error.message)
  }
}

checkDeployment()
