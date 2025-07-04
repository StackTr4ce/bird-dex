import { useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';

interface SupabaseImageProps {
  path: string;
  alt?: string;
  [key: string]: any;
}

// This component generates a fresh signed URL for each render
const SupabaseImage = ({ path, alt = '', ...props }: SupabaseImageProps) => {
  const [url, setUrl] = useState<string>('');

  useEffect(() => {
    let isMounted = true;
    if (!path) return;
    // You can use getPublicUrl if your bucket is public
    // For private buckets, use createSignedUrl
    supabase.storage.from('photos').createSignedUrl(path, 60 * 60).then(({ data }) => {
      if (isMounted) setUrl(data?.signedUrl || '');
    });
    return () => { isMounted = false; };
  }, [path]);

  if (!path) return null;
  if (!url) return <div style={{width:'100%',height:'100%',background:'#222'}} />;
  return <img src={url} alt={alt} style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 8 }} {...props} />;
};

export default SupabaseImage;
