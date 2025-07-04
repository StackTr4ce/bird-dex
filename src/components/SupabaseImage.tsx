import { supabase } from '../supabaseClient';

interface SupabaseImageProps {
  path: string;
  alt?: string;
  [key: string]: any;
}

// For public buckets, use getPublicUrl (CDN-backed, no signed URLs needed)
const SupabaseImage = ({ path, alt = '', ...props }: SupabaseImageProps) => {
  if (!path) return null;
  const { data } = supabase.storage.from('photos').getPublicUrl(path);
  return (
    <img
      src={data.publicUrl}
      alt={alt}
      style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 8 }}
      {...props}
    />
  );
};

export default SupabaseImage;
