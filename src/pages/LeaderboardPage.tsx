import { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Avatar,
  Chip,
  CircularProgress,
  Stack,
  Paper,
  useTheme,
  useMediaQuery,
} from '@mui/material';
import {
  EmojiEvents as TrophyIcon,
  PhotoLibrary as PhotoIcon,
  Pets as SpeciesIcon,
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
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
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

  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1:
        return (
          <Stack direction="row" alignItems="center" spacing={0.5}>
            <TrophyIcon sx={{ color: '#FFD700' }} />
            <Typography variant="h6" fontWeight={700}>1</Typography>
          </Stack>
        );
      case 2:
        return (
          <Stack direction="row" alignItems="center" spacing={0.5}>
            <TrophyIcon sx={{ color: '#C0C0C0' }} />
            <Typography variant="h6" fontWeight={700}>2</Typography>
          </Stack>
        );
      case 3:
        return (
          <Stack direction="row" alignItems="center" spacing={0.5}>
            <TrophyIcon sx={{ color: '#CD7F32' }} />
            <Typography variant="h6" fontWeight={700}>3</Typography>
          </Stack>
        );
      default:
        return <Typography variant="h6" fontWeight={700}>{rank}</Typography>;
    }
  };

  const getRankBadgeColor = (rank: number) => {
    switch (rank) {
      case 1:
        return 'warning'; // Gold-ish
      case 2:
        return 'default'; // Silver-ish
      case 3:
        return 'secondary'; // Bronze-ish
      default:
        return 'primary';
    }
  };

  // Mobile-friendly leaderboard card component
  const MobileLeaderboardCard = ({ entry }: { entry: LeaderboardEntry }) => (
    <Card 
      key={entry.user_id}
      sx={{ 
        mb: 2,
        bgcolor: entry.user_id === user?.id ? 'action.selected' : 'inherit',
        border: entry.user_id === user?.id ? 2 : 1,
        borderColor: entry.user_id === user?.id ? 'primary.main' : 'divider',
      }}
    >
      <CardContent sx={{ py: 2 }}>
        <Stack direction="row" alignItems="center" spacing={2}>
          {/* Rank */}
          <Box sx={{ minWidth: 60, textAlign: 'center' }}>
            {getRankIcon(entry.rank)}
          </Box>
          
          {/* User Info */}
          <Box sx={{ flexGrow: 1, minWidth: 0 }}>
            <Stack direction="row" alignItems="center" spacing={1.5} sx={{ mb: 1 }}>
              <Avatar sx={{ bgcolor: 'primary.main', width: 40, height: 40 }}>
                {entry.display_name.charAt(0).toUpperCase()}
              </Avatar>
              <Box sx={{ minWidth: 0, flexGrow: 1 }}>
                <Typography 
                  variant="subtitle1" 
                  fontWeight={600}
                  sx={{ 
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                    textAlign: 'left'
                  }}
                >
                  {entry.display_name}
                  {entry.user_id === user?.id && (
                    <Chip 
                      label="You" 
                      size="small" 
                      color="primary" 
                      sx={{ ml: 1 }}
                    />
                  )}
                </Typography>
              </Box>
            </Stack>
            
            {/* Stats */}
            <Stack direction="row" spacing={3} sx={{ mt: 1 }}>
              <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', minWidth: 60 }}>
                <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 0.5 }}>
                  Species
                </Typography>
                <Chip 
                  label={entry.unique_species}
                  color={entry.unique_species > 0 ? 'success' : 'default'}
                  variant="outlined"
                  size="small"
                />
              </Box>
              <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', minWidth: 60 }}>
                <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 0.5 }}>
                  Photos
                </Typography>
                <Typography variant="body2" fontWeight={500} sx={{ lineHeight: '24px' }}>
                  {entry.total_photos}
                </Typography>
              </Box>
            </Stack>
          </Box>
        </Stack>
      </CardContent>
    </Card>
  );

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 400 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ maxWidth: 800, mx: 'auto', p: { xs: 2, sm: 3 } }}>
      <Typography align="left" variant="h4" fontWeight={700} gutterBottom>
        Leaderboard
      </Typography>
      <Typography align="left" variant="subtitle1" color="text.secondary" gutterBottom sx={{ pb: 1 }}>
        Rankings based on unique bird species photographed
        <Box component="span" sx={{ ml: 1, verticalAlign: 'middle' }}>
          <EyeIcon fontSize="small" sx={{ color: 'action.active', verticalAlign: 'middle' }} />
        </Box>
      </Typography>

      {/* User's Current Rank */}
      {user && userRank && (
        <Card sx={{ mb: 3, bgcolor: 'grey.800', border: '1px solid', borderColor: 'grey.600' }}>
          <CardContent sx={{ py: { xs: 2, md: 3 } }}>
            <Stack 
              direction={{ xs: 'column', sm: 'row' }} 
              alignItems={{ xs: 'flex-start', sm: 'center' }} 
              spacing={2}
              sx={{ textAlign: { xs: 'left', sm: 'inherit' } }}
            >
              <Avatar sx={{ bgcolor: 'grey.700', width: { xs: 48, md: 56 }, height: { xs: 48, md: 56 } }}>
                {getRankIcon(userRank)}
              </Avatar>
              <Box sx={{ flexGrow: 1, width: { xs: '100%', sm: 'auto' } }}>
                <Typography variant="h6" fontWeight={600}>
                  Your Rank: #{userRank}
                  {userRank <= 3 && (
                    <TrophyIcon 
                      sx={{ 
                        ml: 1, 
                        color: userRank === 1 ? '#FFD700' : userRank === 2 ? '#C0C0C0' : '#CD7F32' 
                      }} 
                    />
                  )}
                </Typography>
              </Box>
              <Chip 
                label={`${leaderboard.find(entry => entry.user_id === user.id)?.unique_species || 0} species`}
                color={getRankBadgeColor(userRank)}
                variant="filled"
                sx={{ alignSelf: { xs: 'flex-start', sm: 'center' } }}
              />
            </Stack>
          </CardContent>
        </Card>
      )}

      {/* Responsive Leaderboard */}
      {leaderboard.length === 0 ? (
        <Card>
          <CardContent sx={{ py: 4, textAlign: 'center' }}>
            <Typography variant="body1" color="text.secondary">
              No users found. Start uploading photos to appear on the leaderboard!
            </Typography>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Mobile View: Cards */}
          {isMobile ? (
            <Box>
              {leaderboard.map((entry) => (
                <MobileLeaderboardCard key={entry.user_id} entry={entry} />
              ))}
            </Box>
          ) : (
            /* Desktop View: Table */
            <Card>
              <TableContainer component={Paper}>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 700, minWidth: 80 }}>Rank</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>User</TableCell>
                      <TableCell align="center" sx={{ fontWeight: 700, minWidth: 100 }}>
                        <Stack direction="row" alignItems="center" justifyContent="center" spacing={0.5}>
                          <SpeciesIcon fontSize="small" />
                          <span>Species</span>
                        </Stack>
                      </TableCell>
                      <TableCell align="center" sx={{ fontWeight: 700, minWidth: 80 }}>
                        <Stack direction="row" alignItems="center" justifyContent="center" spacing={0.5}>
                          <PhotoIcon fontSize="small" />
                          <span>Photos</span>
                        </Stack>
                      </TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {leaderboard.map((entry) => (
                      <TableRow 
                        key={entry.user_id}
                        sx={{ 
                          bgcolor: entry.user_id === user?.id ? 'action.selected' : 'inherit',
                          '&:hover': { bgcolor: 'action.hover' }
                        }}
                      >
                        <TableCell>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            {getRankIcon(entry.rank)}
                          </Box>
                        </TableCell>
                        <TableCell sx={{ maxWidth: 0 }}>
                          <Stack direction="row" alignItems="center" spacing={2} sx={{ minWidth: 0 }}>
                            <Avatar sx={{ bgcolor: 'primary.main', flexShrink: 0 }}>
                              {entry.display_name.charAt(0).toUpperCase()}
                            </Avatar>
                            <Box sx={{ minWidth: 0, flexGrow: 1 }}>
                              <Typography 
                                variant="subtitle2" 
                                fontWeight={600}
                                sx={{ 
                                  overflow: 'hidden',
                                  textOverflow: 'ellipsis',
                                  whiteSpace: 'nowrap'
                                }}
                              >
                                {entry.display_name}
                                {entry.user_id === user?.id && (
                                  <Chip 
                                    label="You" 
                                    size="small" 
                                    color="primary" 
                                    sx={{ ml: 1 }}
                                  />
                                )}
                              </Typography>
                            </Box>
                          </Stack>
                        </TableCell>
                        <TableCell align="center">
                          <Chip 
                            label={entry.unique_species}
                            color={entry.unique_species > 0 ? 'success' : 'default'}
                            variant="outlined"
                          />
                        </TableCell>
                        <TableCell align="center">
                          <Typography variant="body2" fontWeight={500}>
                            {entry.total_photos}
                          </Typography>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </Card>
          )}
        </>
      )}

      {/* Footer Info */}
      <Box sx={{ mt: 3, textAlign: 'center', px: 1 }}>
        <Typography variant="body2" color="text.secondary">
          <EyeIcon fontSize="small" sx={{ color: 'action.active', verticalAlign: 'middle', mr: 0.5 }} />
          Only photos visible in the "dex" (species view) are counted. Hidden photos are excluded from the leaderboard.
        </Typography>
      </Box>
    </Box>
  );
};

export default LeaderboardPage;
