
import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { useAuth } from '../components/AuthProvider';

interface Photo {
  id: string;
  url: string;
  is_top: boolean;
  created_at: string;
}

const SpeciesPage = () => {
  const { user } = useAuth();
  // Assume route is /species/:id
  const params = useParams();
  const speciesId = params.speciesId || params.id;
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [speciesName, setSpeciesName] = useState('');
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    if (!user || !speciesId) return;
    setLoading(true);
    const fetchPhotos = async () => {
      // Get species name
      const { data: speciesData, error: speciesError } = await supabase.from('species').select('name').eq('id', speciesId).maybeSingle();
      setSpeciesName(speciesData?.name || '');
      // Get all user's photos for this species
      const { data: photoData, error: photoError } = await supabase
        .from('photos')
        .select('id,url,is_top,created_at')
        .eq('user_id', user.id)
        .eq('species_id', speciesId)
        .order('created_at', { ascending: false });
      setPhotos(photoData || []);
      setLoading(false);
    };
    fetchPhotos();
  }, [user, speciesId, updating]);

  const setAsTopPhoto = async (photoId: string) => {
    if (!user || !speciesId) return;
    setUpdating(true);
    // Set all user's photos for this species to is_top = false, then set selected to true
    await supabase
      .from('photos')
      .update({ is_top: false })
      .eq('user_id', user.id)
      .eq('species_id', speciesId);
    await supabase
      .from('photos')
      .update({ is_top: true })
      .eq('id', photoId)
      .eq('user_id', user.id);
    setUpdating(false);
  };

  return (
    <div>
      <h1>Species: {speciesName}</h1>
      <p>Manage your photos for this species. Select your top photo below.</p>
      {loading ? (
        <div>Loading...</div>
      ) : (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16, marginTop: 24 }}>
          {photos.length === 0 ? (
            <div>No photos uploaded for this species.</div>
          ) : (
            photos.map(photo => (
              <div key={photo.id} style={{ border: photo.is_top ? '2px solid #0077ff' : '1px solid #ccc', borderRadius: 8, padding: 8, background: '#fff', position: 'relative' }}>
                <img src={photo.url} alt="Bird" style={{ width: 200, height: 200, objectFit: 'cover', borderRadius: 4 }} />
                {photo.is_top && <div style={{ position: 'absolute', top: 8, left: 8, background: '#0077ff', color: '#fff', padding: '2px 8px', borderRadius: 4, fontSize: 12 }}>Top Photo</div>}
                <div style={{ fontSize: 12, color: '#666', marginTop: 4 }}>Uploaded: {new Date(photo.created_at).toLocaleString()}</div>
                {!photo.is_top && (
                  <button onClick={() => setAsTopPhoto(photo.id)} disabled={updating} style={{ marginTop: 8 }}>
                    Set as Top Photo
                  </button>
                )}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
};

export default SpeciesPage;
