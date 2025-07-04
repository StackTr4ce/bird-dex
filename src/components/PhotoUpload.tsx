import { useState, useEffect } from 'react';
import ImageCropper from './ImageCropper';
import { supabase } from '../supabaseClient';
import { useAuth } from '../components/AuthProvider';

interface Species {
  id: string;
  name: string;
}

const defaultSpecies: Species[] = [
  { id: 'b1a2c3d4-e5f6-7890-abcd-ef1234567890', name: 'American Pelican' },
  { id: 'c2b3a4d5-f6e7-8901-bcda-fe2345678901', name: 'Northern Cardinal' },
];

const PhotoUpload = ({ onUpload }: { onUpload?: () => void }) => {
  const { user } = useAuth();
  const [speciesList, setSpeciesList] = useState<Species[]>(defaultSpecies);
  const [speciesId, setSpeciesId] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [privacy, setPrivacy] = useState<'public' | 'friends' | 'private'>('public');
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [showCropper, setShowCropper] = useState(false);
  const [croppedBlob, setCroppedBlob] = useState<Blob | null>(null);

  useEffect(() => {
    supabase.from('species').select('*').then(({ data }) => {
      if (data && data.length > 0) setSpeciesList(data);
    });
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!croppedBlob || !speciesId) {
      setError('Please select a species and a photo.');
      return;
    }
    if (croppedBlob.size > 5 * 1024 * 1024) {
      setError('File size must be 5MB or less.');
      return;
    }
    setUploading(true);
    try {
      // Upload to Supabase Storage
      const filePath = `${user?.id}/${speciesId}/${Date.now()}_cropped.jpg`;
      const { data: uploadData, error: uploadError } = await supabase.storage.from('photos').upload(filePath, croppedBlob);
      if (uploadError) throw uploadError;
      // Get a public or signed URL for the uploaded image
      const { data: urlData } = await supabase.storage.from('photos').createSignedUrl(filePath, 60 * 60); // 1 hour
      const url = urlData?.signedUrl || '';
      // Check if this is the user's first photo for this species
      const { data: existingPhotos } = await supabase
        .from('photos')
        .select('id')
        .eq('user_id', user?.id)
        .eq('species_id', speciesId);
      const isFirst = !existingPhotos || existingPhotos.length === 0;
      await supabase.from('photos').insert({
        user_id: user?.id,
        species_id: speciesId,
        url,
        privacy,
        is_top: isFirst,
      });
      setFile(null);
      setCroppedBlob(null);
      setShowCropper(false);
      setSpeciesId('');
      setPrivacy('public');
      if (onUpload) onUpload();
    } catch (err: any) {
      setError(err.message || 'Upload failed');
    }
    setUploading(false);
  };

  return (
    <form onSubmit={handleSubmit} style={{ margin: '1rem 0' }}>
      <div>
        <label>Species</label>
        <select value={speciesId} onChange={e => setSpeciesId(e.target.value)} required>
          <option value="">Select species</option>
          {speciesList.map(s => (
            <option key={s.id} value={s.id}>{s.name}</option>
          ))}
        </select>
      </div>
      <div>
        <label>Photo</label>
        <input
          type="file"
          accept="image/*"
          onChange={e => {
            const f = e.target.files?.[0] || null;
            setFile(f);
            setCroppedBlob(null);
            if (f) setShowCropper(true);
          }}
          required
        />
      </div>
      {showCropper && file && (
        <div style={{ margin: '1rem 0' }}>
          <ImageCropper
            file={file}
            onCropped={blob => {
              setCroppedBlob(blob);
              setShowCropper(false);
            }}
            onCancel={() => {
              setShowCropper(false);
              setFile(null);
              setCroppedBlob(null);
            }}
          />
        </div>
      )}
      <div>
        <label>Privacy</label>
        <select value={privacy} onChange={e => setPrivacy(e.target.value as any)}>
          <option value="public">Public</option>
          <option value="friends">Friends Only</option>
          <option value="private">Private</option>
        </select>
      </div>
      <button type="submit" disabled={uploading}>Upload</button>
      {error && <div style={{ color: 'red' }}>{error}</div>}
    </form>
  );
};

export default PhotoUpload;
