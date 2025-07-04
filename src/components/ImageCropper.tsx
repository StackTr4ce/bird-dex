import React, { useCallback, useRef, useState } from 'react';
import Cropper from 'react-easy-crop';

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

  const onCropComplete = useCallback((croppedArea, croppedAreaPixels) => {
    setCroppedArea(croppedArea);
  }, []);

  const handleCrop = async () => {
    if (!imageUrl || !croppedArea) return;
    const blob = await getCroppedImg(imageUrl, croppedArea);
    onCropped(blob);
  };

  return (
    <div style={{ position: 'relative', width: 300, height: 350, background: '#222', zIndex: 1000 }}>
      <div style={{ position: 'relative', width: 300, height: 300 }}>
        {imageUrl && (
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
        )}
      </div>
      <div style={{ marginTop: 16, display: 'flex', justifyContent: 'center', gap: 16 }}>
        <button type="button" onClick={handleCrop} style={{ zIndex: 1100 }}>Crop & Use</button>
        <button type="button" onClick={onCancel} style={{ marginLeft: 8, zIndex: 1100 }}>Cancel</button>
      </div>
    </div>
  );
};

export default ImageCropper;
