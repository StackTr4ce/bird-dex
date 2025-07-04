

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { useAuth } from '../components/AuthProvider';
import {
  Box,
  Card,
  CardContent,
  CircularProgress,
  Typography,
  Paper,
} from '@mui/material';
import SupabaseImage from '../components/SupabaseImage';




interface TopPhoto {
  id: string;
  url: string;
  thumbnail_url?: string;
  species_id: string;
  user_id: string;
  created_at: string;
  species_name?: string;
}

const PhotoGridPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [topPhotos, setTopPhotos] = useState<TopPhoto[]>([]);
  const [loading, setLoading] = useState(true);

  // User's score = number of unique species with a top photo
  const score = topPhotos.length;

  useEffect(() => {
    if (!user) return;
    const fetchTopPhotos = async () => {
      setLoading(true);
      // Fetch the user's top photo for each species
      // Assumes a 'top_photos' view or a 'is_top' boolean in the photos table
      // Here, we assume 'is_top' boolean exists
      const { data, error } = await supabase
        .from('photos')
        .select('id,url,thumbnail_url,species_id,user_id,created_at,species(name)')
        .eq('user_id', user.id)
        .eq('is_top', true)
        .order('species_id', { ascending: true });
      if (error) {
        setTopPhotos([]);
      } else {
        // Flatten species name if joined
        setTopPhotos(
          (data || []).map((p: any) => ({
            ...p,
            species_name: p.species?.name || '',
          }))
        );
      }
      setLoading(false);
    };
    fetchTopPhotos();
  }, [user]);

  return (
    <Box sx={{ width: '100%', maxWidth: 1400, mx: 'auto', p: { xs: 1, sm: 2, md: 3 }, alignItems: 'flex-start', display: 'flex', flexDirection: 'column', minHeight: '100vh', boxSizing: 'border-box', overflowX: 'hidden' }}>
      <Typography variant="h4" fontWeight={700} gutterBottom>
        Photo Grid
      </Typography>
      <Typography variant="subtitle1" color="text.secondary">
        Your top bird photos for each unique species.
      </Typography>
      <Paper elevation={2} sx={{ display: 'inline-block', px: 2, py: 1, my: 2, fontWeight: 600, fontSize: 18 }}>
        Score: {score} species
      </Paper>
      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 200 }}>
          <CircularProgress />
        </Box>
      ) : (
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: {
              xs: 'repeat(1, minmax(0, 1fr))',
              sm: 'repeat(2, minmax(0, 1fr))',
              md: 'repeat(3, minmax(360px, 1fr))',
              lg: 'repeat(4, minmax(360px, 1fr))',
              xl: 'repeat(5, minmax(360px, 1fr))',
            },
            gap: 2,
            mt: 1,
            width: '100%',
            alignItems: 'start',
            boxSizing: 'border-box',
            overflowX: 'hidden',
          }}
        >
          {topPhotos.length === 0 ? (
            <Box sx={{
              gridColumn: '1/-1',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              minHeight: 240,
              textAlign: 'center',
            }}>
              <Typography color="text.secondary">No top photos found.</Typography>
            </Box>
          ) : (
            topPhotos.map(photo => (
              <Box key={photo.id} sx={{ aspectRatio: '1 / 1', width: '100%', maxWidth: 360, mx: 'auto' }}>
                <Card
                  sx={{ borderRadius: 3, boxShadow: 2, height: '100%', width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'stretch', cursor: 'pointer' }}
                  onClick={() => navigate(`/species/${photo.species_id}`)}
                  title={`View all photos for ${photo.species_name}`}
                >
                  <Box sx={{ position: 'relative', width: '100%', height: 0, paddingTop: '100%' }}>
                    <SupabaseImage
                      path={photo.thumbnail_url || photo.url}
                      alt={photo.species_name || 'Bird'}
                      style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        width: '100%',
                        height: '100%',
                        objectFit: 'cover',
                        borderRadius: 8,
                        background: '#222',
                      }}
                    />
                  </Box>
                  <CardContent sx={{ p: 1, flexGrow: 1 }}>
                    <Typography variant="subtitle1" fontWeight={600} align="center" noWrap>
                      {photo.species_name}
                    </Typography>
                  </CardContent>
                </Card>
              </Box>
            ))
          )}
        </Box>
      )}
    </Box>
  );
};

export default PhotoGridPage;
