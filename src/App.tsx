import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import HomePage from './pages/HomePage';
import PhotoGridPage from './pages/PhotoGridPage';
import SpeciesPage from './pages/SpeciesPage';
import LeaderboardPage from './pages/LeaderboardPage';
import FriendsPage from './pages/FriendsPage';
import FeedPage from './pages/FeedPage';
import MyUploadsPage from './pages/MyUploadsPage';
import QuestsPage from './pages/QuestsPage';
import LoginPage from './pages/LoginPage';
import NavBar from './components/NavBar';
import './App.css';

function App() {
  return (
    <Router>
      <NavBar />
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/grid" element={<PhotoGridPage />} />
        <Route path="/species/:speciesId" element={<SpeciesPage />} />
        <Route path="/leaderboard" element={<LeaderboardPage />} />
        <Route path="/friends" element={<FriendsPage />} />
        <Route path="/feed" element={<FeedPage />} />
        <Route path="/my-uploads" element={<MyUploadsPage />} />
        <Route path="/quests" element={<QuestsPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </Router>
  );
}

export default App;
