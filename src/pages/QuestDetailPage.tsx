import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Box, Typography, Paper, CircularProgress, Button, Stack, Avatar, Chip, Grid } from '@mui/material';
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents';
import { supabase } from '../supabaseClient';
import SelectPhotoModal from '../components/SelectPhotoModal';
import SupabaseImage from '../components/SupabaseImage';
import { useAuth } from '../components/AuthProvider';

interface Quest {
  id: string;
  name: string;
  description: string;
  participation_award_url: string;
  top10_award_url: string;
  start_time: string;
  end_time: string;
}



interface Entry {
  id: string;
  user_id: string;
  quest_id: string;
  photo_id: string;
  created_at: string;
}


interface UserProfile {
  user_id: string;
  display_name: string;
}

interface Photo {
  id: string;
  url: string;
  thumbnail_url?: string;
  created_at: string;
}

const QuestDetailPage = () => {
  const { questId } = useParams();
  const { user } = useAuth();
  const [quest, setQuest] = useState<Quest | null>(null);
  const [entries, setEntries] = useState<Entry[]>([]);
  const [loading, setLoading] = useState(true);
  const [votedEntryId, setVotedEntryId] = useState<string | null>(null);
  const [submittingVote, setSubmittingVote] = useState(false);
  const [showSelectModal, setShowSelectModal] = useState(false);
  const [myEntry, setMyEntry] = useState<Entry | null>(null);
  const [photoMap, setPhotoMap] = useState<Record<string, Photo>>({});
  const [userProfileMap, setUserProfileMap] = useState<Record<string, string>>({});
  const [voteCounts, setVoteCounts] = useState<Record<string, number>>({});
  const [winnerEntryId, setWinnerEntryId] = useState<string | null>(null);

  useEffect(() => {
    const fetchQuestAndEntries = async () => {
      setLoading(true);
      const { data: questData } = await supabase.from('quests').select('*').eq('id', questId).single();
      setQuest(questData);
      setWinnerEntryId(questData?.winner_entry_id ?? null);
      const { data: entriesData } = await supabase.from('quest_entries').select('*').eq('quest_id', questId);
      setEntries(entriesData || []);
      if (user) {
        const mine = (entriesData || []).find((e: Entry) => e.user_id === user.id);
        setMyEntry(mine || null);
      }
      // Fetch all photos for these entries
      const photoIds = (entriesData || []).map((e: Entry) => e.photo_id);
      if (photoIds.length > 0) {
        const { data: photosData } = await supabase.from('photos').select('id,url,thumbnail_url,created_at').in('id', photoIds);
        const map: Record<string, Photo> = {};
        (photosData || []).forEach((p: Photo) => { map[p.id] = p; });
        setPhotoMap(map);
      } else {
        setPhotoMap({});
      }
      // Fetch all user display names for these entries
      const userIds = Array.from(new Set((entriesData || []).map((e: Entry) => e.user_id)));
      if (userIds.length > 0) {
        const { data: profilesData } = await supabase
          .from('user_profiles')
          .select('user_id,display_name')
          .in('user_id', userIds);
        const profileMap: Record<string, string> = {};
        (profilesData || []).forEach((p: UserProfile) => { profileMap[p.user_id] = p.display_name; });
        setUserProfileMap(profileMap);
      } else {
        setUserProfileMap({});
      }
      // Fetch vote counts for each entry (client-side count)
      const entryIds = (entriesData || []).map((e: Entry) => e.id);
      if (entryIds.length > 0) {
        const { data: votesData } = await supabase
          .from('quest_votes')
          .select('entry_id')
          .in('entry_id', entryIds);
        const voteMap: Record<string, number> = {};
        (votesData || []).forEach((v: { entry_id: string }) => {
          voteMap[v.entry_id] = (voteMap[v.entry_id] || 0) + 1;
        });
        setVoteCounts(voteMap);
      } else {
        setVoteCounts({});
      }
      setLoading(false);
    };
    fetchQuestAndEntries();
  }, [questId, user]);

  // Fetch user's vote for this quest (if any)
  useEffect(() => {
    const fetchVote = async () => {
      if (!user || !questId) return;
      const { data } = await supabase.from('quest_votes').select('entry_id').eq('voter_id', user.id).eq('quest_id', questId).single();
      setVotedEntryId(data?.entry_id || null);
    };
    fetchVote();
  }, [user, questId]);

  const handleVote = async (entryId: string) => {
    if (!user || submittingVote) return;
    setSubmittingVote(true);
    // Upsert vote using voter_id
    await supabase.from('quest_votes').upsert({ voter_id: user.id, quest_id: questId, entry_id: entryId }, { onConflict: 'voter_id,quest_id' });
    setVotedEntryId(entryId);
    setSubmittingVote(false);
  };


  // Handle when a user selects a photo from the modal
  const handlePhotoSelect = async (photo: { id: string; url: string }) => {
    if (!user || !questId) return;
    // Insert quest entry using photo_id
    await supabase.from('quest_entries').insert({
      user_id: user.id,
      quest_id: questId,
      photo_id: photo.id,
    });
    setShowSelectModal(false);
    // Refresh entries and photos
    const { data: entriesData } = await supabase.from('quest_entries').select('*').eq('quest_id', questId);
    setEntries(entriesData || []);
    if (user) {
      const mine = (entriesData || []).find((e: Entry) => e.user_id === user.id);
      setMyEntry(mine || null);
    }
    // Fetch all photos for these entries
    const photoIds = (entriesData || []).map((e: Entry) => e.photo_id);
    if (photoIds.length > 0) {
      const { data: photosData } = await supabase.from('photos').select('id,url,thumbnail_url,created_at').in('id', photoIds);
      const map: Record<string, Photo> = {};
      (photosData || []).forEach((p: Photo) => { map[p.id] = p; });
      setPhotoMap(map);
    } else {
      setPhotoMap({});
    }
  };

  if (loading) {
    return <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 300 }}><CircularProgress /></Box>;
  }
  if (!quest) {
    return <Typography variant="h6">Quest not found.</Typography>;
  }

  // const questEnded = new Date(quest.end_time) < new Date();
  // const winnerEntry = entries.find(e => e.id === winnerEntryId);
  // winnerPhoto and winnerName are not needed for the banner anymore

  const questEnded = new Date(quest.end_time) < new Date();
  const winnerEntry = entries.find(e => e.id === winnerEntryId);
  const winnerPhoto = winnerEntry ? photoMap[winnerEntry.photo_id] : null;
  const winnerName = winnerEntry ? userProfileMap[winnerEntry.user_id] : null;

  // For past quests, show winner and user's entry at the top, then other entries
  if (questEnded) {
    // Exclude winner and user's entry from the list below
    const otherEntries = entries.filter(e => e.id !== winnerEntryId && (!myEntry || e.id !== myEntry.id));
    return (
      <Box sx={{ maxWidth: 900, mx: 'auto', p: { xs: 1, sm: 2, md: 3 } }}>
        <Typography variant="h4" fontWeight={700} gutterBottom>{quest.name}</Typography>
        <Typography variant="subtitle1" gutterBottom>{quest.description}</Typography>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ mb: 2 }}>
          {quest.top10_award_url && <Chip avatar={<Avatar src={quest.top10_award_url} />} label="Top 10 Award" />}
          {quest.participation_award_url && <Chip avatar={<Avatar src={quest.participation_award_url} />} label="Participation Award" />}
        </Stack>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          {`Start: ${new Date(quest.start_time).toLocaleString()} | End: ${new Date(quest.end_time).toLocaleString()}`}
        </Typography>
        <Grid container spacing={2} sx={{ mb: 3 }}>
          {/* Winner on the left */}
          <Grid item xs={12} md={6} lg={4}>
            {winnerEntry && winnerPhoto && (
              <Paper variant="outlined" sx={{ p: 2, border: '2.5px solid #FFD700', background: 'rgba(255,223,0,0.08)', position: 'relative', textAlign: 'center' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', mb: 1 }}>
                  <EmojiEventsIcon sx={{ color: '#FFD700', mr: 1 }} />
                  <Typography variant="h6" sx={{ color: '#FFD700', fontWeight: 700 }}>Winner</Typography>
                </Box>
                <SupabaseImage path={winnerPhoto.url} width={180} height={180} style={{ borderRadius: 8 }} />
                <Typography variant="subtitle1" sx={{ mt: 1 }}>{winnerName || 'Unknown'}</Typography>
                <Typography variant="caption" color="text.secondary">
                  {voteCounts[winnerEntry.id] || 0} vote{(voteCounts[winnerEntry.id] || 0) === 1 ? '' : 's'}
                </Typography>
              </Paper>
            )}
          </Grid>
          {/* User's entry on the right */}
          <Grid item xs={12} md={6} lg={8}>
            {myEntry && photoMap[myEntry.photo_id] && (
              <Paper variant="outlined" sx={{ p: 2, background: 'rgba(0,0,0,0.04)', textAlign: 'center' }}>
                <Typography variant="subtitle1" color="primary">Your Entry</Typography>
                <SupabaseImage path={photoMap[myEntry.photo_id].url} width={180} height={180} style={{ borderRadius: 8, marginTop: 8 }} />
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
                  {voteCounts[myEntry.id] || 0} vote{(voteCounts[myEntry.id] || 0) === 1 ? '' : 's'}
                </Typography>
              </Paper>
            )}
          </Grid>
        </Grid>
        <Typography variant="h6" sx={{ mt: 2, mb: 1 }}>Other Entries</Typography>
        <Grid container spacing={2}>
          {otherEntries.map(entry => (
            photoMap[entry.photo_id] && (
              <Grid item xs={12} sm={6} md={4} key={entry.id}>
                <Paper
                  variant="outlined"
                  sx={{
                    p: 2,
                    textAlign: 'center',
                    border: votedEntryId === entry.id ? '2.5px solid #1976d2' : undefined,
                    background: votedEntryId === entry.id ? 'rgba(25,118,210,0.08)' : undefined,
                    position: 'relative',
                  }}
                >
                  <SupabaseImage path={photoMap[entry.photo_id].url} width={160} height={160} style={{ borderRadius: 8 }} />
                  <Box sx={{ mt: 1, mb: 1 }}>
                    <Typography variant="subtitle2">
                      {userProfileMap[entry.user_id] || 'Unknown User'}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {voteCounts[entry.id] || 0} vote{(voteCounts[entry.id] || 0) === 1 ? '' : 's'}
                    </Typography>
                  </Box>
                  {/* Minimal voted indication */}
                  {votedEntryId === entry.id && (
                    <Box sx={{ position: 'absolute', top: 8, right: 8, display: 'flex', alignItems: 'center', gap: 0.5 }}>
                      <Typography variant="caption" sx={{ color: '#1976d2', fontWeight: 700 }}>Voted</Typography>
                    </Box>
                  )}
                </Paper>
              </Grid>
            )
          ))}
        </Grid>
      </Box>
    );
  }

  // Default: current/future quest layout (existing)
  return (
    <Box sx={{ maxWidth: 900, mx: 'auto', p: { xs: 1, sm: 2, md: 3 } }}>
      <Typography variant="h4" fontWeight={700} gutterBottom>{quest.name}</Typography>
      <Typography variant="subtitle1" gutterBottom>{quest.description}</Typography>
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ mb: 2 }}>
        {quest.top10_award_url && <Chip avatar={<Avatar src={quest.top10_award_url} />} label="Top 10 Award" />}
        {quest.participation_award_url && <Chip avatar={<Avatar src={quest.participation_award_url} />} label="Participation Award" />}
      </Stack>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        {`Start: ${new Date(quest.start_time).toLocaleString()} | End: ${new Date(quest.end_time).toLocaleString()}`}
      </Typography>
      <Box sx={{ mb: 2 }}>
        {myEntry && photoMap[myEntry.photo_id] ? (
          <Paper variant="outlined" sx={{ p: 2, mb: 2, border: '2.5px solid', borderColor: 'primary.main', background: 'rgba(0,0,0,0.04)' }}>
            <Typography variant="subtitle1" color="primary">Your Entry</Typography>
            <SupabaseImage path={photoMap[myEntry.photo_id].url} width={240} height={240} style={{ borderRadius: 8, marginTop: 8 }} />
          </Paper>
        ) : (
          user && <Button variant="contained" onClick={() => setShowSelectModal(true)}>Submit Your Entry</Button>
        )}
        <SelectPhotoModal
          open={showSelectModal}
          onClose={() => setShowSelectModal(false)}
          onSelect={handlePhotoSelect}
        />
      </Box>
      <Typography variant="h6" sx={{ mt: 2, mb: 1 }}>Entries</Typography>
      <Grid container spacing={2}>
        {entries.filter(e => !myEntry || e.id !== myEntry.id).map(entry => (
          photoMap[entry.photo_id] && (
            <Grid item xs={12} sm={6} md={4} key={entry.id}>
              <Paper
                variant="outlined"
                sx={{
                  p: 2,
                  textAlign: 'center',
                  border: winnerEntryId === entry.id ? '2.5px solid #FFD700' : undefined,
                  background: winnerEntryId === entry.id ? 'rgba(255,223,0,0.08)' : undefined,
                  position: 'relative',
                }}
              >
                {winnerEntryId === entry.id && (
                  <Box sx={{ position: 'absolute', top: 8, right: 8, display: 'flex', alignItems: 'center', gap: 1 }}>
                    <EmojiEventsIcon sx={{ color: '#FFD700' }} />
                    <Typography variant="subtitle2" sx={{ color: '#FFD700', fontWeight: 700 }}>
                      Winner
                    </Typography>
                  </Box>
                )}
                <SupabaseImage path={photoMap[entry.photo_id].url} width={200} height={200} style={{ borderRadius: 8 }} />
                <Box sx={{ mt: 1, mb: 1 }}>
                  <Typography variant="subtitle2">
                    {userProfileMap[entry.user_id] || 'Unknown User'}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {voteCounts[entry.id] || 0} vote{(voteCounts[entry.id] || 0) === 1 ? '' : 's'}
                  </Typography>
                </Box>
                <Button
                  variant={votedEntryId === entry.id ? 'contained' : 'outlined'}
                  color={votedEntryId === entry.id ? 'primary' : 'inherit'}
                  size="small"
                  disabled={submittingVote}
                  onClick={() => handleVote(entry.id)}
                  sx={{ mt: 1 }}
                >
                  {votedEntryId === entry.id ? 'Voted' : 'Vote'}
                </Button>
              </Paper>
            </Grid>
          )
        ))}
      </Grid>
    </Box>
  );
};

export default QuestDetailPage;
