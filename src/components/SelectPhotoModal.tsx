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
      setPhotos(data || []);
      setTotal(count || 0);
      setLoading(false);
    };
    fetchPhotos();
  }, [user, open, page]);

  const handleSelect = (photo: UserPhoto) => {
    onSelect(photo);
    onClose();
  };

  const totalPages = Math.ceil(total / PAGE_SIZE);

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>Select a Photo</DialogTitle>
      <DialogContent>
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 200 }}>
            <CircularProgress />
          </Box>
        ) : (
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: 'repeat(2, 1fr)', sm: 'repeat(3, 1fr)', md: 'repeat(4, 1fr)' }, gap: 2 }}>
            {photos.map(photo => (
              <Box
                key={photo.id}
                sx={{ cursor: 'pointer', border: '2px solid transparent', borderRadius: 2, '&:hover': { borderColor: 'primary.main' } }}
                onClick={() => handleSelect(photo)}
              >
                <SupabaseImage path={photo.thumbnail_url || photo.url} alt="User photo" style={{ width: '100%', height: 120, objectFit: 'cover', borderRadius: 8 }} />
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5, textAlign: 'center' }}>
                  {new Date(photo.created_at).toLocaleDateString()}
                </Typography>
              </Box>
            ))}
            {photos.length === 0 && !loading && (
              <Box sx={{ gridColumn: '1 / -1', textAlign: 'center', py: 4 }}>
                <Typography color="text.secondary">No photos found.</Typography>
              </Box>
            )}
          </Box>
        )}
      </DialogContent>
      <DialogActions sx={{ justifyContent: 'space-between' }}>
        <Box>
          <Button onClick={onClose}>Cancel</Button>
        </Box>
        <Box>
          <Button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}>Previous</Button>
          <Button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages || totalPages === 0}>Next</Button>
          <Typography variant="caption" sx={{ ml: 2 }}>{`Page ${page} of ${totalPages || 1}`}</Typography>
        </Box>
      </DialogActions>
    </Dialog>
  );
};

export default SelectPhotoModal;
