import { useState } from 'react';
import {
  Box,
  Typography,
  TextField,
  Button,
  Alert,
  Divider,
  CircularProgress,
  Stack,
  Link,
  IconButton,
  InputAdornment,
  Modal,
  Paper,
} from '@mui/material';
import {
  Login as LoginIcon,
  PersonAdd as SignUpIcon,
  Visibility,
  VisibilityOff,
  Close as CloseIcon,
} from '@mui/icons-material';
import { useAuth } from '../components/AuthProvider';
import { useNavigate } from 'react-router-dom';
import { useEffect } from 'react';

const LoginPage = () => {
  const { signIn, signUp, loading, user } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [showPassword, setShowPassword] = useState(false);

  // Redirect if already logged in
  useEffect(() => {
    if (user) {
      navigate('/');
    }
  }, [user, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    
    // Basic validation
    if (!email.trim() || !password.trim()) {
      setError('Please fill in all fields');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    try {
      if (mode === 'login') {
        await signIn(email, password);
      } else {
        await signUp(email, password);
      }
    } catch (err: any) {
      console.error(`${mode} error:`, err);
      const errorMessage = err.message || (mode === 'login' ? 'Login failed' : 'Sign up failed');
      setError(errorMessage);
    }
  };

  const toggleMode = () => {
    setMode(mode === 'login' ? 'signup' : 'login');
    setError(null);
    setEmail('');
    setPassword('');
  };

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  const handleClose = () => {
    navigate('/');
  };

  if (user) {
    return null; // Will redirect via useEffect
  }

  return (
    <Modal
      open={true}
      onClose={handleClose}
      sx={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        p: 2,
      }}
    >
      <Paper
        elevation={8}
        sx={{
          width: '100%',
          maxWidth: 450,
          maxHeight: '90vh',
          overflow: 'auto',
          borderRadius: 3,
          position: 'relative',
        }}
      >
        {/* Close Button */}
        <IconButton
          onClick={handleClose}
          sx={{
            position: 'absolute',
            right: 8,
            top: 8,
            zIndex: 1,
          }}
        >
          <CloseIcon />
        </IconButton>

        <Box sx={{ p: 4, pt: 5 }}>
          {/* Header */}
          <Box sx={{ textAlign: 'center', mb: 4 }}>
            <Typography variant="h4" fontWeight={700} color="primary.main" gutterBottom>
              BirdDex
            </Typography>
            <Typography variant="h5" fontWeight={600} gutterBottom>
              {mode === 'login' ? 'Welcome Back' : 'Join BirdDex'}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {mode === 'login' 
                ? 'Sign in to your bird photography collection'
                : 'Start cataloging your bird photos today'
              }
            </Typography>
          </Box>

          {/* Form */}
          <Box component="form" onSubmit={handleSubmit}>
            <Stack spacing={3}>
              {/* Error Alert */}
              {error && (
                <Alert severity="error" sx={{ mb: 2 }}>
                  {error}
                </Alert>
              )}

              {/* Email Field */}
              <TextField
                fullWidth
                label="Email Address"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                variant="outlined"
                autoComplete="email"
                disabled={loading}
                size="medium"
              />

              {/* Password Field */}
              <TextField
                fullWidth
                label="Password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                variant="outlined"
                autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                disabled={loading}
                size="medium"
                InputProps={{
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton
                        onClick={togglePasswordVisibility}
                        edge="end"
                        disabled={loading}
                      >
                        {showPassword ? <VisibilityOff /> : <Visibility />}
                      </IconButton>
                    </InputAdornment>
                  ),
                }}
                helperText={mode === 'signup' ? 'Password must be at least 6 characters' : ''}
              />

              {/* Submit Button */}
              <Button
                type="submit"
                fullWidth
                variant="contained"
                size="large"
                disabled={loading}
                startIcon={
                  loading ? (
                    <CircularProgress size={20} color="inherit" />
                  ) : mode === 'login' ? (
                    <LoginIcon />
                  ) : (
                    <SignUpIcon />
                  )
                }
                sx={{ py: 1.5, mt: 2 }}
              >
                {loading 
                  ? 'Please wait...' 
                  : mode === 'login' 
                    ? 'Sign In' 
                    : 'Create Account'
                }
              </Button>
            </Stack>
          </Box>

          {/* Mode Toggle */}
          <Box sx={{ mt: 4, textAlign: 'center' }}>
            <Divider sx={{ mb: 2 }}>
              <Typography variant="body2" color="text.secondary">
                OR
              </Typography>
            </Divider>
            
            <Typography variant="body2" color="text.secondary">
              {mode === 'login' 
                ? "Don't have an account? " 
                : "Already have an account? "
              }
              <Link
                component="button"
                type="button"
                variant="body2"
                onClick={toggleMode}
                disabled={loading}
                sx={{ 
                  textDecoration: 'none',
                  fontWeight: 600,
                  '&:hover': { textDecoration: 'underline' }
                }}
              >
                {mode === 'login' ? 'Sign Up' : 'Sign In'}
              </Link>
            </Typography>
          </Box>

          {/* Footer */}
          <Box sx={{ mt: 3, textAlign: 'center' }}>
            <Typography variant="caption" color="text.secondary">
              By continuing, you agree to BirdDex's Terms of Service and Privacy Policy
            </Typography>
          </Box>
        </Box>
      </Paper>
    </Modal>
  );
};

export default LoginPage;
