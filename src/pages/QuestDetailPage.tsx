import { useEffect, useState } from 'react';
// Remove entry dialog state and handler (must be at top level)
// (moved below imports)
import { useParams } from 'react-router-dom';
import { Box, Typography, Paper, CircularProgress, Button, Stack, Avatar, Chip } from '@mui/material';
import { Dialog, DialogTitle, DialogContent, DialogContentText, DialogActions } from '@mui/material';
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
  // Remove entry dialog state and handler (must be at top level)
  const [showRemoveDialog, setShowRemoveDialog] = useState(false);
  const [removing, setRemoving] = useState(false);

  const handleRemoveEntry = async () => {
    if (!myEntry) return;
    setRemoving(true);
    await supabase.from('quest_votes').delete().eq('entry_id', myEntry.id);
    await supabase.from('quest_entries').delete().eq('id', myEntry.id);
    setShowRemoveDialog(false);
    setRemoving(false);
    const { data: entriesData } = await supabase.from('quest_entries').select('*').eq('quest_id', questId);
    setEntries(entriesData || []);
    setMyEntry(null);
  };
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
          .from('user_profiles_public')
          .select('user_id,display_name')
          .in('user_id', userIds);
        const profileMap: Record<string, string> = {};
        (profilesData || []).forEach((p: UserProfile) => {
          profileMap[p.user_id] = p.display_name && p.display_name.trim() ? p.display_name : 'Unknown User';
        });
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
      const { data } = await supabase.from('quest_votes').select('entry_id').eq('voter_id', user.id).eq('quest_id', questId).maybeSingle();
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

    // Refetch vote counts for all entries (to ensure accuracy)
    const { data: votesData } = await supabase
      .from('quest_votes')
      .select('entry_id')
      .in('entry_id', entries.map((e) => e.id));
    const voteMap: Record<string, number> = {};
    (votesData || []).forEach((v: { entry_id: string }) => {
      voteMap[v.entry_id] = (voteMap[v.entry_id] || 0) + 1;
    });
    setVoteCounts(voteMap);

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
      <Box sx={{ width: '100%', maxWidth: 1400, mx: 'auto', p: { xs: 1, sm: 2, md: 3 }, alignItems: 'flex-start', display: 'flex', flexDirection: 'column', minHeight: '100vh', boxSizing: 'border-box', overflowX: 'hidden' }}>
        <Typography variant="h4" fontWeight={700} gutterBottom>{quest.name}</Typography>
        <Typography variant="subtitle1" gutterBottom>{quest.description}</Typography>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ mb: 2 }}>
          {quest.top10_award_url && <Chip avatar={<Avatar src={quest.top10_award_url} />} label="Winner Award" />}
          {quest.participation_award_url && <Chip avatar={<Avatar src={quest.participation_award_url} />} label="Participation Award" />}
        </Stack>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          {`Start: ${new Date(quest.start_time).toLocaleString()} | End: ${new Date(quest.end_time).toLocaleString()}`}
        </Typography>
        <Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, gap: 2, mb: 3 }}>
          {/* Winner on the left */}
          <Box sx={{ flex: { xs: 1, md: '0 0 33%' } }}>
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
          </Box>
          {/* User's entry on the right */}
          <Box sx={{ flex: { xs: 1, md: '0 0 67%' } }}>
            {myEntry && photoMap[myEntry.photo_id] && (
              <Paper variant="outlined" sx={{ p: 2, background: 'rgba(0,0,0,0.04)', textAlign: 'center' }}>
                <Typography variant="subtitle1" color="primary">Your Entry</Typography>
                <SupabaseImage path={photoMap[myEntry.photo_id].url} width={180} height={180} style={{ borderRadius: 8, marginTop: 8 }} />
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
                  {voteCounts[myEntry.id] || 0} vote{(voteCounts[myEntry.id] || 0) === 1 ? '' : 's'}
                </Typography>
              </Paper>
            )}
          </Box>
        </Box>
        <Typography variant="h6" sx={{ mt: 2, mb: 1 }}>Other Entries</Typography>
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(3, 1fr)' }, gap: 2 }}>
          {otherEntries.map(entry => (
            photoMap[entry.photo_id] && (
              <Paper
                key={entry.id}
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
            )
          ))}
        </Box>
      </Box>
    );
  }

  // Default: current/future quest layout (existing)
  return (
    <Box sx={{ maxWidth: 900, mx: 'auto', p: { xs: 1, sm: 2, md: 3 } }}>
      <Typography variant="h4" fontWeight={700} gutterBottom>{quest.name}</Typography>
      <Typography variant="subtitle1" gutterBottom>{quest.description}</Typography>
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ mb: 2 }}>
        {quest.top10_award_url && <Chip avatar={<Avatar src={quest.top10_award_url} />} label="Winner Award" />}
        {quest.participation_award_url && <Chip avatar={<Avatar src={quest.participation_award_url} />} label="Participation Award" />}
      </Stack>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        {`Start: ${new Date(quest.start_time).toLocaleString()} | End: ${new Date(quest.end_time).toLocaleString()}`}
      </Typography>
      {/* Remove entry dialog state and handler */}
      <Box sx={{ mb: 2 }}>
        {myEntry && photoMap[myEntry.photo_id] ? (
          <Paper
            variant="outlined"
            sx={{
              p: { xs: 1.5, sm: 2 },
              mb: 2,
              border: '2.5px solid',
              borderColor: 'primary.main',
              background: 'rgba(0,0,0,0.04)',
              borderRadius: 3,
              position: 'relative',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              minHeight: { xs: 320, sm: 340 },
              boxShadow: { xs: 0, sm: 2 },
              overflow: 'hidden',
            }}
          >
            <Typography variant="subtitle1" color="primary" sx={{ mb: 1, fontWeight: 600, fontSize: { xs: 16, sm: 18 } }}>Your Entry</Typography>
            <Box
              sx={{
                width: { xs: 180, sm: 240 },
                height: { xs: 180, sm: 240 },
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: 2,
                overflow: 'hidden',
                boxShadow: 1,
                mb: 2,
              }}
            >
              <SupabaseImage path={photoMap[myEntry.photo_id].url} width={240} height={240} style={{ borderRadius: 12, width: '100%', height: '100%', objectFit: 'cover' }} />
            </Box>
            {/* Vote count and Remove button at bottom */}
            <Box sx={{ width: '100%', display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, alignItems: { xs: 'flex-start', sm: 'center' }, justifyContent: 'space-between', mt: 'auto', gap: 1 }}>
              <Typography variant="caption" color="text.secondary" sx={{ ml: 1, mb: { xs: 0.5, sm: 0 } }}>
                {voteCounts[myEntry.id] || 0} vote{(voteCounts[myEntry.id] || 0) === 1 ? '' : 's'}
              </Typography>
              <Button
                color="error"
                variant="outlined"
                size="small"
                sx={{
                  borderRadius: 2,
                  fontWeight: 500,
                  mb: 0.5,
                  mr: 0.5,
                  minWidth: 120,
                  boxShadow: 1,
                  position: { xs: 'static', sm: 'static' },
                }}
                onClick={() => setShowRemoveDialog(true)}
              >
                Withdraw Photo
              </Button>
            </Box>
            <Dialog open={showRemoveDialog} onClose={() => setShowRemoveDialog(false)}>
              <DialogTitle>Remove Your Photo from Contest?</DialogTitle>
              <DialogContent>
                <DialogContentText>
                  Are you sure you want to remove your photo from this contest? <b>This will permanently delete your entry and any votes it has received.</b>
                </DialogContentText>
              </DialogContent>
              <DialogActions>
                <Button onClick={() => setShowRemoveDialog(false)} disabled={removing}>Cancel</Button>
                <Button onClick={handleRemoveEntry} color="error" variant="contained" disabled={removing}>
                  {removing ? 'Removing...' : 'Remove Photo'}
                </Button>
              </DialogActions>
            </Dialog>
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
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(3, 1fr)' }, gap: 2 }}>
        {entries.filter(e => !myEntry || e.id !== myEntry.id).map(entry => (
          photoMap[entry.photo_id] && (
            <Paper
              key={entry.id}
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
                disabled={submittingVote || votedEntryId === entry.id}
                onClick={() => handleVote(entry.id)}
                sx={{ mt: 1 }}
              >
                {votedEntryId === entry.id ? 'Voted' : 'Vote'}
              </Button>
            </Paper>
          )
        ))}
      </Box>
    </Box>
  );
};

export default QuestDetailPage;
