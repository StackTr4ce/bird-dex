import { useState, useEffect } from 'react';
import ImageCropper from './ImageCropper';
import { supabase } from '../supabaseClient';
import { useAuth } from '../components/AuthProvider';
import {
  Box,
  Paper,
  Typography,
  Stack,
  Button,
  MenuItem,
  Select,
  InputLabel,
  FormControl,
  FormHelperText,
  CircularProgress,
  TextField,
} from '@mui/material';

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
  // For thumbnail generation
  async function createThumbnail(blob: Blob, size = 360): Promise<Blob> {
    // Create an offscreen image and canvas
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const image = new window.Image();
      image.onload = () => resolve(image);
      image.onerror = reject;
      image.src = URL.createObjectURL(blob);
    });
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('No 2d context');
    ctx.drawImage(img, 0, 0, size, size);
    return new Promise((resolve, reject) => {
      canvas.toBlob(b => b ? resolve(b) : reject(new Error('Failed to create thumbnail')), 'image/jpeg', 0.92);
    });
  }
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
      // Upload full image
      const filePath = `${user?.id}/${speciesId}/${Date.now()}_cropped.jpg`;
      const { error: uploadError } = await supabase.storage.from('photos').upload(filePath, croppedBlob);
      if (uploadError) throw uploadError;
      // Generate and upload thumbnail
      const thumbBlob = await createThumbnail(croppedBlob, 360);
      const thumbPath = `${user?.id}/${speciesId}/${Date.now()}_thumb.jpg`;
      const { error: thumbError } = await supabase.storage.from('photos').upload(thumbPath, thumbBlob);
      if (thumbError) throw thumbError;
      // Store both paths in DB
      const url = filePath;
      const thumbnail_url = thumbPath;
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
        url, // full image path
        thumbnail_url, // thumbnail path
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
    <Paper elevation={0} sx={{ p: { xs: 1, sm: 2 }, width: '100%', background: 'transparent' }}>
      <Box component="form" onSubmit={handleSubmit} sx={{ width: '100%' }}>
        <Stack spacing={2}>
          <FormControl fullWidth required>
            <InputLabel id="species-label">Species</InputLabel>
            <Select
              labelId="species-label"
              value={speciesId}
              label="Species"
              onChange={e => setSpeciesId(e.target.value)}
            >
              <MenuItem value=""><em>Select species</em></MenuItem>
              {speciesList.map(s => (
                <MenuItem key={s.id} value={s.id}>{s.name}</MenuItem>
              ))}
            </Select>
          </FormControl>
          <FormControl fullWidth required>
            <Button
              variant="outlined"
              component="label"
              sx={{ width: '100%', justifyContent: 'flex-start', textTransform: 'none' }}
              disabled={uploading}
            >
              {file ? file.name : 'Choose Photo'}
              <input
                type="file"
                accept="image/*"
                hidden
                onChange={e => {
                  const f = e.target.files?.[0] || null;
                  setFile(f);
                  setCroppedBlob(null);
                  if (f) setShowCropper(true);
                }}
                required
              />
            </Button>
            <FormHelperText>Select a photo to upload (max 5MB)</FormHelperText>
          </FormControl>
          {showCropper && file && (
            <Box sx={{ my: 2, mx: 'auto', width: 1, maxWidth: 600 }}>
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
            </Box>
          )}
          <FormControl fullWidth>
            <InputLabel id="privacy-label">Privacy</InputLabel>
            <Select
              labelId="privacy-label"
              value={privacy}
              label="Privacy"
              onChange={e => setPrivacy(e.target.value as any)}
            >
              <MenuItem value="public">Public</MenuItem>
              <MenuItem value="friends">Friends Only</MenuItem>
              <MenuItem value="private">Private</MenuItem>
            </Select>
          </FormControl>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Button type="submit" variant="contained" color="primary" disabled={uploading} sx={{ minWidth: 120 }}>
              {uploading ? <CircularProgress size={20} /> : 'Upload'}
            </Button>
            {error && <FormHelperText error>{error}</FormHelperText>}
          </Box>
        </Stack>
      </Box>
    </Paper>
  );
};

export default PhotoUpload;
