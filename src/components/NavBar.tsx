import { Link, useLocation } from 'react-router-dom';
import { useAuth } from './AuthProvider';
import './NavBar.css';

const navLinks = [
  { to: '/', label: 'Home' },
  { to: '/grid', label: 'Photo Grid' },
  { to: '/leaderboard', label: 'Leaderboard' },
  { to: '/friends', label: 'Friends' },
  { to: '/feed', label: 'Feed' },
  { to: '/my-uploads', label: 'My Uploads' },
  { to: '/quests', label: 'Quests' },
];

const NavBar = () => {
  const location = useLocation();
  const { user, signOut, loading } = useAuth();
  return (
    <nav className="navbar">
      <ul>
        {navLinks.map((link) => (
          <li key={link.to} className={location.pathname === link.to ? 'active' : ''}>
            <Link to={link.to}>{link.label}</Link>
          </li>
        ))}
      </ul>
      <div className="navbar-user">
        {user ? (
          <>
            <span style={{ marginRight: 8 }}>Signed in as {user.email}</span>
            <button onClick={signOut} disabled={loading}>Sign Out</button>
          </>
        ) : (
          <Link to="/login">Login</Link>
        )}
      </div>
    </nav>
  );
};

export default NavBar;
