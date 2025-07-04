import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import {
  Box, Typography, Paper, CircularProgress, Grid, Button, Stack, Avatar, Chip
} from '@mui/material';
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
  // votes: number; // Not present in schema, remove if not used
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

  useEffect(() => {
    const fetchQuestAndEntries = async () => {
      setLoading(true);
      const { data: questData } = await supabase.from('quests').select('*').eq('id', questId).single();
      setQuest(questData);
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
      setLoading(false);
    };
    fetchQuestAndEntries();
  }, [questId, user]);

  // Fetch user's vote for this quest (if any)
  useEffect(() => {
    const fetchVote = async () => {
      if (!user || !questId) return;
      const { data } = await supabase.from('quest_votes').select('entry_id').eq('user_id', user.id).eq('quest_id', questId).single();
      setVotedEntryId(data?.entry_id || null);
    };
    fetchVote();
  }, [user, questId]);

  const handleVote = async (entryId: string) => {
    if (!user || submittingVote) return;
    setSubmittingVote(true);
    // Upsert vote
    await supabase.from('quest_votes').upsert({ user_id: user.id, quest_id: questId, entry_id: entryId }, { onConflict: 'user_id,quest_id' });
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
            <Grid item key={entry.id} xs={12} sm={6} md={4}>
              <Paper variant="outlined" sx={{ p: 2, textAlign: 'center' }}>
                <SupabaseImage path={photoMap[entry.photo_id].url} width={200} height={200} style={{ borderRadius: 8 }} />
                <Box sx={{ mt: 1 }}>
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
                </Box>
              </Paper>
            </Grid>
          )
        ))}
      </Grid>
    </Box>
  );
};

export default QuestDetailPage;
