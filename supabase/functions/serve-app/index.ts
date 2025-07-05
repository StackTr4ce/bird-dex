import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const url = new URL(req.url)
    let path = url.pathname.replace('/serve-app/', '') || 'index.html'
    
    // SPA routing: if path doesn't exist and doesn't have an extension, serve index.html
    if (!path.includes('.') && path !== 'index.html') {
      path = 'index.html'
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    const { data, error } = await supabase.storage
      .from('birddex-app')
      .download(path)

    if (error) {
      console.error('Storage error:', error)
      // If file not found and no extension, try index.html for SPA routing
      if (error.message.includes('not found') && !path.includes('.')) {
        const { data: indexData, error: indexError } = await supabase.storage
          .from('birddex-app')
          .download('index.html')
        
        if (indexError) {
          return new Response('Not Found', { status: 404, headers: corsHeaders })
        }
        
        return new Response(indexData, {
          headers: {
            ...corsHeaders,
            'Content-Type': 'text/html; charset=utf-8',
            'Cache-Control': 'no-cache'
          }
        })
      }
      return new Response('Not Found', { status: 404, headers: corsHeaders })
    }

    // Determine content type based on file extension
    const getContentType = (fileName: string): string => {
      const ext = fileName.split('.').pop()?.toLowerCase()
      const types: Record<string, string> = {
        'html': 'text/html; charset=utf-8',
        'css': 'text/css; charset=utf-8',
        'js': 'application/javascript; charset=utf-8',
        'json': 'application/json; charset=utf-8',
        'png': 'image/png',
        'jpg': 'image/jpeg',
        'jpeg': 'image/jpeg',
        'svg': 'image/svg+xml',
        'ico': 'image/x-icon',
        'woff': 'font/woff',
        'woff2': 'font/woff2'
      }
      return types[ext || ''] || 'application/octet-stream'
    }

    const contentType = getContentType(path)
    const cacheControl = path.includes('/assets/') ? 'public, max-age=31536000' : 'no-cache'

    return new Response(data, {
      headers: {
        ...corsHeaders,
        'Content-Type': contentType,
        'Cache-Control': cacheControl
      }
    })

  } catch (error) {
    console.error('Function error:', error)
    return new Response('Internal Server Error', { 
      status: 500, 
      headers: corsHeaders 
    })
  }
})
