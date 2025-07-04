import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import HomePage from './pages/HomePage';
import PhotoGridPage from './pages/PhotoGridPage';
import SpeciesPage from './pages/SpeciesPage';
import LeaderboardPage from './pages/LeaderboardPage';
import FriendsPage from './pages/FriendsPage';
import FeedPage from './pages/FeedPage';
import MyUploadsPage from './pages/MyUploadsPage';
import QuestsPage from './pages/QuestsPage';

import QuestsAdminPage from './pages/QuestsAdminPage';
import QuestDetailPage from './pages/QuestDetailPage';
import LoginPage from './pages/LoginPage';
import UserProfilePage from './pages/UserProfilePage';
import NavBar from './components/NavBar';

import CssBaseline from '@mui/material/CssBaseline';
import Container from '@mui/material/Container';
import Box from '@mui/material/Box';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import './App.css';



const darkTheme = createTheme({
  palette: {
    mode: 'dark',
    background: {
      default: '#181a20',
      paper: '#23262f',
    },
    primary: {
      main: '#90caf9',
    },
    secondary: {
      main: '#f48fb1',
    },
    text: {
      primary: '#fff',
      secondary: '#b0b8c1',
    },
  },
  typography: {
    fontFamily: [
      'Inter',
      'Montserrat',
      'Roboto',
      'Segoe UI',
      'Arial',
      'sans-serif',
    ].join(','),
    h1: { fontFamily: 'Montserrat, Inter, Roboto, Arial, sans-serif', fontWeight: 800 },
    h2: { fontFamily: 'Montserrat, Inter, Roboto, Arial, sans-serif', fontWeight: 700 },
    h3: { fontFamily: 'Montserrat, Inter, Roboto, Arial, sans-serif', fontWeight: 700 },
    h4: { fontFamily: 'Montserrat, Inter, Roboto, Arial, sans-serif', fontWeight: 700 },
    h5: { fontFamily: 'Montserrat, Inter, Roboto, Arial, sans-serif', fontWeight: 600 },
    h6: { fontFamily: 'Montserrat, Inter, Roboto, Arial, sans-serif', fontWeight: 600 },
    button: { fontFamily: 'Inter, Montserrat, Roboto, Arial, sans-serif', fontWeight: 600 },
  },
});


// Add Google Fonts for Inter and Montserrat
const fontLink = document.createElement('link');
fontLink.rel = 'stylesheet';
fontLink.href = 'https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;800&family=Montserrat:wght@600;700;800&display=swap';
document.head.appendChild(fontLink);

function App() {
  return (
    <ThemeProvider theme={darkTheme}>
      <CssBaseline />
      <Router>
        <NavBar />
        {/* Spacer for fixed NavBar */}
        <Box sx={{ height: { xs: 56, sm: 64 }, width: '100%' }} />
        <Container maxWidth="md" sx={{ mt: 3, mb: 4 }}>
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/grid" element={<PhotoGridPage />} />
            <Route path="/species/:speciesId" element={<SpeciesPage />} />
            <Route path="/leaderboard" element={<LeaderboardPage />} />
            <Route path="/friends" element={<FriendsPage />} />
            <Route path="/feed" element={<FeedPage />} />
            <Route path="/my-uploads" element={<MyUploadsPage />} />
            <Route path="/quests" element={<QuestsPage />} />
            <Route path="/quests/:questId" element={<QuestDetailPage />} />
            <Route path="/quests-admin" element={<QuestsAdminPage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/profile" element={<UserProfilePage />} />
            <Route path="*" element={<Navigate to="/" />} />
          </Routes>
        </Container>
      </Router>
    </ThemeProvider>
  );
}

export default App;
