
import { useState, useEffect } from 'react';
import { Box, IconButton, Tooltip, Typography, Paper, CircularProgress } from '@mui/material';
import SupabaseImage from '../components/SupabaseImage';
import DeleteIcon from '@mui/icons-material/Delete';
import StarBorderIcon from '@mui/icons-material/StarBorder';
import StarIcon from '@mui/icons-material/Star';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { useAuth } from '../components/AuthProvider';

interface Photo {
  id: string;
  url: string;
  thumbnail_url?: string;
  is_top: boolean;
  created_at: string;
}

const SpeciesPage = () => {
  const navigate = useNavigate();
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
      // Since species_id now contains the species name, use it directly
      setSpeciesName(speciesId);
      // Get all user's photos for this species
      const { data: photoData } = await supabase
        .from('photos')
        .select('id,url,thumbnail_url,is_top,created_at')
        .eq('user_id', user.id)
        .eq('species_id', speciesId)
        .order('created_at', { ascending: false });
      setPhotos(photoData || []);
      setLoading(false);
    };
    fetchPhotos();
  }, [user, speciesId]);

  const deletePhoto = async (photoId: string) => {
    if (!user) return;
    setUpdating(true);
    // Delete from Supabase Storage (optional: if you want to remove the file itself)
    // Now, url is just the storage path
    const photo = photos.find(p => p.id === photoId);
    if (photo) {
      await supabase.storage.from('photos').remove([photo.url]);
    }
    // Delete from DB
    await supabase.from('photos').delete().eq('id', photoId);
    setUpdating(false);
    setPhotos(photos => photos.filter(p => p.id !== photoId));
  };

  const setAsTopPhoto = async (photoId: string) => {
    if (!user || !speciesId) return;
    // Optimistically update UI only
    setPhotos(photos => photos.map(p => ({ ...p, is_top: p.id === photoId })));
    // Update DB in background
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
    // No setUpdating or refetch
  };

  return (
    <Box>
      <Typography align="left" variant="h4" fontWeight={700} gutterBottom sx={{ pb: 2 }}>
        Species: {speciesName}
      </Typography>

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 200 }}>
          <CircularProgress />
        </Box>
      ) : (
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: {
              xs: 'repeat(1, minmax(0, 1fr))',
              sm: 'repeat(2, minmax(0, 1fr))',
              md: 'repeat(3, minmax(360px, 1fr))',
              lg: 'repeat(4, minmax(360px, 1fr))',
              xl: 'repeat(5, minmax(360px, 1fr))',
            },
            gap: 2,
            mt: 1,
            width: '100%',
            alignItems: 'stretch',
            boxSizing: 'border-box',
            overflowX: 'hidden',
          }}
        >
          {photos.length === 0 ? (
            <Typography color="text.secondary">No photos uploaded for this species.</Typography>
          ) : (
            photos.map(photo => (
              <Paper key={photo.id} elevation={photo.is_top ? 6 : 2} sx={{ position: 'relative', border: photo.is_top ? '2px solid #1976d2' : '1px solid #444', borderRadius: 3, p: 0, background: 'background.paper', width: '100%', maxWidth: 360, height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'stretch', justifyContent: 'stretch', mx: 'auto' }}>
                <Box sx={{ position: 'relative', width: '100%', aspectRatio: '1 / 1', minHeight: 0, cursor: 'pointer' }}
                  onClick={() => navigate(`/photo/${photo.id}`)}
                >
                  {/* Always use SupabaseImage to generate a fresh signed URL for each photo */}
                  <SupabaseImage path={photo.thumbnail_url || photo.url} alt={speciesName ? `${speciesName} photo` : 'Bird photo'} style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 12 }} />
                  <Box sx={{ position: 'absolute', top: 6, right: 6, display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 0.5, zIndex: 2 }}>
                    <Tooltip title="Delete Photo">
                      <IconButton
                        size="small"
                        sx={{ background: 'rgba(0,0,0,0.5)', color: '#fff', mb: 0.5, '&:hover': { background: 'error.main' } }}
                        onClick={() => deletePhoto(photo.id)}
                        disabled={updating}
                      >
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title={photo.is_top ? 'This is your top photo' : 'Set as Top Photo'}>
                      <span>
                        <IconButton
                          size="small"
                          sx={{ background: photo.is_top ? 'rgba(0,0,0,0.5)' : 'rgba(0,0,0,0.5)', color: '#fff', boxShadow: photo.is_top ? 2 : 0, '&:hover': { background: 'primary.dark' }, mt: 0.5 }}
                          onClick={() => !photo.is_top && setAsTopPhoto(photo.id)}
                          disabled={updating || photo.is_top}
                        >
                          {photo.is_top ? <StarIcon fontSize="small" /> : <StarBorderIcon fontSize="small" />}
                        </IconButton>
                      </span>
                    </Tooltip>
                  </Box>
                </Box>
                <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5 }}>
                  Uploaded: {new Date(photo.created_at).toLocaleString()}
                </Typography>
              </Paper>
            ))
          )}
        </Box>
      )}
    </Box>
  );
};

export default SpeciesPage;
