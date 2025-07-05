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
import { AdminProvider, useAdmin } from './components/AdminProvider';
import ProtectedRoute from './components/ProtectedRoute';

import CssBaseline from '@mui/material/CssBaseline';
import Container from '@mui/material/Container';
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
    fontFamily: 'Inter, Montserrat, Roboto, Arial, sans-serif',
    h1: { fontFamily: 'Inter, Montserrat, Roboto, Arial, sans-serif', fontWeight: 800 },
    h2: { fontFamily: 'Inter, Montserrat, Roboto, Arial, sans-serif', fontWeight: 700 },
    h3: { fontFamily: 'Inter, Montserrat, Roboto, Arial, sans-serif', fontWeight: 700 },
    h4: { fontFamily: 'Inter, Montserrat, Roboto, Arial, sans-serif', fontWeight: 700 },
    h5: { fontFamily: 'Inter, Montserrat, Roboto, Arial, sans-serif', fontWeight: 600 },
    h6: { fontFamily: 'Inter, Montserrat, Roboto, Arial, sans-serif', fontWeight: 600 },
    button: { fontFamily: 'Inter, Montserrat, Roboto, Arial, sans-serif', fontWeight: 600 },
  },
});


// Add Google Fonts for Inter and Montserrat
const fontLink = document.createElement('link');
fontLink.rel = 'stylesheet';
fontLink.href = 'https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;800&family=Montserrat:wght@600;700;800&display=swap';
document.head.appendChild(fontLink);

// Only renders children if user is admin, otherwise redirects to home
function AdminOnly({ children }: { children: React.ReactNode }) {
  const { isAdmin } = useAdmin();
  if (!isAdmin) return <Navigate to="/" replace />;
  return <>{children}</>;
}

function App() {
  return (
    <ThemeProvider theme={darkTheme}>
      <CssBaseline />
      <AdminProvider>
        <Router>
          <NavBar />
          <Routes>
            {/* Full-width routes (outside Container) */}
            <Route path="/grid" element={
              <ProtectedRoute>
                <PhotoGridPage />
              </ProtectedRoute>
            } />
            
            {/* Constrained routes (inside Container) */}
            <Route path="/" element={
              <Container maxWidth="md" sx={{ mt: { xs: 'calc(56px + 24px)', sm: 'calc(64px + 24px)' }, mb: 4 }}>
                <HomePage />
              </Container>
            } />
            <Route path="/login" element={
              <Container maxWidth="md" sx={{ mt: { xs: 'calc(56px + 24px)', sm: 'calc(64px + 24px)' }, mb: 4 }}>
                <LoginPage />
              </Container>
            } />
            <Route path="/species/:speciesId" element={
              <ProtectedRoute>
                <Container maxWidth="md" sx={{ mt: { xs: 'calc(56px + 24px)', sm: 'calc(64px + 24px)' }, mb: 4 }}>
                  <SpeciesPage />
                </Container>
              </ProtectedRoute>
            } />
            <Route path="/leaderboard" element={
              <ProtectedRoute>
                <Container maxWidth="md" sx={{ mt: { xs: 'calc(56px + 24px)', sm: 'calc(64px + 24px)' }, mb: 4 }}>
                  <LeaderboardPage />
                </Container>
              </ProtectedRoute>
            } />
            <Route path="/friends" element={
              <ProtectedRoute>
                <Container maxWidth="md" sx={{ mt: { xs: 'calc(56px + 24px)', sm: 'calc(64px + 24px)' }, mb: 4 }}>
                  <FriendsPage />
                </Container>
              </ProtectedRoute>
            } />
            <Route path="/feed" element={
              <ProtectedRoute>
                <Container maxWidth="md" sx={{ mt: { xs: 'calc(56px + 24px)', sm: 'calc(64px + 24px)' }, mb: 4 }}>
                  <FeedPage />
                </Container>
              </ProtectedRoute>
            } />
            <Route path="/my-uploads" element={
              <ProtectedRoute>
                <Container maxWidth="md" sx={{ mt: { xs: 'calc(56px + 24px)', sm: 'calc(64px + 24px)' }, mb: 4 }}>
                  <MyUploadsPage />
                </Container>
              </ProtectedRoute>
            } />
            <Route path="/quests" element={
              <ProtectedRoute>
                <Container maxWidth="md" sx={{ mt: { xs: 'calc(56px + 24px)', sm: 'calc(64px + 24px)' }, mb: 4 }}>
                  <QuestsPage />
                </Container>
              </ProtectedRoute>
            } />
            <Route path="/quests/:questId" element={
              <ProtectedRoute>
                <Container maxWidth="md" sx={{ mt: { xs: 'calc(56px + 24px)', sm: 'calc(64px + 24px)' }, mb: 4 }}>
                  <QuestDetailPage />
                </Container>
              </ProtectedRoute>
            } />
            <Route path="/quests-admin" element={
              <ProtectedRoute>
                <AdminOnly>
                  <Container maxWidth="md" sx={{ mt: { xs: 'calc(56px + 24px)', sm: 'calc(64px + 24px)' }, mb: 4 }}>
                    <QuestsAdminPage />
                  </Container>
                </AdminOnly>
              </ProtectedRoute>
            } />
            <Route path="/profile" element={
              <ProtectedRoute>
                <Container maxWidth="md" sx={{ mt: { xs: 'calc(56px + 24px)', sm: 'calc(64px + 24px)' }, mb: 4 }}>
                  <UserProfilePage />
                </Container>
              </ProtectedRoute>
            } />
            <Route path="*" element={<Navigate to="/" />} />
          </Routes>
        </Router>
      </AdminProvider>
    </ThemeProvider>
  );
}

export default App;
