import { useState, useEffect } from 'react';
import { Box, IconButton, Tooltip, Typography, CircularProgress, useTheme, useMediaQuery, Dialog, DialogTitle, DialogContent, DialogContentText, DialogActions, Button, Snackbar, Alert } from '@mui/material';
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
import CloseIcon from '@mui/icons-material/Close';
import StarBorderIcon from '@mui/icons-material/StarBorder';
import StarIcon from '@mui/icons-material/Star';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { useAuth } from '../components/AuthProvider';

interface Photo {
  id: string;
  url: string;
  thumbnail_url?: string;
  created_at: string;
}

const SpeciesPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  // Assume route is /species/:id
  const params = useParams();
  const speciesId = params.speciesId || params.id;
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [topPhotoId, setTopPhotoId] = useState<string | null>(null);
  const [speciesName, setSpeciesName] = useState('');
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [hideDialogOpen, setHideDialogOpen] = useState(false);
  const [photoToHide, setPhotoToHide] = useState<Photo | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!user || !speciesId) return;
    setLoading(true);
    const fetchPhotosAndTop = async () => {
      setSpeciesName(speciesId);
      // Fetch all user's photos for this species
      const { data: photoData } = await supabase
        .from('photos')
        .select('id,url,thumbnail_url,created_at')
        .eq('user_id', user.id)
        .eq('species_id', speciesId)
        .eq('hidden_from_species_view', false)
        .order('created_at', { ascending: false });

      setPhotos(photoData || []);

      // Fetch top photo for this species/user
      const { data: topData } = await supabase
        .from('top_species')
        .select('photo_id')
        .eq('user_id', user.id)
        .eq('species_id', speciesId)
        .single();
      setTopPhotoId(topData?.photo_id || null);
      setLoading(false);
    };
    fetchPhotosAndTop();
  }, [user, speciesId]);

  const hidePhotoFromDex = async (photoId: string) => {
    if (!user || !speciesId) return;
    setUpdating(true);
    try {
      // Remove from top_species if present
      await supabase
        .from('top_species')
        .delete()
        .eq('user_id', user.id)
        .eq('species_id', speciesId)
        .eq('photo_id', photoId);
      // Set hidden_from_species_view to true
      const { error, data } = await supabase
        .from('photos')
        .update({ hidden_from_species_view: true })
        .eq('id', photoId);
      console.log('hidePhotoFromDex:', { error, data });
      if (!error) {
        // Check for Postgres error in data (for some drivers, error is in data.message or data[0].message)
        if (data && typeof data === 'object') {
          const arr = data as any[];
          if (Array.isArray(arr) && arr.length > 0 && typeof arr[0] === 'object' && 'message' in arr[0]) {
            console.log('Postgres error in data[0].message:', arr[0].message);
            setErrorMessage(arr[0].message);
            setUpdating(false);
            setHideDialogOpen(false);
            setPhotoToHide(null);
            return;
          }
          if (!Array.isArray(data) && 'message' in data) {
            console.log('Postgres error in data.message:', (data as any).message);
            setErrorMessage((data as any).message);
            setUpdating(false);
            setHideDialogOpen(false);
            setPhotoToHide(null);
            return;
          }
        }
        setPhotos(photos => photos.filter(p => p.id !== photoId));
        setUpdating(false);
        setHideDialogOpen(false);
        setPhotoToHide(null);
      } else {
        console.log('Supabase error:', error);
        setErrorMessage(error.message);
        setUpdating(false);
        setHideDialogOpen(false);
        setPhotoToHide(null);
      }
    } catch (err: any) {
      setErrorMessage('Failed to hide photo from Dex.');
      setUpdating(false);
      setHideDialogOpen(false);
      setPhotoToHide(null);
    }
  };

  const setAsTopPhoto = async (photoId: string) => {
    if (!user || !speciesId) return;
    setTopPhotoId(photoId); // Optimistically update UI
    try {
      await supabase.from('top_species').upsert([
        {
          user_id: user.id,
          species_id: speciesId,
          photo_id: photoId
        }
      ], { onConflict: 'user_id,species_id' });
    } catch (err) {
      setErrorMessage('Failed to set top photo.');
    }
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
                  border: photo.id === topPhotoId ? '2px solid #1976d2' : '1px solid #444',
                  boxShadow: photo.id === topPhotoId ? 2 : 0,
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
                    <Tooltip title={photo.id === topPhotoId ? 'This is your top photo' : 'Set as Top Photo'}>
                      <span>
                        <IconButton
                          size="small"
                          sx={{ bgcolor: 'rgba(255,255,255,0.9)', '&:hover': { bgcolor: 'primary.dark', color: 'white' }, width: 32, height: 32, color: photo.id === topPhotoId ? '#1976d2' : '#616161', boxShadow: photo.id === topPhotoId ? 2 : 0, mb: 0.5 }}
                          onClick={e => { e.stopPropagation(); if (photo.id !== topPhotoId) setAsTopPhoto(photo.id); }}
                          disabled={updating || photo.id === topPhotoId}
                        >
                          {photo.id === topPhotoId ? <StarIcon fontSize="small" /> : <StarBorderIcon fontSize="small" />}
                        </IconButton>
                      </span>
                    </Tooltip>
                    <Tooltip title="Hide from Dex (species view)">
                      <IconButton
                        size="small"
                        sx={{
                          bgcolor: 'rgba(255,255,255,0.9)',
                          width: 32,
                          height: 32,
                          color: 'grey.400',
                          transition: 'color 0.2s',
                          '&:hover': {
                            bgcolor: 'action.active',
                            color: 'grey.700',
                          },
                        }}
                        onClick={e => {
                          e.stopPropagation();
                          setPhotoToHide(photo);
                          setHideDialogOpen(true);
                        }}
                        disabled={updating}
                      >
                        <CloseIcon fontSize="small" />
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
      {/* Hide from Dex Confirmation Dialog */}
      <Dialog
        open={hideDialogOpen}
        onClose={() => { if (!updating) { setHideDialogOpen(false); setPhotoToHide(null); } }}
        aria-labelledby="hide-photo-dialog-title"
        aria-describedby="hide-photo-dialog-description"
      >
        <DialogTitle id="hide-photo-dialog-title">Hide Photo from Dex?</DialogTitle>
        <DialogContent>
          <DialogContentText id="hide-photo-dialog-description">
            Are you sure you want to hide this photo from the species view ("dex")? It will no longer appear in your dex, but will not be deleted. You can still see it in your uploads.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => { setHideDialogOpen(false); setPhotoToHide(null); }} disabled={updating}>
            Cancel
          </Button>
          <Button onClick={() => { if (photoToHide) hidePhotoFromDex(photoToHide.id); }} color="primary" disabled={updating}>
            Hide from Dex
          </Button>
        </DialogActions>
      </Dialog>
    {/* Error Snackbar */}
    <Snackbar
      open={!!errorMessage}
      autoHideDuration={6000}
      onClose={() => setErrorMessage(null)}
      anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
    >
      <Alert onClose={() => setErrorMessage(null)} severity="error" sx={{ width: '100%' }}>
        {errorMessage}
      </Alert>
    </Snackbar>
  </Box>
  );
};

export default SpeciesPage;
