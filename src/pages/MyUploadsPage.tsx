// ...existing code...
import { Box, Paper, Typography, Stack, Divider } from '@mui/material';
import PhotoUpload from '../components/PhotoUpload';

// ...existing code...

// ...existing code...

const MyUploadsPage = () => {
  return (
    <Box sx={{ maxWidth: 1400, mx: 'auto', p: { xs: 1, sm: 2, md: 3 }, alignItems: 'flex-start', display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <Typography variant="h4" fontWeight={700} gutterBottom>
        My Uploads
      </Typography>
      <Paper elevation={2} sx={{ p: { xs: 2, sm: 3 }, mb: 3, width: '100%', maxWidth: 600 }}>
        <Stack spacing={2} divider={<Divider flexItem />}> 
          <Typography variant="subtitle1" color="text.secondary">
            Upload a new bird photo. Crop your image before submitting.
          </Typography>
          <PhotoUpload />
        </Stack>
      </Paper>
      <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
        All your uploaded photos will appear in the Photo Grid and Species pages.
      </Typography>
    </Box>
  );
};

export default MyUploadsPage;
