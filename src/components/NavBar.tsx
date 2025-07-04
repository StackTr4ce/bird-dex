
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from './AuthProvider';
import AppBar from '@mui/material/AppBar';
import Toolbar from '@mui/material/Toolbar';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import Box from '@mui/material/Box';
import IconButton from '@mui/material/IconButton';
import MenuIcon from '@mui/icons-material/Menu';
import Stack from '@mui/material/Stack';
import HomeIcon from '@mui/icons-material/Home';
import GridOnIcon from '@mui/icons-material/GridOn';
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents';
import GroupIcon from '@mui/icons-material/Group';
import DynamicFeedIcon from '@mui/icons-material/DynamicFeed';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import FlagIcon from '@mui/icons-material/Flag';

const navLinks = [
  { to: '/', label: 'Home', icon: <HomeIcon sx={{ mr: 1 }} /> },
  { to: '/grid', label: 'Photo Grid', icon: <GridOnIcon sx={{ mr: 1 }} /> },
  { to: '/leaderboard', label: 'Leaderboard', icon: <EmojiEventsIcon sx={{ mr: 1 }} /> },
  { to: '/friends', label: 'Friends', icon: <GroupIcon sx={{ mr: 1 }} /> },
  { to: '/feed', label: 'Feed', icon: <DynamicFeedIcon sx={{ mr: 1 }} /> },
  { to: '/my-uploads', label: 'My Uploads', icon: <CloudUploadIcon sx={{ mr: 1 }} /> },
  { to: '/quests', label: 'Quests', icon: <FlagIcon sx={{ mr: 1 }} /> },
  { to: '/quests-admin', label: 'Quests Admin', icon: <FlagIcon sx={{ mr: 1, color: 'secondary.main' }} /> },
];

const NavBar = () => {
  const location = useLocation();
  const { user, signOut, loading } = useAuth();
  return (
    <AppBar position="fixed" color="inherit" elevation={2} sx={{ zIndex: 1200, background: 'linear-gradient(90deg, #23262f 0%, #23262f 60%, #23262f 100%)' }}>
      <Toolbar sx={{ display: 'flex', justifyContent: 'space-between', minHeight: 56 }}>
        <Stack direction="row" spacing={2} alignItems="center">
          <IconButton edge="start" color="primary" sx={{ display: { xs: 'inline-flex', md: 'none' } }}>
            <MenuIcon />
          </IconButton>
          <Typography variant="h6" sx={{ fontWeight: 800, letterSpacing: 1, display: { xs: 'none', sm: 'block' }, color: 'primary.main', mr: 2 }}>
            🐦 BirdDex
          </Typography>
          {navLinks.map((link) => (
            <Button
              key={link.to}
              component={Link}
              to={link.to}
              color={location.pathname === link.to ? 'primary' : 'inherit'}
              startIcon={link.icon}
              sx={{
                fontWeight: location.pathname === link.to ? 700 : 400,
                display: { xs: 'none', md: 'inline-flex' },
                textTransform: 'none',
                letterSpacing: 0.5,
                fontSize: 16,
                borderBottom: location.pathname === link.to ? 2 : 0,
                borderColor: 'primary.main',
                borderRadius: 0,
                px: 1.5,
              }}
            >
              {link.label}
            </Button>
          ))}
        </Stack>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          {user ? (
            <>
              <Button
                component={Link}
                to="/profile"
                color="inherit"
                sx={{ textTransform: 'none', fontWeight: 500, mr: 1 }}
              >
                Signed in as {user.email}
              </Button>
              <Button variant="outlined" color="primary" size="small" onClick={signOut} disabled={loading} sx={{ ml: 1, fontWeight: 700 }}>
                Sign Out
              </Button>
            </>
          ) : (
            <Button component={Link} to="/login" color="primary" variant="contained" size="small" sx={{ fontWeight: 700 }}>Login</Button>
          )}
        </Box>
      </Toolbar>
    </AppBar>
  );
};

export default NavBar;
