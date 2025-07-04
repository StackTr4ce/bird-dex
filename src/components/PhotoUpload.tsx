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





interface PhotoUploadProps {
  onUpload?: () => void;
  questId?: string;
  onCancel?: () => void;
}

const PhotoUpload = ({ onUpload, questId, onCancel }: PhotoUploadProps) => {
  const { user } = useAuth();
  // speciesList and speciesId not needed for quest entry
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
    // No species fetch needed for quest entry
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!croppedBlob) {
      setError('Please select a photo.');
      return;
    }
    if (croppedBlob.size > 5 * 1024 * 1024) {
      setError('File size must be 5MB or less.');
      return;
    }
    setUploading(true);
    try {
      // Upload full image
      const filePath = `${user?.id}/quest_${questId}/${Date.now()}_cropped.jpg`;
      const { error: uploadError } = await supabase.storage.from('photos').upload(filePath, croppedBlob);
      if (uploadError) throw uploadError;
      // Generate and upload thumbnail
      const thumbBlob = await createThumbnail(croppedBlob, 360);
      const thumbPath = `${user?.id}/quest_${questId}/${Date.now()}_thumb.jpg`;
      const { error: thumbError } = await supabase.storage.from('photos').upload(thumbPath, thumbBlob);
      if (thumbError) throw thumbError;
      // Store entry in quest_entries table
      await supabase.from('quest_entries').insert({
        user_id: user?.id,
        quest_id: questId,
        image_path: filePath,
        thumbnail_path: thumbPath,
      });
      setFile(null);
      setCroppedBlob(null);
      setShowCropper(false);
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
          {/* No species selection for quest entry */}
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
            {onCancel && (
              <Button onClick={onCancel} disabled={uploading} variant="outlined">Cancel</Button>
            )}
            {error && <FormHelperText error>{error}</FormHelperText>}
          </Box>
        </Stack>
      </Box>
    </Paper>
  );
};

export default PhotoUpload;
