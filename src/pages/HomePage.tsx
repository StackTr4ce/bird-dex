import { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Button,
  Chip,
  CircularProgress,
} from '@mui/material';
import {
  PhotoLibrary as PhotoLibraryIcon,
  EmojiEvents as TrophyIcon,
  DynamicFeed as FeedIcon,
} from '@mui/icons-material';
import Tooltip from '@mui/material/Tooltip';
import Avatar from '@mui/material/Avatar';
import rewardStarGold from '../assets/reward-star.svg';
import rewardStarSilver from '../assets/reward-star-silver.svg';
interface UserAward {
  quest_id: string;
  quest_name: string;
  quest_description: string;
  quest_date: string;
  type: 'top10' | 'participation';
  top10_award_url?: string;
  participation_award_url?: string;
}
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
  const [userAwards, setUserAwards] = useState<UserAward[]>([]);
  const [awardsLoading, setAwardsLoading] = useState(false);
  const [awardPage, setAwardPage] = useState(0);
  const AWARDS_PER_PAGE = 1;
  // Fetch user quest awards
  const fetchUserAwards = async () => {
    setAwardsLoading(true);
    if (!user) return;
    // Get all quests
    const { data: quests } = await supabase.from('quests').select('*');
    // Get all quest_entries for this user
    const { data: entries } = await supabase.from('quest_entries').select('quest_id,created_at').eq('user_id', user.id);
    if (!entries || !quests) {
      setUserAwards([]);
      return;
    }
    const now = new Date();
    const awards: UserAward[] = [];
    for (const entry of entries) {
      const quest = quests.find((q: any) => q.id === entry.quest_id);
      if (!quest) continue;
      // Only show awards for quests that have ended
      if (new Date(quest.end_time) > now) continue;
      // Get all entries for this quest
      const { data: allEntries } = await supabase.from('quest_entries').select('id,user_id,quest_id').eq('quest_id', quest.id);
      // Get winner (by votes, fallback to created_at)
      let top10Ids: string[] = [];
      if (allEntries && allEntries.length > 0) {
        // Get votes for each entry
        const entryIds = allEntries.map((e: any) => e.id);
        const { data: votes } = await supabase.from('quest_votes').select('entry_id').in('entry_id', entryIds);
        const voteCounts: Record<string, number> = {};
        (votes || []).forEach((v: any) => {
          voteCounts[v.entry_id] = (voteCounts[v.entry_id] || 0) + 1;
        });
        // Sort entries by votes desc, then created_at asc
        const sorted = [...allEntries].sort((a: any, b: any) => {
          const va = voteCounts[a.id] || 0;
          const vb = voteCounts[b.id] || 0;
          if (vb !== va) return vb - va;
          return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
        });
        top10Ids = sorted.length > 0 ? [sorted[0].user_id] : [];
      }
      // Show winner or participation award for ended quests
      const type = top10Ids.includes(user.id) ? 'top10' : 'participation';
      awards.push({
        quest_id: quest.id,
        quest_name: quest.name,
        quest_description: quest.description,
        quest_date: quest.end_time,
        type,
        top10_award_url: quest.top10_award_url,
        participation_award_url: quest.participation_award_url,
      });
    }
    setUserAwards(awards);
    setAwardsLoading(false);
  };

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
      await Promise.all([fetchUserStats(), fetchRecentFeedPhotos(), fetchUserAwards()]);
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
          Click "Login" in the navigation to get started.
        </Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ maxWidth: 1200, mx: 'auto', p: { xs: 2, sm: 3 } }}>
      {/* Top Row - Stats and Awards */}
      <Box sx={{ 
        display: 'grid', 
        gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, 
        gap: 3, 
        mb: 3 
      }}>
        {/* User Score & Photo Grid */}
        <Card elevation={2} sx={{ height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'stretch' }}>
          <CardContent sx={{ display: 'flex', flexDirection: 'column', height: '100%', p: 2 }}>
            {/* Title Row */}
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2, minHeight: 40 }}>
              <PhotoLibraryIcon sx={{ mr: 1, color: 'primary.main' }} />
              <Typography variant="h6" fontWeight={600}>
                Your Collection
              </Typography>
            </Box>
            {/* Content */}
            <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', mb: 2 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 2 }}>
                <Box sx={{ textAlign: 'center', flex: 1, p: 1 }}>
                  <Typography variant="h3" fontWeight={700} color="primary.main">
                    {userStats.uniqueSpecies}
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                    Unique Species
                  </Typography>
                </Box>
                <Box sx={{ textAlign: 'center', flex: 1, p: 1 }}>
                  <Typography variant="h3" fontWeight={700} color="secondary.main">
                    {userStats.totalPhotos}
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                    Total Photos
                  </Typography>
                </Box>
              </Box>
            </Box>
            {/* Button Row (bottom aligned) */}
            <Box sx={{ display: 'flex', alignItems: 'center', mt: 'auto', minHeight: 40 }}>
              <Button
                variant="contained"
                fullWidth
                startIcon={<PhotoLibraryIcon />}
                onClick={() => navigate('/grid')}
              >
                View Photo Grid
              </Button>
            </Box>
          </CardContent>
        </Card>

        {/* Awards Section */}
        <Card elevation={2} sx={{ height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'stretch' }}>
          <CardContent sx={{ display: 'flex', flexDirection: 'column', height: '100%', p: 2 }}>
            {/* Title Row */}
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2, minHeight: 40 }}>
              <TrophyIcon sx={{ mr: 1, color: 'warning.main' }} />
              <Typography variant="h6" fontWeight={600}>
                Your Awards
              </Typography>
            </Box>
            {/* Content */}
            <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', mb: 2 }}>
              {/* Fixed height box to prevent resizing after loading */}
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, justifyContent: 'center', py: 2, minHeight: 90, alignItems: 'center' }}>
                {awardsLoading ? (
                  <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: 50, height: 50, justifyContent: 'center' }}>
                    <CircularProgress size={36} sx={{ mb: 1 }} />
                    <Typography variant="body2" color="text.secondary">Loading awards…</Typography>
                  </Box>
                ) : userAwards.length === 0 ? (
                  <Box sx={{ textAlign: 'center', width: 50, height: 50, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                    <Typography variant="body2" color="text.secondary">
                      No awards yet
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      Participate in quests to earn awards!
                    </Typography>
                  </Box>
                ) : (
                  userAwards
                    .slice(awardPage * AWARDS_PER_PAGE, awardPage * AWARDS_PER_PAGE + AWARDS_PER_PAGE)
                    .map((award, idx) => {
                      let imgSrc = award.type === 'top10'
                        ? (award.top10_award_url || rewardStarGold)
                        : (award.participation_award_url || rewardStarSilver);
                      return (
                        <Tooltip key={award.quest_id + idx} title={<>
                          <Typography variant="subtitle2" fontWeight={700}>{award.quest_name}</Typography>
                          <Typography variant="caption" color={award.type === 'top10' ? 'warning.main' : 'text.secondary'}>
                            {award.type === 'top10' ? 'Winner Award' : 'Participation Award'}
                          </Typography><br/>
                          <Typography variant="caption">{award.quest_description}</Typography><br/>
                          <Typography variant="caption">{new Date(award.quest_date).toLocaleDateString()}</Typography>
                        </>} arrow>
                          <Avatar
                            src={imgSrc}
                            alt={award.type === 'top10' ? 'Winner Award' : 'Participation Award'}
                            sx={{ width: 50, height: 50, cursor: 'pointer', border: award.type === 'top10' ? '2px solid #FFD700' : '2px solid #B0BEC5', boxShadow: 2, background: 'transparent' }}
                            onClick={() => navigate(`/quests/${award.quest_id}`)}
                          />
                        </Tooltip>
                      );
                    })
                )}
              </Box>
              {/* Pagination Controls */}
              {userAwards.length > AWARDS_PER_PAGE && (
                <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 1, mt: 0.5 }}>
                  <Button
                    size="small"
                    variant="text"
                    sx={{ minWidth: 0, px: 1, fontSize: 20, lineHeight: 1 }}
                    disabled={awardPage === 0}
                    onClick={() => setAwardPage(p => Math.max(0, p - 1))}
                  >
                    ‹
                  </Button>
                  <Typography variant="caption" sx={{ minWidth: 24, textAlign: 'center' }}>
                    {awardPage + 1}/{Math.ceil(userAwards.length / AWARDS_PER_PAGE)}
                  </Typography>
                  <Button
                    size="small"
                    variant="text"
                    sx={{ minWidth: 0, px: 1, fontSize: 20, lineHeight: 1 }}
                    disabled={awardPage >= Math.ceil(userAwards.length / AWARDS_PER_PAGE) - 1}
                    onClick={() => setAwardPage(p => Math.min(Math.ceil(userAwards.length / AWARDS_PER_PAGE) - 1, p + 1))}
                  >
                    ›
                  </Button>
                </Box>
              )}
            </Box>
            {/* Button Row (bottom aligned) */}
            <Box sx={{ display: 'flex', alignItems: 'center', mt: 'auto', minHeight: 40 }}>
              <Button
                variant="outlined"
                fullWidth
                onClick={() => navigate('/quests')}
              >
                View Quests
              </Button>
            </Box>
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
