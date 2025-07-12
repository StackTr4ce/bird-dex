import { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Avatar,
  Chip,
  CircularProgress,
  Stack,
  Divider,
} from '@mui/material';
import {
  EmojiEvents as TrophyIcon,
  RemoveRedEye as EyeIcon,
} from '@mui/icons-material';
import { supabase } from '../supabaseClient';
import { useAuth } from '../components/AuthProvider';

interface LeaderboardEntry {
  user_id: string;
  display_name: string;
  // email: string; // removed, not available in public view
  unique_species: number;
  total_photos: number;
  rank: number;
}

const LeaderboardPage = () => {
  const { user } = useAuth();
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [userRank, setUserRank] = useState<number | null>(null);

  const fetchLeaderboard = async () => {
    setLoading(true);
    try {
      // Get all user profiles
      const { data: profiles, error: profilesError } = await supabase
        .from('user_profiles_public')
        .select('user_id, display_name');

      if (profilesError) throw profilesError;
      if (!profiles || profiles.length === 0) {
        setLeaderboard([]);
        setLoading(false);
        return;
      }

      // Get all top_species (unique species per user)
      const { data: topSpecies, error: topSpeciesError } = await supabase
        .from('top_species')
        .select('user_id, species_id');
      if (topSpeciesError) throw topSpeciesError;

      // Get all photos not hidden from feed (for total photo count)
      const { data: photos, error: photosError } = await supabase
        .from('photos')
        .select('user_id')
        .eq('hidden_from_feed', false);
      if (photosError) throw photosError;

      // Calculate stats for each user
      const userStats = new Map<string, { uniqueSpecies: Set<string>, totalPhotos: number }>();
      profiles.forEach(profile => {
        userStats.set(profile.user_id, {
          uniqueSpecies: new Set<string>(),
          totalPhotos: 0
        });
      });

      // Count unique species from top_species
      topSpecies?.forEach(row => {
        const stats = userStats.get(row.user_id);
        if (stats) {
          stats.uniqueSpecies.add(row.species_id);
        }
      });

      // Count total photos from photos table
      photos?.forEach(photo => {
        const stats = userStats.get(photo.user_id);
        if (stats) {
          stats.totalPhotos++;
        }
      });

      // Create leaderboard entries
      const leaderboardData: LeaderboardEntry[] = profiles.map(profile => {
        const stats = userStats.get(profile.user_id);
        return {
          user_id: profile.user_id,
          display_name: profile.display_name,
          unique_species: stats?.uniqueSpecies.size || 0,
          total_photos: stats?.totalPhotos || 0,
          rank: 0, // Will be set after sorting
        };
      });

      // Sort by unique species (descending), then by total photos (descending)
      leaderboardData.sort((a, b) => {
        if (b.unique_species !== a.unique_species) {
          return b.unique_species - a.unique_species;
        }
        return b.total_photos - a.total_photos;
      });

      // Assign ranks
      leaderboardData.forEach((entry, index) => {
        entry.rank = index + 1;
      });

      setLeaderboard(leaderboardData);

      // Find current user's rank
      if (user) {
        const currentUserEntry = leaderboardData.find(entry => entry.user_id === user.id);
        setUserRank(currentUserEntry?.rank || null);
      }

    } catch (error) {
      console.error('Error fetching leaderboard:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLeaderboard();
  }, [user]);

  const getRankDisplay = (rank: number) => {
    switch (rank) {
      case 1:
        return { icon: <TrophyIcon sx={{ color: '#FFD700', fontSize: 20 }} />, text: '1st', color: '#FFD700' };
      case 2:
        return { icon: <TrophyIcon sx={{ color: '#C0C0C0', fontSize: 20 }} />, text: '2nd', color: '#C0C0C0' };
      case 3:
        return { icon: <TrophyIcon sx={{ color: '#CD7F32', fontSize: 20 }} />, text: '3rd', color: '#CD7F32' };
      default:
        return { icon: null, text: `#${rank}`, color: 'text.primary' };
    }
  };

  const LeaderboardEntry = ({ entry, index }: { entry: LeaderboardEntry, index: number }) => {
    const rankDisplay = getRankDisplay(entry.rank);
    const isCurrentUser = entry.user_id === user?.id;

    return (
      <Box>
        <Box 
          sx={{ 
            p: 2
          }}
        >
          <Stack direction="row" alignItems="center" spacing={2} sx={{ width: '100%' }}>
            {/* Rank */}
            <Box sx={{ minWidth: 50, textAlign: 'center' }}>
              {rankDisplay.icon && (
                <Box sx={{ mb: 0.5 }}>
                  {rankDisplay.icon}
                </Box>
              )}
              <Typography variant="body2" fontWeight={700} color={rankDisplay.color}>
                {rankDisplay.text}
              </Typography>
            </Box>
            
            {/* User Info */}
            <Box sx={{ flexGrow: 1, minWidth: 0 }}>
              <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1 }}>
                <Avatar sx={{ bgcolor: 'primary.main', width: 36, height: 36 }}>
                  {entry.display_name.charAt(0).toUpperCase()}
                </Avatar>
                <Box sx={{ flexGrow: 1, minWidth: 0 }}>
                  <Typography 
                    variant="subtitle2" 
                    fontWeight={600}
                    sx={{ 
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                      textAlign: 'left'
                    }}
                  >
                    {entry.display_name}
                    {isCurrentUser && (
                      <Chip 
                        label="You" 
                        size="small" 
                        color="primary" 
                        sx={{ ml: 1, fontSize: '0.7rem', height: 18 }}
                      />
                    )}
                  </Typography>
                </Box>
              </Stack>
              
              {/* Stats */}
              <Stack direction="row" spacing={3}>
                <Box>
                  <Typography variant="caption" color="text.secondary" display="block">
                    Species
                  </Typography>
                  <Chip 
                    label={entry.unique_species}
                    color={entry.unique_species > 0 ? 'success' : 'default'}
                    variant="outlined"
                    size="small"
                    sx={{ fontSize: '0.75rem', height: 20 }}
                  />
                </Box>
                <Box>
                  <Typography variant="caption" color="text.secondary" display="block">
                    Photos
                  </Typography>
                  <Typography variant="body2" fontWeight={500} sx={{ mt: 0.25 }}>
                    {entry.total_photos}
                  </Typography>
                </Box>
              </Stack>
            </Box>
          </Stack>
        </Box>
        {index < leaderboard.length - 1 && <Divider sx={{ mx: 2 }} />}
      </Box>
    );
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 400 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ 
      width: '100%',
      maxWidth: 600,
      mx: 'auto', 
      p: 2,
      boxSizing: 'border-box'
    }}>
      {/* Header */}
      <Box sx={{ mb: 3, textAlign: 'center' }}>
        <Typography variant="h4" fontWeight={700} gutterBottom>
          Leaderboard
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0.5 }}>
          Rankings by unique bird species
          <EyeIcon sx={{ fontSize: 16 }} />
        </Typography>
      </Box>

      {/* User's Current Rank */}
      {user && userRank && (
        <Card sx={{ mb: 3, bgcolor: 'primary.main', color: 'primary.contrastText' }}>
          <CardContent sx={{ py: 2 }}>
            <Stack direction="row" alignItems="center" spacing={2}>
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                {getRankDisplay(userRank).icon || (
                  <Typography variant="h6" fontWeight={700}>
                    #{userRank}
                  </Typography>
                )}
              </Box>
              <Box sx={{ flexGrow: 1 }}>
                <Typography variant="subtitle1" fontWeight={600}>
                  Your Rank: {getRankDisplay(userRank).text}
                </Typography>
              </Box>
              <Chip 
                label={`${leaderboard.find(entry => entry.user_id === user.id)?.unique_species || 0} species`}
                sx={{ 
                  bgcolor: 'primary.light',
                  color: 'primary.contrastText',
                  fontSize: '0.75rem'
                }}
              />
            </Stack>
          </CardContent>
        </Card>
      )}

      {/* Leaderboard */}
      {leaderboard.length === 0 ? (
        <Card>
          <CardContent sx={{ py: 4, textAlign: 'center' }}>
            <Typography variant="body1" color="text.secondary">
              No users found. Start uploading photos to appear on the leaderboard!
            </Typography>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent sx={{ p: 0 }}>
            {leaderboard.map((entry, index) => (
              <LeaderboardEntry key={entry.user_id} entry={entry} index={index} />
            ))}
          </CardContent>
        </Card>
      )}

      {/* Footer */}
      <Box sx={{ mt: 3, textAlign: 'center' }}>
        <Typography variant="caption" color="text.secondary" sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0.5 }}>
          <EyeIcon sx={{ fontSize: 14 }} />
          Only photos visible in the "dex" are counted
        </Typography>
      </Box>
    </Box>
  );
};

export default LeaderboardPage;
