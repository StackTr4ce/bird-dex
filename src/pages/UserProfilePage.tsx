import { useEffect, useState } from 'react';
import { Box, Typography, TextField, Button, Paper, CircularProgress, Alert } from '@mui/material';
import { supabase } from '../supabaseClient';
import { useAuth } from '../components/AuthProvider';

const UserProfilePage = () => {
  const { user } = useAuth();
  const [displayName, setDisplayName] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchProfile = async () => {
      setLoading(true);
      if (!user) return;
      const { data } = await supabase
        .from('user_profiles')
        .select('display_name')
        .eq('user_id', user.id)
        .single();
      if (data) setDisplayName(data.display_name);
      setLoading(false);
    };
    fetchProfile();
  }, [user]);

  const handleSave = async () => {
    setSaving(true);
    setError('');
    setSuccess(false);
    if (!user) return;
    const { error } = await supabase
      .from('user_profiles')
      .upsert({ user_id: user.id, display_name: displayName });
    if (error) setError(error.message);
    else setSuccess(true);
    setSaving(false);
  };

  if (loading) return <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 200 }}><CircularProgress /></Box>;

  return (
    <Box sx={{ maxWidth: 400, mx: 'auto', mt: 4 }}>
      <Paper sx={{ p: 3 }}>
        <Typography variant="h5" gutterBottom>Profile</Typography>
        <Typography variant="body2" color="text.secondary" gutterBottom>
          Signed in as {user?.email}
        </Typography>
        <TextField
          label="Display Name"
          value={displayName}
          onChange={e => setDisplayName(e.target.value)}
          fullWidth
          sx={{ my: 2 }}
        />
        <Button variant="contained" onClick={handleSave} disabled={saving || !displayName} fullWidth>
          {saving ? 'Saving...' : 'Save'}
        </Button>
        {success && <Alert severity="success" sx={{ mt: 2 }}>Display name updated!</Alert>}
        {error && <Alert severity="error" sx={{ mt: 2 }}>{error}</Alert>}
      </Paper>
    </Box>
  );
};

export default UserProfilePage;
