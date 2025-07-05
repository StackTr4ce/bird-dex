
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { useAuth } from '../components/AuthProvider';
import {
  Box,
  Typography,
  Chip,
  IconButton,
  Tooltip,
  useTheme,
  useMediaQuery,
  Skeleton,
} from '@mui/material';
import {
  Visibility as VisibilityIcon,
  PhotoCamera as PhotoCameraIcon,
  Star as StarIcon,
} from '@mui/icons-material';
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
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const isTablet = useMediaQuery(theme.breakpoints.down('md'));
  const isLarge = useMediaQuery(theme.breakpoints.up('xl'));
  const isUltraWide = useMediaQuery('(min-width: 3840px)');
  const [topPhotos, setTopPhotos] = useState<TopPhoto[]>([]);
  const [loading, setLoading] = useState(true);

  // User's score = number of unique species with a top photo
  const score = topPhotos.length;

  // Calculate grid columns based on screen size - optimized for squares
  const getGridColumns = () => {
    if (isMobile) return 2;
    if (isTablet) return 3;
    if (isUltraWide) return 12; // 12 columns for ultra-wide screens (3840px+)
    if (isLarge) return 8; // 8 columns for extra large screens (1920px+)
    return 5; // 5 columns for large desktop screens
  };

  useEffect(() => {
    if (!user) return;
    const fetchTopPhotos = async () => {
      setLoading(true);
      // Fetch the user's top photo for each species
      const { data, error } = await supabase
        .from('photos')
        .select('id,url,thumbnail_url,species_id,user_id,created_at')
        .eq('user_id', user.id)
        .eq('is_top', true)
        .order('species_id', { ascending: true });
      
      if (error) {
        setTopPhotos([]);
      } else {
        // Use species_id as the name if species_name is not present
        setTopPhotos((data || []).map((p: any) => ({
          ...p,
          species_name: p.species_id || '',
        })));
      }
      setLoading(false);
    };
    fetchTopPhotos();
  }, [user]);

  if (loading) {
    return (
      <Box sx={{ 
        width: '95%', 
        mx: 'auto', 
        p: { xs: 1, sm: 2 },
        mt: 2,
      }}>
        <Skeleton variant="text" width={300} height={60} sx={{ mb: 2 }} />
        <Skeleton variant="text" width={150} height={30} sx={{ mb: 4 }} />
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: `repeat(${getGridColumns()}, 1fr)`,
            gap: 1,
            width: '100%',
          }}
        >
          {Array.from({ length: 12 }).map((_, index) => (
            <Skeleton
              key={index}
              variant="rectangular"
              sx={{
                aspectRatio: '1',
                borderRadius: 2,
                width: '100%',
              }}
            />
          ))}
        </Box>
      </Box>
    );
  }

  return (
    <Box sx={{ 
      width: '95%', 
      mx: 'auto', 
      p: { xs: 1, sm: 2 },
      mt: 2,
    }}>
      {/* Header Section */}
      <Box sx={{ mb: 4 }}>
        <Typography 
          variant="h4" 
          fontWeight="bold" 
          gutterBottom
          sx={{ fontSize: { xs: '1.8rem', sm: '2.125rem' } }}
        >
          My Bird Collection
        </Typography>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
          <Chip
            icon={<StarIcon />}
            label={`${score} Species Collected`}
            color="primary"
            variant="filled"
            sx={{ fontWeight: 600 }}
          />
        </Box>
      </Box>

      {/* Photo Grid */}
      {topPhotos.length === 0 ? (
        <Box sx={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: 400,
          textAlign: 'center',
          borderRadius: 3,
          border: `2px dashed ${theme.palette.divider}`,
          p: 4,
        }}>
          <PhotoCameraIcon sx={{ fontSize: 80, color: 'text.secondary', mb: 2 }} />
          <Typography variant="h5" color="text.secondary" gutterBottom>
            No photos in your collection yet
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Start uploading photos to build your amazing bird collection!
          </Typography>
        </Box>
      ) : (
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: `repeat(${getGridColumns()}, 1fr)`,
            gap: 1,
            width: '100%',
          }}
        >
          {topPhotos.map((photo) => (
            <Box
              key={photo.id}
              sx={{
                position: 'relative',
                aspectRatio: '1',
                borderRadius: 2,
                overflow: 'hidden',
                cursor: 'pointer',
                transition: 'all 0.2s ease-in-out',
                '&:hover': {
                  transform: 'scale(1.02)',
                  '& .photo-overlay': {
                    opacity: 1,
                  },
                  '& .species-label': {
                    transform: 'translateY(0)',
                  }
                }
              }}
              onClick={() => navigate(`/species/${photo.species_id}`)}
            >
              <SupabaseImage
                path={photo.thumbnail_url || photo.url}
                alt={photo.species_name || 'Bird'}
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover',
                }}
              />
              
              {/* Photo Overlay */}
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
                  justifyContent: 'space-between',
                  p: 1.5,
                }}
              >
                <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
                  <Tooltip title="View all photos of this species">
                    <IconButton 
                      size="small"
                      sx={{ 
                        bgcolor: 'rgba(255,255,255,0.9)', 
                        '&:hover': { bgcolor: 'white' },
                        width: 32,
                        height: 32,
                        color: '#616161', // Lighter gray color for the icon
                      }}
                    >
                      <VisibilityIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                </Box>
                
                <Box>
                  <Typography 
                    variant="body2" 
                    className="species-label"
                    sx={{
                      color: 'white',
                      fontWeight: 600,
                      textShadow: '0 1px 3px rgba(0,0,0,0.5)',
                      transform: 'translateY(10px)',
                      transition: 'transform 0.2s ease',
                      fontSize: { xs: '0.75rem', sm: '0.875rem' },
                      lineHeight: 1.2,
                    }}
                  >
                    {photo.species_name}
                  </Typography>
                </Box>
              </Box>
            </Box>
          ))}
        </Box>
      )}
    </Box>
  );
};

export default PhotoGridPage;
