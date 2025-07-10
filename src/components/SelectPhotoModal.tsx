import { useEffect, useState } from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions, Button, CircularProgress, Box, Typography
} from '@mui/material';
import { supabase } from '../supabaseClient';
import SupabaseImage from './SupabaseImage';
import { useAuth } from './AuthProvider';

interface SelectPhotoModalProps {
  open: boolean;
  onClose: () => void;
  onSelect: (photo: UserPhoto) => void;
}

interface UserPhoto {
  id: string;
  url: string;
  thumbnail_url?: string;
  created_at: string;
}

const PAGE_SIZE = 10;

const SelectPhotoModal = ({ open, onClose, onSelect }: SelectPhotoModalProps) => {
  const { user } = useAuth();
  const [photos, setPhotos] = useState<UserPhoto[]>([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);

  useEffect(() => {
    if (!user || !open) return;
    let isMounted = true;
    setLoading(true);
    const fetchPhotos = async () => {
      const from = (page - 1) * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;
      const { data, count } = await supabase
        .from('photos')
        .select('id,url,thumbnail_url,created_at', { count: 'exact' })
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .range(from, to);
      if (isMounted) {
        setPhotos(data || []);
        setTotal(count || 0);
        setLoading(false);
      }
    };
    fetchPhotos();
    return () => { isMounted = false; };
  }, [user, open, page]);

  const handleSelect = (photo: UserPhoto) => {
    onSelect(photo);
    onClose();
  };

  const totalPages = Math.ceil(total / PAGE_SIZE);

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>Select a Photo for Contest</DialogTitle>
      <DialogContent sx={{ background: theme => theme.palette.background.paper, p: 0 }}>
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: 'repeat(2, 1fr)', sm: 'repeat(3, 1fr)', md: 'repeat(4, 1fr)' }, gap: 2, minHeight: 200, position: 'relative', background: theme => theme.palette.background.paper, p: 2, borderRadius: 2 }}>
          {loading && (
            <Box sx={{ position: 'absolute', inset: 0, zIndex: 2, display: 'flex', justifyContent: 'center', alignItems: 'center', background: theme => theme.palette.background.paper, opacity: 0.85, borderRadius: 2 }}>
              <CircularProgress />
            </Box>
          )}
          {photos.map(photo => (
            <Box
              key={photo.id}
              sx={{
                cursor: 'pointer',
                border: '2px solid transparent',
                borderRadius: 2,
                '&:hover': { borderColor: 'primary.main' },
                aspectRatio: '1 / 1',
                overflow: 'hidden',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                p: 0,
                opacity: loading ? 0.5 : 1,
                background: theme => theme.palette.background.paper
              }}
              onClick={() => !loading && handleSelect(photo)}
            >
              <SupabaseImage
                path={photo.thumbnail_url || photo.url}
                alt="User photo"
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'contain',
                  aspectRatio: '1 / 1',
                  display: 'block',
                  background: 'transparent',
                  borderRadius: 0
                }}
              />
            </Box>
          ))}
          {photos.length === 0 && !loading && (
            <Box sx={{ gridColumn: '1 / -1', textAlign: 'center', py: 4 }}>
              <Typography color="text.secondary">No photos found.</Typography>
            </Box>
          )}
        </Box>
      </DialogContent>
      <DialogActions sx={{ justifyContent: 'space-between', background: theme => theme.palette.background.paper }}>
        <Box>
          <Button onClick={onClose}>Cancel</Button>
        </Box>
        <Box>
          <Button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1 || loading}>Previous</Button>
          <Button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages || totalPages === 0 || loading}>Next</Button>
          <Typography variant="caption" sx={{ ml: 2 }}>{`Page ${page} of ${totalPages || 1}`}</Typography>
        </Box>
      </DialogActions>
    </Dialog>
  );
};

export default SelectPhotoModal;
