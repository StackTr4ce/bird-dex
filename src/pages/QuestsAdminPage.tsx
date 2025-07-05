import { useEffect, useState } from 'react';
import {
  Box, Typography, Paper, Button, Stack, Dialog, DialogTitle, DialogContent, DialogActions, TextField, CircularProgress, IconButton, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Tooltip
} from '@mui/material';
import { supabase } from '../supabaseClient';

import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';



interface Quest {
  id: string;
  name: string;
  description: string;
  species_id: string;
  participation_award_url: string;
  top10_award_url: string;
  start_time: string;
  end_time: string;
}

const QuestsAdminPage = () => {
  // const { user } = useAuth();
  const [quests, setQuests] = useState<Quest[]>([]);

  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingQuest, setEditingQuest] = useState<Quest | null>(null);
  const [form, setForm] = useState<Partial<Quest>>({});
  const [awardFiles, setAwardFiles] = useState<{ top10?: File; participation?: File }>({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      // Removed species fetch, no longer needed

      const { data: quests } = await supabase.from('quests').select('*').order('start_time', { ascending: false });
      setQuests(quests || []);
      setLoading(false);
    };
    fetchData();
  }, []);

  const handleOpenDialog = (quest?: Quest) => {
    setError(null);
    setAwardFiles({});
    if (quest) {
      setEditingQuest(quest);
      setForm({ ...quest });
    } else {
      setEditingQuest(null);
      setForm({ name: '', description: '', species_id: '', start_time: '', end_time: '', participation_award_url: '', top10_award_url: '' });
    }
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setEditingQuest(null);
    setForm({});
    setAwardFiles({});
    setError(null);
  };

  const handleFormChange = (field: keyof Quest, value: any) => {
    setForm(f => ({ ...f, [field]: value }));
  };

  const handleFileChange = (type: 'top10' | 'participation', file: File | null) => {
    setAwardFiles(files => ({ ...files, [type]: file || undefined }));
  };

const uploadAwardImage = async (file: File, questName: string, type: 'top10' | 'participation') => {
  const ext = file.name.split('.').pop();
  const filePath = `${questName.replace(/\s+/g, '_')}_${type}_${Date.now()}.${ext}`;
  // Use the correct bucket name: 'quest-awards'
  const { error } = await supabase.storage.from('quest-awards').upload(filePath, file, { upsert: true });
  if (error) throw error;
  // Get public URL
  const { data: urlData } = supabase.storage.from('quest-awards').getPublicUrl(filePath);
  return urlData.publicUrl;
};

  const validateForm = () => {
    if (!form.name || !form.start_time || !form.end_time) {
      setError('Name, start time, and end time are required.');
      return false;
    }
    if (new Date(form.end_time) <= new Date(form.start_time)) {
      setError('End time must be after start time.');
      return false;
    }
    return true;
  };

  const handleSave = async () => {
    if (!validateForm()) return;
    setSaving(true);
    setError(null);
    try {
      let participation_award_url = form.participation_award_url || '';
      let top10_award_url = form.top10_award_url || '';
      if (awardFiles.participation) {
        participation_award_url = await uploadAwardImage(awardFiles.participation, form.name || 'quest', 'participation');
      }
      if (awardFiles.top10) {
        top10_award_url = await uploadAwardImage(awardFiles.top10, form.name || 'quest', 'top10');
      }
      const questData = {
        name: form.name,
        description: form.description,
        start_time: form.start_time,
        end_time: form.end_time,
        participation_award_url,
        top10_award_url,
      };
      if (editingQuest) {
        await supabase.from('quests').update(questData).eq('id', editingQuest.id);
      } else {
        await supabase.from('quests').insert(questData);
      }
      // Refresh
      const { data: quests } = await supabase.from('quests').select('*').order('start_time', { ascending: false });
      setQuests(quests || []);
      handleCloseDialog();
    } catch (e: any) {
      setError(e.message || 'Error saving quest');
    }
    setSaving(false);
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Delete this quest?')) return;
    await supabase.from('quests').delete().eq('id', id);
    setQuests(qs => qs.filter(q => q.id !== id));
  };

  return (
    <Box>
      <Typography align="left" variant="h4" fontWeight={700} gutterBottom>
        Quests Admin
      </Typography>
      <Button variant="contained" color="primary" sx={{ mb: 2 }} onClick={() => handleOpenDialog()}>
        Create New Quest
      </Button>
      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 200 }}>
          <CircularProgress />
        </Box>
      ) : (
        <TableContainer component={Paper} sx={{ mb: 4 }}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Name</TableCell>
                <TableCell>Description</TableCell>
                <TableCell>Start</TableCell>
                <TableCell>End</TableCell>
                <TableCell>Top 10 Award</TableCell>
                <TableCell>Participation Award</TableCell>
                <TableCell>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {quests.map(q => (
                <TableRow key={q.id}>
                  <TableCell>{q.name}</TableCell>
                  <TableCell>{q.description}</TableCell>
                  <TableCell>{new Date(q.start_time).toLocaleString()}</TableCell>
                  <TableCell>{new Date(q.end_time).toLocaleString()}</TableCell>
                  <TableCell>
                    {q.top10_award_url && <img src={q.top10_award_url} alt="Top 10 Award" style={{ width: 48, height: 48, objectFit: 'contain' }} />}
                  </TableCell>
                  <TableCell>
                    {q.participation_award_url && <img src={q.participation_award_url} alt="Participation Award" style={{ width: 48, height: 48, objectFit: 'contain' }} />}
                  </TableCell>
                  <TableCell>
                    <Tooltip title="Edit"><span><IconButton onClick={() => handleOpenDialog(q)}><EditIcon /></IconButton></span></Tooltip>
                    <Tooltip title="Delete"><span><IconButton onClick={() => handleDelete(q.id)}><DeleteIcon /></IconButton></span></Tooltip>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}
      <Dialog open={dialogOpen} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
        <DialogTitle>{editingQuest ? 'Edit Quest' : 'Create Quest'}</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField label="Quest Name" value={form.name || ''} onChange={e => handleFormChange('name', e.target.value)} required fullWidth autoFocus />
            <TextField label="Description" value={form.description || ''} onChange={e => handleFormChange('description', e.target.value)} fullWidth multiline minRows={2} />
            <TextField
              label="Start Time"
              type="datetime-local"
              value={form.start_time ? form.start_time.slice(0, 16) : ''}
              onChange={e => handleFormChange('start_time', e.target.value)}
              InputLabelProps={{ shrink: true }}
              required
              fullWidth
            />
            <TextField
              label="End Time"
              type="datetime-local"
              value={form.end_time ? form.end_time.slice(0, 16) : ''}
              onChange={e => handleFormChange('end_time', e.target.value)}
              InputLabelProps={{ shrink: true }}
              required
              fullWidth
            />
            <Box>
              <Typography variant="subtitle2">Top 10 Award Image</Typography>
              <input type="file" accept="image/*" onChange={e => handleFileChange('top10', e.target.files?.[0] || null)} />
              {form.top10_award_url && <img src={form.top10_award_url} alt="Top 10 Award" style={{ width: 48, height: 48, objectFit: 'contain', marginTop: 4 }} />}
            </Box>
            <Box>
              <Typography variant="subtitle2">Participation Award Image</Typography>
              <input type="file" accept="image/*" onChange={e => handleFileChange('participation', e.target.files?.[0] || null)} />
              {form.participation_award_url && <img src={form.participation_award_url} alt="Participation Award" style={{ width: 48, height: 48, objectFit: 'contain', marginTop: 4 }} />}
            </Box>
            {error && <Typography color="error">{error}</Typography>}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog} disabled={saving}>Cancel</Button>
          <Button onClick={handleSave} variant="contained" color="primary" disabled={saving}>{saving ? <CircularProgress size={20} /> : 'Save'}</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default QuestsAdminPage;
