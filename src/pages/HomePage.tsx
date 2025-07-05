import { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Button,
  Chip,
} from '@mui/material';
import {
  PhotoLibrary as PhotoLibraryIcon,
  EmojiEvents as TrophyIcon,
  DynamicFeed as FeedIcon,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { useAuth } from '../components/AuthProvider';
import SupabaseImage from '../components/SupabaseImage';

interface UserStats {
  uniqueSpecies: number;
  totalPhotos: number;
}

interface FeedPhoto {
  id: string;
  url: string;
  thumbnail_url?: string;
  species_id: string;
  user_id: string;
  created_at: string;
  user_profile: {
    display_name: string;
  };
}

const HomePage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [userStats, setUserStats] = useState<UserStats>({ uniqueSpecies: 0, totalPhotos: 0 });
  const [recentFeedPhotos, setRecentFeedPhotos] = useState<FeedPhoto[]>([]);

  // Fetch user stats
  const fetchUserStats = async () => {
    if (!user) return;

    try {
      const { data: photos } = await supabase
        .from('photos')
        .select('species_id')
        .eq('user_id', user.id);

      const uniqueSpecies = new Set(photos?.map(p => p.species_id) || []).size;
      const totalPhotos = photos?.length || 0;

      setUserStats({ uniqueSpecies, totalPhotos });
    } catch (error) {
      console.error('Error fetching user stats:', error);
    }
  };

  // Fetch recent feed photos (friends' uploads)
  const fetchRecentFeedPhotos = async () => {
    if (!user) return;

    try {
      // Get user's friends
      const { data: friendships } = await supabase
        .from('friendships')
        .select('requester, addressee')
        .or(`requester.eq.${user.id},addressee.eq.${user.id}`)
        .eq('status', 'accepted');

      if (!friendships || friendships.length === 0) {
        setRecentFeedPhotos([]);
        return;
      }

      const friendIds = friendships.map(friendship => 
        friendship.requester === user.id ? friendship.addressee : friendship.requester
      );

      // Fetch recent photos from friends
      const { data: feedPhotos } = await supabase
        .from('photos')
        .select('id, url, thumbnail_url, species_id, user_id, created_at')
        .in('user_id', friendIds)
        .in('privacy', ['public', 'friends'])
        .order('created_at', { ascending: false })
        .limit(6);

      if (feedPhotos && feedPhotos.length > 0) {
        // Get user profiles for the photo owners
        const userIds = [...new Set(feedPhotos.map(p => p.user_id))];
        const { data: userProfiles } = await supabase
          .from('user_profiles')
          .select('user_id, display_name')
          .in('user_id', userIds);

        // Create a map for quick user profile lookup
        const userProfilesMap = userProfiles?.reduce((acc, profile) => {
          acc[profile.user_id] = profile;
          return acc;
        }, {} as {[key: string]: any}) || {};

        const transformedPhotos: FeedPhoto[] = feedPhotos.map(photo => {
          const userProfile = userProfilesMap[photo.user_id];
          return {
            ...photo,
            user_profile: {
              display_name: userProfile?.display_name || 'Unknown User',
            },
          };
        });

        setRecentFeedPhotos(transformedPhotos);
      } else {
        setRecentFeedPhotos([]);
      }
    } catch (error) {
      console.error('Error fetching feed photos:', error);
    }
  };

  // Format relative time
  const formatRelativeTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));
    
    if (diffInHours < 1) return 'Just now';
    if (diffInHours < 24) return `${diffInHours}h ago`;
    if (diffInHours < 48) return 'Yesterday';
    return date.toLocaleDateString();
  };

  useEffect(() => {
    const loadData = async () => {
      await Promise.all([fetchUserStats(), fetchRecentFeedPhotos()]);
    };

    if (user) {
      loadData();
    }
  }, [user]);

  if (!user) {
    return (
      <Box sx={{ maxWidth: 800, mx: 'auto', p: { xs: 2, sm: 3 }, textAlign: 'center' }}>
        <Typography variant="h3" fontWeight={700} gutterBottom>
          Welcome to BirdDex
        </Typography>
        <Typography variant="h6" color="text.secondary" gutterBottom>
          Your bird photo collection and leaderboard hub
        </Typography>
        <Typography variant="body1" color="text.secondary" sx={{ mt: 3, mb: 4 }}>
          Join the community of bird photographers! Upload your photos, compete with friends, 
          and discover amazing bird species from around the world.
        </Typography>
        <Box sx={{ 
          display: 'grid', 
          gridTemplateColumns: { xs: '1fr', md: 'repeat(3, 1fr)' }, 
          gap: 3, 
          mt: 4 
        }}>
          <Box sx={{ p: 3, bgcolor: 'grey.900', borderRadius: 2 }}>
            <Typography variant="h6" fontWeight={600} gutterBottom>
              📸 Photo Collection
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Upload and organize your bird photos with species identification
            </Typography>
          </Box>
          <Box sx={{ p: 3, bgcolor: 'grey.900', borderRadius: 2 }}>
            <Typography variant="h6" fontWeight={600} gutterBottom>
              🏆 Compete & Leaderboard
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Compete with friends and climb the global leaderboard
            </Typography>
          </Box>
          <Box sx={{ p: 3, bgcolor: 'grey.900', borderRadius: 2 }}>
            <Typography variant="h6" fontWeight={600} gutterBottom>
              🔥 Photo Quests
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Participate in community photo challenges and win awards
            </Typography>
          </Box>
        </Box>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 4 }}>
          Click "Login" in the navigation to get started!
        </Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ maxWidth: 1200, mx: 'auto', p: { xs: 2, sm: 3 } }}>
      <Typography variant="h4" fontWeight={700} gutterBottom>
        Welcome back!
      </Typography>

      {/* Top Row - Stats and Awards */}
      <Box sx={{ 
        display: 'grid', 
        gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, 
        gap: 3, 
        mb: 3 
      }}>
        {/* User Score & Photo Grid */}
        <Card elevation={2}>
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
              <PhotoLibraryIcon sx={{ mr: 1, color: 'primary.main' }} />
              <Typography variant="h6" fontWeight={600}>
                Your Collection
              </Typography>
            </Box>
            
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
              <Box sx={{ textAlign: 'center' }}>
                <Typography variant="h3" fontWeight={700} color="primary.main">
                  {userStats.uniqueSpecies}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Unique Species
                </Typography>
              </Box>
              <Box sx={{ textAlign: 'center' }}>
                <Typography variant="h3" fontWeight={700} color="secondary.main">
                  {userStats.totalPhotos}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Total Photos
                </Typography>
              </Box>
            </Box>

            <Button
              variant="contained"
              fullWidth
              startIcon={<PhotoLibraryIcon />}
              onClick={() => navigate('/grid')}
            >
              View Photo Grid
            </Button>
          </CardContent>
        </Card>

        {/* Awards Section (Placeholder) */}
        <Card elevation={2}>
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
              <TrophyIcon sx={{ mr: 1, color: 'warning.main' }} />
              <Typography variant="h6" fontWeight={600}>
                Your Awards
              </Typography>
            </Box>
            
            <Box sx={{ textAlign: 'center', py: 3 }}>
              <Typography variant="body2" color="text.secondary">
                No awards yet
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Participate in quests to earn awards!
              </Typography>
            </Box>

            <Button
              variant="outlined"
              fullWidth
              onClick={() => navigate('/quests')}
            >
              View Quests
            </Button>
          </CardContent>
        </Card>
      </Box>

      {/* Photo Feed */}
      <Card elevation={2}>
        <CardContent>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              <FeedIcon sx={{ mr: 1, color: 'info.main' }} />
              <Typography variant="h6" fontWeight={600}>
                Recent from Friends
              </Typography>
            </Box>
            <Button
              size="small"
              onClick={() => navigate('/feed')}
            >
              View All
            </Button>
          </Box>

          {recentFeedPhotos.length === 0 ? (
            <Box sx={{ textAlign: 'center', py: 3 }}>
              <Typography variant="body2" color="text.secondary">
                No recent photos from friends
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Add some friends to see their photos here!
              </Typography>
              <Button
                variant="outlined"
                size="small"
                onClick={() => navigate('/friends')}
                sx={{ mt: 1 }}
              >
                Find Friends
              </Button>
            </Box>
          ) : (
            <Box sx={{ 
              display: 'grid', 
              gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', 
              gap: 2 
            }}>
              {recentFeedPhotos.map((photo) => (
                <Box key={photo.id}>
                  <Box
                    sx={{
                      position: 'relative',
                      aspectRatio: '1',
                      borderRadius: 1,
                      overflow: 'hidden',
                      cursor: 'pointer',
                    }}
                    onClick={() => navigate('/feed')}
                  >
                    <SupabaseImage
                      path={photo.thumbnail_url || photo.url}
                      alt={`${photo.species_id} by ${photo.user_profile.display_name}`}
                      style={{
                        width: '100%',
                        height: '100%',
                        objectFit: 'cover',
                      }}
                    />
                  </Box>
                  <Box sx={{ mt: 1 }}>
                    <Typography variant="caption" display="block" fontWeight={600}>
                      {photo.user_profile.display_name}
                    </Typography>
                    <Chip
                      label={photo.species_id}
                      size="small"
                      sx={{ fontSize: '0.6rem', height: 16 }}
                    />
                    <Typography variant="caption" display="block" color="text.secondary">
                      {formatRelativeTime(photo.created_at)}
                    </Typography>
                  </Box>
                </Box>
              ))}
            </Box>
          )}
        </CardContent>
      </Card>
    </Box>
  );
};

export default HomePage;
