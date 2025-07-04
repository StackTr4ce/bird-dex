import { useState } from 'react';
import { useAuth } from '../components/AuthProvider';

const LoginPage = () => {
  const { signIn, signUp, loading, user } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [mode, setMode] = useState<'login' | 'signup'>('login');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      if (mode === 'login') {
        await signIn(email, password);
      } else {
        await signUp(email, password);
      }
    } catch (err: any) {
      setError(err.message || 'Authentication failed');
    }
  };

  if (user) {
    return <div>You are logged in as {user.email}.</div>;
  }

  return (
    <div>
      <h1>{mode === 'login' ? 'Login' : 'Sign Up'}</h1>
      <form onSubmit={handleSubmit} style={{ maxWidth: 320, margin: '0 auto' }}>
        <div>
          <label>Email</label>
          <input type="email" value={email} onChange={e => setEmail(e.target.value)} required />
        </div>
        <div>
          <label>Password</label>
          <input type="password" value={password} onChange={e => setPassword(e.target.value)} required />
        </div>
        <button type="submit" disabled={loading}>{mode === 'login' ? 'Sign In' : 'Sign Up'}</button>
        {error && <div style={{ color: 'red' }}>{error}</div>}
      </form>
      <div style={{ marginTop: 16 }}>
        {mode === 'login' ? (
          <span>Don't have an account? <button onClick={() => setMode('signup')}>Sign Up</button></span>
        ) : (
          <span>Already have an account? <button onClick={() => setMode('login')}>Login</button></span>
        )}
      </div>
    </div>
  );
};

export default LoginPage;
