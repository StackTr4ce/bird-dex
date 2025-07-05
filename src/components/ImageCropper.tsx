import React, { useCallback, useState } from 'react';
import Cropper from 'react-easy-crop';
import { Box, Button, Stack } from '@mui/material';

interface ImageCropperProps {
  file: File;
  onCropped: (croppedBlob: Blob) => void;
  onCancel: () => void;
}

const createImage = (url: string): Promise<HTMLImageElement> => {
  return new Promise((resolve, reject) => {
    const image = new window.Image();
    image.addEventListener('load', () => resolve(image));
    image.addEventListener('error', error => reject(error));
    image.setAttribute('crossOrigin', 'anonymous');
    image.src = url;
  });
};

async function getCroppedImg(imageSrc: string, crop: any): Promise<Blob> {
  const image = await createImage(imageSrc);
  const canvas = document.createElement('canvas');
  const size = Math.min(image.width, image.height);
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('No 2d context');
  // Crop to square
  const sx = crop.x * image.width / 100;
  const sy = crop.y * image.height / 100;
  const sw = crop.width * image.width / 100;
  const sh = crop.height * image.height / 100;
  ctx.drawImage(image, sx, sy, sw, sh, 0, 0, size, size);
  return new Promise(resolve => {
    canvas.toBlob(blob => {
      if (blob) resolve(blob);
    }, 'image/jpeg');
  });
}

const ImageCropper: React.FC<ImageCropperProps> = ({ file, onCropped, onCancel }) => {
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedArea, setCroppedArea] = useState<any>(null);
  const [imageUrl, setImageUrl] = useState<string | null>(null);

  React.useEffect(() => {
    const reader = new FileReader();
    reader.onload = () => setImageUrl(reader.result as string);
    reader.readAsDataURL(file);
  }, [file]);

  const onCropComplete = useCallback((croppedArea: any, _croppedAreaPixels: any) => {
    setCroppedArea(croppedArea);
  }, []);

  const handleCrop = async () => {
    if (!imageUrl || !croppedArea) return;
    const blob = await getCroppedImg(imageUrl, croppedArea);
    onCropped(blob);
  };

  return (
    <Box
      sx={{
        position: 'relative',
        width: 1,
        maxWidth: 600,
        mx: 'auto',
        background: '#222',
        borderRadius: 2,
        p: 2,
        zIndex: 1000,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
      }}
    >
      <Box sx={{ position: 'relative', width: 1, maxWidth: 520, height: 0, paddingTop: '100%' }}>
        {imageUrl && (
          <Box sx={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' }}>
            <Cropper
              image={imageUrl}
              crop={crop}
              zoom={zoom}
              aspect={1}
              onCropChange={setCrop}
              onZoomChange={setZoom}
              onCropComplete={onCropComplete}
              style={{ containerStyle: { width: '100%', height: '100%' } }}
            />
          </Box>
        )}
      </Box>
      <Stack direction="row" spacing={2} sx={{ mt: 2, width: 1, justifyContent: 'center' }}>
        <Button variant="contained" color="primary" onClick={handleCrop} sx={{ flex: 1, minWidth: 0 }}>
          Crop & Use
        </Button>
        <Button variant="outlined" color="secondary" onClick={onCancel} sx={{ flex: 1, minWidth: 0 }}>
          Cancel
        </Button>
      </Stack>
    </Box>
  );
};

export default ImageCropper;
