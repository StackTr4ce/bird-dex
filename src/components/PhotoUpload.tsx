import { useState } from 'react';
import ImageCropper from './ImageCropper';
import { supabase } from '../supabaseClient';
import { useAuth } from '../components/AuthProvider';
import {
  Box,
  Paper,
  Stack,
  Button,
  FormControl,
  FormHelperText,
  CircularProgress,
  TextField,
  Autocomplete,
} from '@mui/material';
import { SPECIES_LIST } from '../constants';

interface PhotoUploadProps {
  onUpload?: () => void;
  questId?: string;
  onCancel?: () => void;
}

import { Checkbox, FormControlLabel } from '@mui/material';

const PhotoUpload = ({ onUpload, questId, onCancel }: PhotoUploadProps) => {
  const { user } = useAuth();
  // const [speciesList, setSpeciesList] = useState<string[]>([]);
  const [speciesId, setSpeciesId] = useState<string>('');
  const [file, setFile] = useState<File | null>(null);
  // Privacy state removed
  // For thumbnail generation
  const [setAsTop, setSetAsTop] = useState(false);
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!croppedBlob) {
      setError('Please select a photo.');
      return;
    }
    if (!questId && !speciesId) {
      setError('Please select a species.');
      return;
    }
    if (croppedBlob.size > 5 * 1024 * 1024) {
      setError('File size must be 5MB or less.');
      return;
    }
    setUploading(true);
    try {
      // Upload full image
      const filePath = `${user?.id}/${questId ? `quest_${questId}` : `species_${speciesId}`}/${Date.now()}_cropped.jpg`;
      const { error: uploadError } = await supabase.storage.from('photos').upload(filePath, croppedBlob);
      if (uploadError) throw uploadError;
      // Generate and upload thumbnail
      const thumbBlob = await createThumbnail(croppedBlob, 360);
      const thumbPath = `${user?.id}/${questId ? `quest_${questId}` : `species_${speciesId}`}/${Date.now()}_thumb.jpg`;
      const { error: thumbError } = await supabase.storage.from('photos').upload(thumbPath, thumbBlob);
      if (thumbError) throw thumbError;
      let insertedPhotoId: string | null = null;
      if (questId) {
        // Store entry in quest_entries table
        await supabase.from('quest_entries').insert({
          user_id: user?.id,
          quest_id: questId,
          image_path: filePath,
          thumbnail_path: thumbPath,
        });
      } else {
        // Check if user already has a photo for this species
        await supabase
          .from('photos')
          .select('id')
          .eq('user_id', user?.id)
          .eq('species_id', speciesId);
        // const isFirst = !existingPhotos || existingPhotos.length === 0;
        // Store photo in photos table
        const { data: inserted, error: insertError } = await supabase.from('photos').insert({
          user_id: user?.id,
          species_id: speciesId,
          url: filePath,
          thumbnail_url: thumbPath,
        }).select('id').single();
        if (insertError) throw insertError;
        insertedPhotoId = inserted?.id;
        // If set as top, upsert into top_species
        if (setAsTop && insertedPhotoId) {
          await supabase.from('top_species').upsert([
            {
              user_id: user?.id,
              species_id: speciesId,
              photo_id: insertedPhotoId
            }
          ], { onConflict: 'user_id,species_id' });
        }
      }
      setFile(null);
      setCroppedBlob(null);
      setShowCropper(false);
      // setPrivacy removed
      setSpeciesId('');
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
          {/* Species selection for normal uploads */}
          {!questId && (
            <Autocomplete
              options={SPECIES_LIST}
              value={speciesId || null}
              onChange={(_, newValue) => {
                setSpeciesId(newValue || '');
              }}
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="Species"
                  required
                  helperText="Type to search for a bird species"
                />
              )}
              filterOptions={(options, { inputValue }) => {
                const filtered = options.filter((option) =>
                  option.toLowerCase().includes(inputValue.toLowerCase())
                );
                return filtered.slice(0, 50); // Limit to 50 results for performance
              }}
              noOptionsText="No species found"
              clearOnEscape
              selectOnFocus
              handleHomeEndKeys
            />
          )}
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
          {/* Privacy selection removed */}
          {/* Set as top photo checkbox (only for non-quest uploads) */}
          {!questId && (
            <FormControlLabel
              control={
                <Checkbox
                  checked={setAsTop}
                  onChange={e => setSetAsTop(e.target.checked)}
                  color="primary"
                  disabled={uploading}
                />
              }
              label="Set as top photo for this species"
              sx={{ mb: 1 }}
            />
          )}
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
