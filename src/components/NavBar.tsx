
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
import { Drawer, List, ListItem, ListItemButton, ListItemIcon, ListItemText, Divider } from '@mui/material';
import { useState } from 'react';

const navLinks = [
  { to: '/', label: 'Home', icon: <HomeIcon sx={{ mr: 1 }} />, requiresAuth: false },
  { to: '/grid', label: 'Photo Grid', icon: <GridOnIcon sx={{ mr: 1 }} />, requiresAuth: true },
  { to: '/leaderboard', label: 'Leaderboard', icon: <EmojiEventsIcon sx={{ mr: 1 }} />, requiresAuth: true },
  { to: '/friends', label: 'Friends', icon: <GroupIcon sx={{ mr: 1 }} />, requiresAuth: true },
  { to: '/feed', label: 'Feed', icon: <DynamicFeedIcon sx={{ mr: 1 }} />, requiresAuth: true },
  { to: '/my-uploads', label: 'My Uploads', icon: <CloudUploadIcon sx={{ mr: 1 }} />, requiresAuth: true },
  { to: '/quests', label: 'Quests', icon: <FlagIcon sx={{ mr: 1 }} />, requiresAuth: true },
  { to: '/quests-admin', label: 'Quests Admin', icon: <FlagIcon sx={{ mr: 1, color: 'secondary.main' }} />, requiresAuth: true },
];

const NavBar = () => {
  const location = useLocation();
  const { user, signOut, loading } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  
  // Filter navigation links based on authentication status
  const visibleNavLinks = navLinks.filter(link => !link.requiresAuth || user);

  const handleMobileMenuToggle = () => {
    setMobileMenuOpen(!mobileMenuOpen);
  };

  const closeMobileMenu = () => {
    setMobileMenuOpen(false);
  };
  
  return (
    <AppBar position="fixed" color="inherit" elevation={2} sx={{ zIndex: 1200, background: 'linear-gradient(90deg, #23262f 0%, #23262f 60%, #23262f 100%)' }}>
      <Toolbar sx={{ display: 'flex', justifyContent: 'space-between', minHeight: 56 }}>
        <Stack direction="row" spacing={2} alignItems="center">
          <IconButton 
            edge="start" 
            color="primary" 
            onClick={handleMobileMenuToggle}
            sx={{ display: { xs: 'inline-flex', md: 'none' } }}
          >
            <MenuIcon />
          </IconButton>
          <Typography variant="h6" sx={{ fontWeight: 800, letterSpacing: 1, display: { xs: 'none', sm: 'block' }, color: 'primary.main', mr: 2 }}>
            🐦 BirdDex
          </Typography>
          {visibleNavLinks.map((link) => (
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

      {/* Mobile Drawer */}
      <Drawer
        anchor="left"
        open={mobileMenuOpen}
        onClose={closeMobileMenu}
        sx={{ display: { xs: 'block', md: 'none' } }}
      >
        <Box sx={{ width: 250, pt: 2 }}>
          <Typography variant="h6" sx={{ px: 2, mb: 2, fontWeight: 700, color: 'primary.main' }}>
            🐦 BirdDex
          </Typography>
          <Divider />
          <List>
            {visibleNavLinks.map((link) => (
              <ListItem key={link.to} disablePadding>
                <ListItemButton
                  component={Link}
                  to={link.to}
                  onClick={closeMobileMenu}
                  selected={location.pathname === link.to}
                >
                  <ListItemIcon sx={{ color: location.pathname === link.to ? 'primary.main' : 'inherit' }}>
                    {link.icon}
                  </ListItemIcon>
                  <ListItemText 
                    primary={link.label} 
                    sx={{ 
                      '& .MuiTypography-root': { 
                        fontWeight: location.pathname === link.to ? 700 : 400 
                      } 
                    }}
                  />
                </ListItemButton>
              </ListItem>
            ))}
          </List>
          
          {/* Mobile Auth Section */}
          <Divider sx={{ mt: 2 }} />
          <Box sx={{ p: 2 }}>
            {user ? (
              <Stack spacing={1}>
                <Button
                  component={Link}
                  to="/profile"
                  onClick={closeMobileMenu}
                  variant="text"
                  fullWidth
                  sx={{ justifyContent: 'flex-start', textTransform: 'none' }}
                >
                  Profile ({user.email})
                </Button>
                <Button
                  onClick={() => {
                    signOut();
                    closeMobileMenu();
                  }}
                  variant="outlined"
                  fullWidth
                  disabled={loading}
                >
                  Sign Out
                </Button>
              </Stack>
            ) : (
              <Button
                component={Link}
                to="/login"
                onClick={closeMobileMenu}
                variant="contained"
                fullWidth
              >
                Login
              </Button>
            )}
          </Box>
        </Box>
      </Drawer>
    </AppBar>
  );
};

export default NavBar;
