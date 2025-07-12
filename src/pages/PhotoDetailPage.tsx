import { useAuth } from '../components/AuthProvider';
import { Box, Typography, Paper, TextField, Button, Stack, IconButton, Tooltip, Autocomplete } from '@mui/material';
import { SPECIES_LIST } from '../constants';
import EditIcon from '@mui/icons-material/Edit';
import { useParams } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMapEvent, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { supabase } from '../supabaseClient';
import SupabaseImage from '../components/SupabaseImage';

// Component to handle map clicks for setting lat/lng
function LocationSelector({ editing, setLat, setLng }: { editing: boolean, setLat: (lat: number) => void, setLng: (lng: number) => void }) {
  useMapEvent('click', (e) => {
    if (editing) {
      setLat(e.latlng.lat);
      setLng(e.latlng.lng);
    }
  });
  return null;
}

// Component to keep the map centered on the marker when lat/lng change
function CenterMapOnMarker({ lat, lng }: { lat: number, lng: number }) {
  const map = useMap();
  useEffect(() => {
    map.setView([lat, lng]);
  }, [lat, lng, map]);
  return null;
}

export default function PhotoDetailPage() {
  const { user } = useAuth();
  const { photoId } = useParams();
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [speciesId, setSpeciesId] = useState<string | null>(null);
  const [lat, setLat] = useState<number | null>(null);
  const [lng, setLng] = useState<number | null>(null);
  const [locationText, setLocationText] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [originalSpeciesId, setOriginalSpeciesId] = useState<string | null>(null);

  // Fetch photo info from Supabase
  useEffect(() => {
    if (!photoId || typeof photoId !== 'string' || photoId.trim() === '') {
      setPhotoUrl(null);
      setSpeciesId(null);
      setLat(null);
      setLng(null);
      setLocationText('');
      setDescription('');
      return;
    }
    supabase
      .from('photos')
      .select('url, lat, lng, description, species_id')
      .eq('id', photoId)
      .single()
      .then(async ({ data, error }) => {
        if (error || !data) {
          setPhotoUrl(null);
          setSpeciesId(null);
          setLocationText('');
          setDescription('');
          return;
        }
        setPhotoUrl(data.url || null);
        setSpeciesId(data.species_id || null);
        setOriginalSpeciesId(data.species_id || null);
        setLat(data.lat ?? null);
        setLng(data.lng ?? null);
        setDescription(data.description || '');
        // Reverse geocoding to get a human-friendly address
        if (data.lat != null && data.lng != null) {
          try {
            const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${data.lat}&lon=${data.lng}`);
            if (!response.ok) throw new Error('Reverse geocoding failed');
            const geo = await response.json();
            if (geo.display_name) {
              setLocationText(geo.display_name);
            } else {
              setLocationText('Unknown location');
            }
          } catch (e) {
            setLocationText('Unknown location');
          }
        } else {
          setLocationText('No location available');
        }
      });
  }, [photoId]);

  // Update location text when lat/lng are changed in edit mode
  useEffect(() => {
    if (!editing) return;
    if (lat != null && lng != null) {
      fetch(`https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}`)
        .then(res => res.ok ? res.json() : null)
        .then(geo => {
          if (geo && geo.display_name) {
            setLocationText(geo.display_name);
          } else {
            setLocationText('Unknown location');
          }
        })
        .catch(() => setLocationText('Unknown location'));
    } else {
      setLocationText('No location available');
    }
  }, [lat, lng, editing]);

  // No reverse geocoding for now

  // Custom marker icon to fix missing default icon issue in Leaflet
  const markerIcon = new L.Icon({
    iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
    iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
    shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41],
  });

  return (
    <Box sx={{ mx: 'auto', mt: 4, p: 2, maxWidth: 1200 }}>
      <Box sx={{ 
        display: 'flex', 
        gap: 3, 
        flexDirection: { xs: 'column', md: 'row' },
        mb: 3 
      }}>
        <Box sx={{ 
          flex: 1, 
          minWidth: 0, 
          width: '100%',
          maxWidth: { xs: '100%', md: 420 }
        }}>
          <Paper elevation={2} sx={{ p: 2, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', minHeight: 320, height: '100%' }}>
            {speciesId && (
              <Typography variant="h6" gutterBottom sx={{ textAlign: 'center', mb: 2 }}>
                {speciesId}
              </Typography>
            )}
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%', height: '100%' }}>
              {photoUrl ? (
                <SupabaseImage path={photoUrl} alt="Bird" style={{ maxWidth: '100%', maxHeight: 300, borderRadius: 8 }} />
              ) : (
                <Box sx={{ width: '100%', maxWidth: 300, height: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#eee', borderRadius: 2 }}>
                  <Typography variant="body2" color="text.secondary">No Image Available</Typography>
                </Box>
              )}
            </Box>
          </Paper>
        </Box>
        <Box sx={{ 
          flex: 1, 
          minWidth: 0, 
          width: '100%',
          maxWidth: { xs: '100%', md: 420 }
        }}>
          <Paper elevation={2} sx={{ p: 2, minHeight: 320, height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
            <Typography variant="h6" gutterBottom>Map Location</Typography>
            {lat != null && lng != null ? (
              <Box sx={{ 
                width: '100%', 
                height: { xs: 250, md: 320 }, 
                borderRadius: 2, 
                overflow: 'hidden', 
                mb: 1, 
                minWidth: 0, 
                minHeight: 250, 
                maxHeight: 320 
              }}>
                <MapContainer
                  center={[lat, lng]}
                  zoom={13}
                  style={{ width: '100%', height: '100%' }}
                  scrollWheelZoom={true}
                  dragging={true}
                  key={photoId}
                >
                  <CenterMapOnMarker lat={lat} lng={lng} />
                  <LocationSelector editing={editing} setLat={setLat} setLng={setLng} />
                  <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                  />
                  <Marker
                    position={[lat, lng]}
                    icon={markerIcon}
                    draggable={editing}
                    eventHandlers={editing ? {
                      dragend: (e) => {
                        const marker = e.target;
                        const newPos = marker.getLatLng();
                        setLat(newPos.lat);
                        setLng(newPos.lng);
                      },
                    } : undefined}
                  >
                    <Popup>
                      {locationText}
                    </Popup>
                  </Marker>
                </MapContainer>
              </Box>
            ) : (
              <Box sx={{ 
                width: '100%', 
                height: { xs: 250, md: 320 }, 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center', 
                borderRadius: 2, 
                background: '#f5f5f5', 
                mb: 1, 
                minWidth: 0, 
                minHeight: 250, 
                maxHeight: 320 
              }}>
                <Typography variant="body2" color="text.secondary">
                  No Location Set
                </Typography>
              </Box>
            )}
            {lat != null && lng != null && (
              <Typography
                variant="body2"
                color="text.secondary"
                sx={{ 
                  mt: 2, 
                  width: '100%', 
                  minHeight: 28, 
                  whiteSpace: 'nowrap', 
                  overflow: 'hidden', 
                  textOverflow: 'ellipsis', 
                  textAlign: 'center', 
                  display: 'block' 
                }}
                title={locationText}
              >
                {locationText.length > 30 ? locationText.slice(0, 30) + '…' : locationText}
              </Typography>
            )}
          </Paper>
        </Box>
      </Box>
      {/* Second row: description */}
      <Paper elevation={2} sx={{ p: 3, mt: 3, position: 'relative' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
          <Typography variant="subtitle1" sx={{ flex: 1, mb: 0, textAlign: 'left', fontWeight: 500, letterSpacing: 0.2 }}>Details</Typography>
          {!editing && (
            <Tooltip title="Edit">
              <IconButton size="small" color="primary" onClick={() => setEditing(true)}>
                <EditIcon />
              </IconButton>
            </Tooltip>
          )}
        </Box>
        <Stack spacing={2}>
          {editing ? (
            <>
              <Autocomplete
                options={SPECIES_LIST}
                value={speciesId || ''}
                onChange={(_, newValue) => setSpeciesId(newValue || '')}
                renderInput={(params) => (
                  <TextField {...params} label="Species" fullWidth />
                )}
                sx={{ mb: 2 }}
              />
              <TextField
                label="Details"
                value={description}
                onChange={e => setDescription(e.target.value)}
                fullWidth
                multiline
                minRows={2}
                maxRows={6}
              />
              {/* If no lat/lng, show Set in Map button */}
              {lat == null || lng == null ? (
                <Box sx={{ 
                  display: 'flex', 
                  flexDirection: { xs: 'column', sm: 'row' },
                  alignItems: { xs: 'stretch', sm: 'center' }, 
                  gap: 2, 
                  mt: 2 
                }}>
                  <Button
                    variant="outlined"
                    onClick={async () => {
                      // Try to get current location, fallback to Chicago
                      if (navigator.geolocation) {
                        navigator.geolocation.getCurrentPosition(
                          (pos) => {
                            setLat(pos.coords.latitude);
                            setLng(pos.coords.longitude);
                          },
                          () => {
                            // Fallback to Chicago, IL
                            setLat(41.8781);
                            setLng(-87.6298);
                          },
                          { enableHighAccuracy: true, timeout: 5000 }
                        );
                      } else {
                        setLat(41.8781);
                        setLng(-87.6298);
                      }
                    }}
                    sx={{ minWidth: { xs: '100%', sm: 'auto' } }}
                  >
                    Set in Map
                  </Button>
                  <Typography variant="body2" color="text.secondary" sx={{ textAlign: { xs: 'center', sm: 'left' } }}>
                    Set your location using your device or defaults to Chicago, IL.
                  </Typography>
                </Box>
              ) : (
                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                  <TextField
                    label="Latitude"
                    type="number"
                    value={lat ?? ''}
                    onChange={e => setLat(e.target.value === '' ? null : parseFloat(e.target.value))}
                    inputProps={{ step: 'any' }}
                    sx={{ width: { xs: '100%', sm: 180 } }}
                  />
                  <TextField
                    label="Longitude"
                    type="number"
                    value={lng ?? ''}
                    onChange={e => setLng(e.target.value === '' ? null : parseFloat(e.target.value))}
                    inputProps={{ step: 'any' }}
                    sx={{ width: { xs: '100%', sm: 180 } }}
                  />
                </Stack>
              )}
              <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, gap: 2, mt: 2 }}>
                <Button
                  variant="contained"
                  color="primary"
                  disabled={saving}
                  onClick={async () => {
                    if (!photoId) return;
                    setSaving(true);
                    // If species changed and user has this photo as top_species, delete from top_species first
                    if (
                      user &&
                      originalSpeciesId &&
                      speciesId &&
                      speciesId !== originalSpeciesId
                    ) {
                      // Remove from top_species if this photo is the top for the original species
                      await supabase
                        .from('top_species')
                        .delete()
                        .eq('user_id', user.id)
                        .eq('species_id', originalSpeciesId)
                        .eq('photo_id', photoId);
                    }
                    await supabase
                      .from('photos')
                      .update({ lat, lng, description, species_id: speciesId })
                      .eq('id', photoId);
                    setOriginalSpeciesId(speciesId);
                    setEditing(false);
                    setSaving(false);
                  }}
                  sx={{ minWidth: { xs: '100%', sm: 'auto' } }}
                >
                  Save
                </Button>
                <Button
                  variant="outlined"
                  disabled={saving}
                  onClick={() => setEditing(false)}
                  sx={{ minWidth: { xs: '100%', sm: 'auto' } }}
                >
                  Cancel
                </Button>
              </Box>
            </>
          ) : (
            <>
              <Typography variant="body1" color="text.secondary" sx={{ mb: 1, textAlign: 'left' }}>
                {description || 'No details.'}
              </Typography>
            </>
          )}
        </Stack>
      </Paper>
    </Box>
  );
}
