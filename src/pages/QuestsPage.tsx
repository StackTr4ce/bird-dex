

import { useEffect, useState } from 'react';
import {
  Box, Typography, Paper, CircularProgress
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';

interface Contest {
  id: string;
  name: string;
  description: string;
  start_time: string;
  end_time: string;
}

const QuestsPage = () => {
  const [loading, setLoading] = useState(true);
  const [activeContests, setActiveContests] = useState<Contest[]>([]);
  const [pastContests, setPastContests] = useState<Contest[]>([]);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchContests = async () => {
      setLoading(true);
      const { data: contests, error } = await supabase
        .from('quests') // Change to 'contests' if your table is renamed
        .select('*')
        .order('start_time', { ascending: true });
      if (error) {
        setLoading(false);
        return;
      }
      const now = new Date();
      setActiveContests(
        (contests || []).filter(c => new Date(c.end_time) >= now)
      );
      setPastContests(
        (contests || []).filter(c => new Date(c.end_time) < now)
      );
      setLoading(false);
    };
    fetchContests();
  }, []);

  const handleContestClick = (contestId: string) => {
    navigate(`/contests/${contestId}`);
  };

  return (
    <Box sx={{ width: '100%', minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', bgcolor: 'background.default', py: 4 }}>
      <Typography align="center" variant="h3" fontWeight={800} gutterBottom sx={{ letterSpacing: 1, mb: 3 }}>
        BirdDex Contests
      </Typography>
      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 200 }}>
          <CircularProgress />
        </Box>
      ) : (
        <>
          <Typography variant="h5" align="center" sx={{ mt: 2, mb: 2, fontWeight: 700, letterSpacing: 0.5 }}>Active Contests</Typography>
          <Box sx={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            {activeContests.length === 0 ? (
              <Paper variant="outlined" sx={{ width: { xs: '98%', sm: '90%', md: '70%' }, p: 3, textAlign: 'center', mb: 2 }}>
                <Typography>No active contests.</Typography>
              </Paper>
            ) : (
              activeContests.map(c => (
                <Paper
                  key={c.id}
                  variant="outlined"
                  sx={{
                    width: { xs: '98%', sm: '90%', md: '70%' },
                    mb: 3,
                    p: 0,
                    borderRadius: 4,
                    boxShadow: 2,
                    overflow: 'hidden',
                    cursor: 'pointer',
                    transition: 'box-shadow 0.2s',
                    '&:hover': { boxShadow: 6, borderColor: 'primary.main' },
                  }}
                  onClick={() => handleContestClick(c.id)}
                >
                  <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '2fr 3fr 2fr' }, alignItems: 'stretch', width: '100%', minHeight: 90 }}>
                    <Box sx={{ px: { xs: 2, sm: 3 }, py: 2, borderRight: { sm: '1px solid #eee' }, textAlign: 'center', display: 'flex', flexDirection: 'column', justifyContent: 'center', height: '100%' }}>
                      <Typography variant="subtitle1" fontWeight={700} color="primary.main" sx={{ mb: 1, fontSize: { xs: 16, sm: 18 } }}>{c.name}</Typography>
                    </Box>
                    <Box sx={{ px: { xs: 2, sm: 3 }, py: 2, textAlign: 'center', display: 'flex', flexDirection: 'column', justifyContent: 'center', height: '100%' }}>
                      <Typography variant="body1" color="text.secondary" sx={{ fontSize: { xs: 15, sm: 16 } }}>{c.description}</Typography>
                    </Box>
                    <Box sx={{ px: { xs: 2, sm: 3 }, py: 2, borderLeft: { sm: '1px solid #eee' }, textAlign: 'center', display: 'flex', flexDirection: 'column', justifyContent: 'center', height: '100%' }}>
                      <Typography variant="subtitle2" color="text.secondary" sx={{ fontWeight: 500 }}>
                        {new Date(c.start_time).toLocaleDateString()} - {new Date(c.end_time).toLocaleDateString()}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        Ends: {new Date(c.end_time).toLocaleTimeString()}
                      </Typography>
                    </Box>
                  </Box>
                </Paper>
              ))
            )}
          </Box>

          <Typography variant="h5" align="center" sx={{ mt: 5, mb: 2, fontWeight: 700, letterSpacing: 0.5 }}>Past Contests</Typography>
          <Box sx={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            {pastContests.length === 0 ? (
              <Paper variant="outlined" sx={{ width: { xs: '98%', sm: '90%', md: '70%' }, p: 3, textAlign: 'center', mb: 2 }}>
                <Typography>No past contests.</Typography>
              </Paper>
            ) : (
              pastContests.map(c => (
                <Paper
                  key={c.id}
                  variant="outlined"
                  sx={{
                    width: { xs: '98%', sm: '90%', md: '70%' },
                    mb: 3,
                    p: 0,
                    borderRadius: 4,
                    boxShadow: 1,
                    overflow: 'hidden',
                    cursor: 'pointer',
                    transition: 'box-shadow 0.2s',
                    '&:hover': { boxShadow: 5, borderColor: 'primary.main' },
                  }}
                  onClick={() => handleContestClick(c.id)}
                >
                  <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '2fr 3fr 2fr' }, alignItems: 'stretch', width: '100%', minHeight: 90 }}>
                    <Box sx={{ px: { xs: 2, sm: 3 }, py: 2, borderRight: { sm: '1px solid #eee' }, textAlign: 'center', display: 'flex', flexDirection: 'column', justifyContent: 'center', height: '100%' }}>
                      <Typography variant="subtitle1" fontWeight={700} color="primary.main" sx={{ mb: 1, fontSize: { xs: 16, sm: 18 } }}>{c.name}</Typography>
                    </Box>
                    <Box sx={{ px: { xs: 2, sm: 3 }, py: 2, textAlign: 'center', display: 'flex', flexDirection: 'column', justifyContent: 'center', height: '100%' }}>
                      <Typography variant="body1" color="text.secondary" sx={{ fontSize: { xs: 15, sm: 16 } }}>{c.description}</Typography>
                    </Box>
                    <Box sx={{ px: { xs: 2, sm: 3 }, py: 2, borderLeft: { sm: '1px solid #eee' }, textAlign: 'center', display: 'flex', flexDirection: 'column', justifyContent: 'center', height: '100%' }}>
                      <Typography variant="subtitle2" color="text.secondary" sx={{ fontWeight: 500 }}>
                        {new Date(c.start_time).toLocaleDateString()} - {new Date(c.end_time).toLocaleDateString()}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        Ended: {new Date(c.end_time).toLocaleTimeString()}
                      </Typography>
                    </Box>
                  </Box>
                </Paper>
              ))
            )}
          </Box>
        </>
      )}
    </Box>
  );
};

export default QuestsPage;
