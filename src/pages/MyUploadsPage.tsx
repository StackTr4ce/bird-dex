import { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { useAuth } from '../components/AuthProvider';
import PhotoUpload from '../components/PhotoUpload';

interface Photo {
  id: string;
  url: string;
  species_id: string;
  created_at: string;
  is_top?: boolean;
  species?: { name: string };
}

interface Comment {
  id: string;
  photo_id: string;
  user_id: string;
  content: string;
  created_at: string;
}

const MyUploadsPage = () => {
  const { user } = useAuth();
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchUploads = async () => {
    setLoading(true);
    const { data: photosData } = await supabase
      .from('photos')
      .select('id,url,species_id,created_at,is_top,species(name)')
      .eq('user_id', user?.id || '');
    setPhotos(photosData || []);
    if (photosData && photosData.length > 0) {
      const photoIds = photosData.map(p => p.id);
      const { data: commentsData } = await supabase
        .from('comments')
        .select('*')
        .in('photo_id', photoIds);
      setComments(commentsData || []);
    } else {
      setComments([]);
    }
    setLoading(false);
  };

  useEffect(() => {
    if (user) fetchUploads();
    // eslint-disable-next-line
  }, [user]);

  const [updating, setUpdating] = useState(false);
  const setAsTopPhoto = async (photo: Photo) => {
    if (!user) return;
    setUpdating(true);
    // Set all user's photos for this species to is_top = false, then set selected to true
    await supabase
      .from('photos')
      .update({ is_top: false })
      .eq('user_id', user.id)
      .eq('species_id', photo.species_id);
    await supabase
      .from('photos')
      .update({ is_top: true })
      .eq('id', photo.id)
      .eq('user_id', user.id);
    await fetchUploads();
    setUpdating(false);
  };

  return (
    <div>
      <h1>My Uploads</h1>
      <PhotoUpload onUpload={() => { /* TODO: refresh uploads */ }} />
      <p>View all your uploaded bird photos and comments on them.</p>
      {loading ? (
        <div>Loading...</div>
      ) : (
        <div>
          {photos.length === 0 ? (
            <div>No uploads yet.</div>
          ) : (
            <ul>
              {photos.map(photo => (
                <li key={photo.id} style={{ marginBottom: 24, border: photo.is_top ? '2px solid #0077ff' : '1px solid #ccc', borderRadius: 8, padding: 8, background: '#fff', position: 'relative' }}>
                  <img src={photo.url} alt={photo.species?.name || 'Bird'} style={{ maxWidth: 200, display: 'block', borderRadius: 4 }} />
                  <div style={{ fontWeight: 500, marginTop: 8 }}>{photo.species?.name}</div>
                  {photo.is_top && <div style={{ position: 'absolute', top: 8, left: 8, background: '#0077ff', color: '#fff', padding: '2px 8px', borderRadius: 4, fontSize: 12 }}>Top Photo</div>}
                  <div>Uploaded: {new Date(photo.created_at).toLocaleString()}</div>
                  {!photo.is_top && (
                    <button onClick={() => setAsTopPhoto(photo)} disabled={updating} style={{ marginTop: 8 }}>
                      Set as Top Photo
                    </button>
                  )}
                  <div>
                    <strong>Comments:</strong>
                    <ul>
                      {comments.filter(c => c.photo_id === photo.id).length === 0 ? (
                        <li>No comments</li>
                      ) : (
                        comments.filter(c => c.photo_id === photo.id).map(c => (
                          <li key={c.id}>{c.content}</li>
                        ))
                      )}
                    </ul>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
};

export default MyUploadsPage;
