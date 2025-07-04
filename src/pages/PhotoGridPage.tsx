

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { useAuth } from '../components/AuthProvider';

interface Photo {
  id: string;
  url: string;
  species_id: string;
  user_id: string;
  created_at: string;
}


interface TopPhoto {
  id: string;
  url: string;
  species_id: string;
  user_id: string;
  created_at: string;
  species_name?: string;
}

const PhotoGridPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [topPhotos, setTopPhotos] = useState<TopPhoto[]>([]);
  const [loading, setLoading] = useState(true);

  // User's score = number of unique species with a top photo
  const score = topPhotos.length;

  useEffect(() => {
    if (!user) return;
    const fetchTopPhotos = async () => {
      setLoading(true);
      // Fetch the user's top photo for each species
      // Assumes a 'top_photos' view or a 'is_top' boolean in the photos table
      // Here, we assume 'is_top' boolean exists
      const { data, error } = await supabase
        .from('photos')
        .select('id,url,species_id,user_id,created_at,species(name)')
        .eq('user_id', user.id)
        .eq('is_top', true)
        .order('species_id', { ascending: true });
      if (error) {
        setTopPhotos([]);
      } else {
        // Flatten species name if joined
        setTopPhotos(
          (data || []).map((p: any) => ({
            ...p,
            species_name: p.species?.name || '',
          }))
        );
      }
      setLoading(false);
    };
    fetchTopPhotos();
  }, [user]);

  return (
    <div>
      <h1>Photo Grid</h1>
      <p>Your top bird photos for each unique species.</p>
      <div style={{ fontWeight: 'bold', fontSize: 18, margin: '1rem 0' }}>
        Score: {score} species
      </div>
      {loading ? (
        <div>Loading...</div>
      ) : (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
          gap: '1rem',
          marginTop: '1.5rem',
        }}>
          {topPhotos.length === 0 ? (
            <div>No top photos found.</div>
          ) : (
            topPhotos.map(photo => (
              <div
                key={photo.id}
                style={{
                  border: '1px solid #eee',
                  borderRadius: 4,
                  padding: '12px',
                  background: '#fff',
                  cursor: 'pointer',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  minWidth: 0,
                  boxShadow: 'none',
                  justifyContent: 'center',
                }}
                onClick={() => navigate(`/species/${photo.species_id}`)}
                title={`View all photos for ${photo.species_name}`}
              >
                <div style={{ width: 160, height: 160, overflow: 'hidden', borderRadius: 4, background: '#eee', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: 0, padding: 0 }}>
                  <img src={photo.url} alt={photo.species_name || 'Bird'} style={{ width: '100%', height: '100%', objectFit: 'cover', aspectRatio: '1 / 1' }} />
                </div>
                <div style={{ fontWeight: 500, fontSize: 15, marginTop: 2, textAlign: 'center', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 160 }}>{photo.species_name}</div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
};

export default PhotoGridPage;
