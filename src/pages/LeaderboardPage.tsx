import { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Stack,
  Divider,
  useTheme,
  useMediaQuery,
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
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
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
        return {
          icon: <TrophyIcon sx={{ color: '#FFD700', fontSize: 24 }} />,
          text: '1st',
          color: '#FFD700'
        };
      case 2:
        return {
          icon: <TrophyIcon sx={{ color: '#C0C0C0', fontSize: 24 }} />,
          text: '2nd',
          color: '#C0C0C0'
        };
      case 3:
        return {
          icon: <TrophyIcon sx={{ color: '#CD7F32', fontSize: 24 }} />,
          text: '3rd',
          color: '#CD7F32'
        };
      default:
        return {
          icon: null,
          text: `${rank}${getOrdinalSuffix(rank)}`,
          color: theme.palette.text.primary
        };
    }
  };

  const getOrdinalSuffix = (num: number) => {
    const j = num % 10;
    const k = num % 100;
    if (j === 1 && k !== 11) return 'st';
    if (j === 2 && k !== 12) return 'nd';
    if (j === 3 && k !== 13) return 'rd';
    return 'th';
  };

  const LeaderboardCard = ({ entry, showDivider = true }: { entry: LeaderboardEntry, showDivider?: boolean }) => {
    const rankDisplay = getRankDisplay(entry.rank);
    const isCurrentUser = entry.user_id === user?.id;

    return (
      <Box>
        <Box 
          sx={{ 
            py: 2,
            px: isMobile ? 1 : 2,
            bgcolor: isCurrentUser ? 'action.selected' : 'transparent',
            borderRadius: isCurrentUser ? 1 : 0,
            transition: 'background-color 0.2s ease'
          }}
        >
          <Stack direction="row" alignItems="center" spacing={isMobile ? 1 : 2} sx={{ width: '100%' }}>
            {/* Rank */}
            <Box 
              sx={{ 
                minWidth: isMobile ? 40 : 50, 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center',
                flexDirection: 'column',
                textAlign: 'center'
              }}
            >
              {rankDisplay.icon && (
                <Box sx={{ mb: 0.5 }}>
                  {rankDisplay.icon}
                </Box>
              )}
              <Typography 
                variant={isMobile ? "body2" : "subtitle2"} 
                fontWeight={700} 
                color={rankDisplay.color}
                sx={{ fontSize: isMobile ? '0.8rem' : '0.9rem' }}
              >
                {rankDisplay.text}
              </Typography>
            </Box>
            
            {/* User Info */}
            <Stack direction="row" alignItems="center" spacing={isMobile ? 1 : 1.5} sx={{ flexGrow: 1, minWidth: 0 }}>
              <Box sx={{ flexGrow: 1, minWidth: 0 }}>
                <Stack direction={isMobile ? "column" : "row"} alignItems={isMobile ? "flex-start" : "center"} spacing={isMobile ? 0.5 : 1}>
                  <Typography 
                    variant={isMobile ? "body2" : "subtitle2"}
                    fontWeight={600}
                    sx={{ 
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                      fontSize: isMobile ? '0.85rem' : '0.95rem',
                      maxWidth: '100%'
                    }}
                  >
                    {entry.display_name}
                  </Typography>
                  {isCurrentUser && (
                    <Chip 
                      label="You" 
                      size="small" 
                      color="primary" 
                      sx={{ 
                        fontSize: '0.7rem', 
                        height: isMobile ? 18 : 20,
                        alignSelf: isMobile ? 'flex-start' : 'center'
                      }}
                    />
                  )}
                </Stack>
              </Box>
            </Stack>
            
            {/* Stats */}
            <Stack direction="row" spacing={isMobile ? 1 : 2} alignItems="center">
              {/* Species */}
              <Box sx={{ textAlign: 'center', minWidth: isMobile ? 35 : 45 }}>
                <Chip 
                  label={entry.unique_species}
                  color={entry.unique_species > 0 ? 'success' : 'default'}
                  variant="outlined"
                  size="small"
                  sx={{ 
                    fontSize: isMobile ? '0.7rem' : '0.75rem', 
                    height: isMobile ? 20 : 22,
                    minWidth: isMobile ? 30 : 35
                  }}
                />
              </Box>
              
              {/* Photos */}
              <Box sx={{ textAlign: 'center', minWidth: isMobile ? 35 : 45 }}>
                <Typography 
                  variant="body2" 
                  fontWeight={500}
                  sx={{ 
                    fontSize: isMobile ? '0.75rem' : '0.8rem',
                    lineHeight: isMobile ? '20px' : '22px'
                  }}
                >
                  {entry.total_photos}
                </Typography>
              </Box>
            </Stack>
          </Stack>
        </Box>
        {showDivider && (
          <Divider sx={{ mx: isMobile ? 1 : 2 }} />
        )}
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
      maxWidth: '100vw',
      mx: 'auto', 
      p: { xs: 1, sm: 2, md: 3 },
      boxSizing: 'border-box',
      overflowX: 'hidden'
    }}>
      {/* Header */}
      <Box sx={{ mb: 3, px: isMobile ? 1 : 0 }}>
        <Typography 
          variant={isMobile ? "h5" : "h4"} 
          fontWeight={700} 
          gutterBottom
          sx={{ fontSize: isMobile ? '1.5rem' : '2.125rem' }}
        >
          Leaderboard
        </Typography>
        <Typography 
          variant={isMobile ? "body2" : "subtitle1"} 
          color="text.secondary" 
          sx={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: 0.5,
            fontSize: isMobile ? '0.8rem' : '1rem'
          }}
        >
          Rankings based on unique bird species
          <EyeIcon sx={{ fontSize: isMobile ? 16 : 18, color: 'action.active' }} />
        </Typography>
      </Box>

      {/* User's Current Rank */}
      {user && userRank && (
        <Card sx={{ mb: 3, bgcolor: 'primary.dark', color: 'primary.contrastText' }}>
          <CardContent sx={{ py: isMobile ? 1.5 : 2, px: isMobile ? 1.5 : 2 }}>
            <Stack 
              direction="row" 
              alignItems="center" 
              spacing={isMobile ? 1 : 2}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', minWidth: isMobile ? 40 : 50 }}>
                {getRankDisplay(userRank).icon || (
                  <Typography variant="h6" fontWeight={700}>
                    #{userRank}
                  </Typography>
                )}
              </Box>
              <Box sx={{ flexGrow: 1 }}>
                <Typography 
                  variant={isMobile ? "subtitle2" : "h6"} 
                  fontWeight={600}
                  sx={{ fontSize: isMobile ? '0.9rem' : '1.25rem' }}
                >
                  Your Rank: {getRankDisplay(userRank).text}
                </Typography>
              </Box>
              <Chip 
                label={`${leaderboard.find(entry => entry.user_id === user.id)?.unique_species || 0} species`}
                variant="filled"
                sx={{ 
                  bgcolor: 'primary.light',
                  color: 'primary.contrastText',
                  fontSize: isMobile ? '0.7rem' : '0.75rem',
                  height: isMobile ? 22 : 24
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
        <Card sx={{ width: '100%' }}>
          <CardContent sx={{ p: 0 }}>
            {/* Column Headers - Only on larger screens */}
            {!isMobile && (
              <Box sx={{ px: 2, py: 1.5, bgcolor: 'grey.800', borderBottom: '1px solid', borderColor: 'divider' }}>
                <Stack direction="row" alignItems="center" spacing={2}>
                  <Box sx={{ minWidth: 50, textAlign: 'center' }}>
                    <Typography variant="caption" fontWeight={700} color="grey.300">
                      RANK
                    </Typography>
                  </Box>
                  <Box sx={{ flexGrow: 1, ml: 6 }}>
                    <Typography variant="caption" fontWeight={700} color="grey.300">
                      USER
                    </Typography>
                  </Box>
                  <Box sx={{ minWidth: 45, textAlign: 'center' }}>
                    <Typography variant="caption" fontWeight={700} color="grey.300">
                      SPECIES
                    </Typography>
                  </Box>
                  <Box sx={{ minWidth: 45, textAlign: 'center' }}>
                    <Typography variant="caption" fontWeight={700} color="grey.300">
                      PHOTOS
                    </Typography>
                  </Box>
                </Stack>
              </Box>
            )}
            
            {/* Leaderboard Entries */}
            {leaderboard.map((entry, index) => (
              <LeaderboardCard 
                key={entry.user_id} 
                entry={entry} 
                showDivider={index < leaderboard.length - 1}
              />
            ))}
          </CardContent>
        </Card>
      )}

      {/* Footer */}
      <Box sx={{ mt: 3, textAlign: 'center', px: isMobile ? 1 : 0 }}>
        <Typography 
          variant="caption" 
          color="text.secondary"
          sx={{ 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center', 
            gap: 0.5,
            fontSize: isMobile ? '0.7rem' : '0.75rem'
          }}
        >
          <EyeIcon sx={{ fontSize: 14 }} />
          Only photos visible in the "dex" are counted
        </Typography>
      </Box>
    </Box>
  );
};

export default LeaderboardPage;
