import { useState, useEffect } from 'react';
import { Box, IconButton, Tooltip, Typography, CircularProgress, useTheme, useMediaQuery, Dialog, DialogTitle, DialogContent, DialogContentText, DialogActions, Button } from '@mui/material';
// Responsive grid columns logic (copied from PhotoGridPage)
const useGridColumns = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const isTablet = useMediaQuery(theme.breakpoints.down('md'));
  const isLarge = useMediaQuery(theme.breakpoints.up('xl'));
  const isUltraWide = useMediaQuery('(min-width: 3840px)');
  if (isMobile) return 2;
  if (isTablet) return 3;
  if (isUltraWide) return 12;
  if (isLarge) return 8;
  return 5;
};
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
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [photoToDelete, setPhotoToDelete] = useState<Photo | null>(null);

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
        .eq('hidden_from_species_view', false)
        .order('created_at', { ascending: false });
      setPhotos(photoData || []);
      setLoading(false);
    };
    fetchPhotos();
  }, [user, speciesId]);

  const deletePhoto = async (photoId: string) => {
    if (!user) return;
    setUpdating(true);
    // Soft-delete: hide from species view only
    await supabase
      .from('photos')
      .update({ hidden_from_species_view: true })
      .eq('id', photoId);
    setUpdating(false);
    setPhotos(photos => photos.filter(p => p.id !== photoId));
    setDeleteDialogOpen(false);
    setPhotoToDelete(null);
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

  const gridColumns = useGridColumns();
  return (
    <Box sx={{ 
      width: '100%', 
      pt: { xs: '60px', sm: '68px' },
      pb: { xs: 1, sm: 1.5 },
      mb: 1
    }}>
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
            gridTemplateColumns: `repeat(${gridColumns}, 1fr)`,
            gap: 1,
            width: '95%',
            mx: 'auto',
            p: { xs: 1, sm: 2 },
            mt: 1,
            alignItems: 'stretch',
            boxSizing: 'border-box',
            overflowX: 'hidden',
          }}
        >
          {photos.length === 0 ? (
            <Typography color="text.secondary">No photos uploaded for this species.</Typography>
          ) : (
            photos.map(photo => (
              <Box
                key={photo.id}
                sx={{
                  position: 'relative',
                  aspectRatio: '1',
                  borderRadius: 2,
                  overflow: 'hidden',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease-in-out',
                  border: photo.is_top ? '2px solid #1976d2' : '1px solid #444',
                  boxShadow: photo.is_top ? 2 : 0,
                  '&:hover': {
                    transform: 'scale(1.02)',
                    '& .photo-overlay': {
                      opacity: 1,
                    },
                  },
                }}
                onClick={() => navigate(`/photo/${photo.id}`)}
              >
                <SupabaseImage
                  path={photo.thumbnail_url || photo.url}
                  alt={speciesName ? `${speciesName} photo` : 'Bird photo'}
                  style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover',
                  }}
                />
                {/* Overlay for actions */}
                <Box
                  className="photo-overlay"
                  sx={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    background: 'linear-gradient(to bottom, rgba(0,0,0,0.1) 0%, rgba(0,0,0,0.7) 100%)',
                    opacity: 0,
                    transition: 'opacity 0.2s ease',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'flex-end',
                    p: 1.5,
                  }}
                >
                  <Box sx={{ position: 'absolute', top: 8, right: 8, display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 1, zIndex: 2 }}>
                    <Tooltip title={photo.is_top ? 'This is your top photo' : 'Set as Top Photo'}>
                      <span>
                        <IconButton
                          size="small"
                          sx={{ bgcolor: 'rgba(255,255,255,0.9)', '&:hover': { bgcolor: 'primary.dark', color: 'white' }, width: 32, height: 32, color: photo.is_top ? '#1976d2' : '#616161', boxShadow: photo.is_top ? 2 : 0, mb: 0.5 }}
                          onClick={e => { e.stopPropagation(); !photo.is_top && setAsTopPhoto(photo.id); }}
                          disabled={updating || photo.is_top}
                        >
                          {photo.is_top ? <StarIcon fontSize="small" /> : <StarBorderIcon fontSize="small" />}
                        </IconButton>
                      </span>
                    </Tooltip>
                    <Tooltip title="Delete Photo">
                      <IconButton
                        size="small"
                        sx={{ bgcolor: 'rgba(255,255,255,0.9)', '&:hover': { bgcolor: 'error.main', color: 'white' }, width: 32, height: 32, color: '#616161' }}
                        onClick={e => {
                          e.stopPropagation();
                          setPhotoToDelete(photo);
                          setDeleteDialogOpen(true);
                        }}
                        disabled={updating}
                      >
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </Box>
                  <Typography variant="caption" color="white" sx={{ mt: 1, textShadow: '0 1px 3px rgba(0,0,0,0.5)' }}>
                    Uploaded: {new Date(photo.created_at).toLocaleString()}
                  </Typography>
                </Box>
              </Box>
            ))
          )}
        </Box>
      )}
      {/* Delete Confirmation Dialog */}
      <Dialog
        open={deleteDialogOpen}
        onClose={() => { if (!updating) { setDeleteDialogOpen(false); setPhotoToDelete(null); } }}
        aria-labelledby="delete-photo-dialog-title"
        aria-describedby="delete-photo-dialog-description"
      >
        <DialogTitle id="delete-photo-dialog-title">Delete Photo?</DialogTitle>
        <DialogContent>
          <DialogContentText id="delete-photo-dialog-description">
            Are you sure you want to delete this photo? This action cannot be undone.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => { setDeleteDialogOpen(false); setPhotoToDelete(null); }} disabled={updating}>
            Cancel
          </Button>
          <Button onClick={() => { if (photoToDelete) deletePhoto(photoToDelete.id); }} color="error" disabled={updating}>
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default SpeciesPage;
