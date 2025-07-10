
import { useEffect, useState } from 'react';
import {
  Box, Typography, Paper, CircularProgress, List, ListItemButton, ListItemText
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';

interface Quest {
  id: string;
  name: string;
  description: string;
  start_time: string;
  end_time: string;
}

const QuestsPage = () => {
  const [loading, setLoading] = useState(true);
  const [activeQuests, setActiveQuests] = useState<Quest[]>([]);
  const [pastQuests, setPastQuests] = useState<Quest[]>([]);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchQuests = async () => {
      setLoading(true);
      const { data: quests, error } = await supabase
        .from('quests')
        .select('*')
        .order('start_time', { ascending: true });
      if (error) {
        setLoading(false);
        return;
      }
      const now = new Date();
      setActiveQuests(
        (quests || []).filter(q => new Date(q.end_time) >= now)
      );
      setPastQuests(
        (quests || []).filter(q => new Date(q.end_time) < now)
      );
      setLoading(false);
    };
    fetchQuests();
  }, []);

  const handleQuestClick = (questId: string) => {
    navigate(`/quests/${questId}`);
  };

  return (
    <Box>
      <Typography align="left" variant="h4" fontWeight={700} gutterBottom>
        Contests
      </Typography>
      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 200 }}>
          <CircularProgress />
        </Box>
      ) : (
        <>
          <Typography variant="h6" sx={{ mt: 2, mb: 1 }}>Active Contests</Typography>
          <Paper variant="outlined">
            <List>
              {activeQuests.length === 0 && (
                <ListItemText primary="No active contests." sx={{ p: 2 }} />
              )}
              {activeQuests.map(q => (
                <ListItemButton key={q.id} onClick={() => handleQuestClick(q.id)}>
                  <ListItemText
                    primary={q.name}
                    secondary={
                      <>
                        <span>{q.description}</span><br />
                        <span>Ends: {new Date(q.end_time).toLocaleString()}</span>
                      </>
                    }
                  />
                </ListItemButton>
              ))}
            </List>
          </Paper>

          <Typography variant="h6" sx={{ mt: 4, mb: 1 }}>Past Contests</Typography>
          <Paper variant="outlined">
            <List>
              {pastQuests.length === 0 && (
                <ListItemText primary="No past contests." sx={{ p: 2 }} />
              )}
              {pastQuests.map(q => (
                <ListItemButton key={q.id} onClick={() => handleQuestClick(q.id)}>
                  <ListItemText
                    primary={q.name}
                    secondary={
                      <>
                        <span>{q.description}</span><br />
                        <span>Ended: {new Date(q.end_time).toLocaleString()}</span>
                      </>
                    }
                  />
                </ListItemButton>
              ))}
            </List>
          </Paper>
        </>
      )}
    </Box>
  );
};

export default QuestsPage;
