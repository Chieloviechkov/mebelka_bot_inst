import { useState } from 'react';
import { useLogin, useNotify } from 'react-admin';
import {
  Box, Card, CardContent, Typography, TextField, Button,
  CircularProgress, InputAdornment, IconButton,
} from '@mui/material';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import EmailIcon from '@mui/icons-material/Email';
import LockIcon from '@mui/icons-material/Lock';
import VisibilityIcon from '@mui/icons-material/Visibility';
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff';
import LoginIcon from '@mui/icons-material/Login';

export const LoginPage = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const login = useLogin();
  const notify = useNotify();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;
    setLoading(true);
    try {
      await login({ username: email, password });
    } catch {
      notify('Невірний email або пароль', { type: 'error' });
    }
    setLoading(false);
  };

  const inputSx = {
    '& .MuiOutlinedInput-root': {
      background: '#12151f',
      borderRadius: '10px',
      '& fieldset': { borderColor: '#2d3158' },
      '&:hover fieldset': { borderColor: '#6366f1' },
      '&.Mui-focused fieldset': { borderColor: '#6366f1' },
    },
    '& .MuiInputLabel-root': { color: '#64748b' },
    '& .MuiInputLabel-root.Mui-focused': { color: '#818cf8' },
    '& input': { color: '#e2e8f0' },
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'radial-gradient(ellipse at top, #1a1d2e 0%, #0f1117 70%)',
      }}
    >
      <Card
        sx={{
          width: 420,
          background: '#1a1d2e',
          border: '1px solid #2d3158',
          boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
          borderRadius: '16px',
        }}
      >
        <CardContent sx={{ p: 4 }}>
          {/* Logo */}
          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', mb: 4 }}>
            <Box
              sx={{
                width: 56,
                height: 56,
                borderRadius: '14px',
                background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 8px 24px rgba(99,102,241,0.4)',
                mb: 2,
              }}
            >
              <AutoAwesomeIcon sx={{ fontSize: 28, color: '#fff' }} />
            </Box>
            <Typography variant="h5" sx={{ fontWeight: 800, color: '#e2e8f0' }}>
              Mebelka Bot
            </Typography>
            <Typography variant="body2" sx={{ color: '#64748b', mt: 0.5 }}>
              Увійдіть в адмін-панель
            </Typography>
          </Box>

          {/* Form */}
          <form onSubmit={handleSubmit}>
            <TextField
              fullWidth
              label="Email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              sx={{ ...inputSx, mb: 2.5 }}
              slotProps={{
                input: {
                  startAdornment: (
                    <InputAdornment position="start">
                      <EmailIcon sx={{ color: '#475569', fontSize: 20 }} />
                    </InputAdornment>
                  ),
                },
              }}
            />

            <TextField
              fullWidth
              label="Пароль"
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              sx={{ ...inputSx, mb: 3 }}
              slotProps={{
                input: {
                  startAdornment: (
                    <InputAdornment position="start">
                      <LockIcon sx={{ color: '#475569', fontSize: 20 }} />
                    </InputAdornment>
                  ),
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton
                        onClick={() => setShowPassword(!showPassword)}
                        edge="end"
                        sx={{ color: '#475569' }}
                      >
                        {showPassword ? <VisibilityOffIcon /> : <VisibilityIcon />}
                      </IconButton>
                    </InputAdornment>
                  ),
                },
              }}
            />

            <Button
              type="submit"
              fullWidth
              variant="contained"
              disabled={loading || !email || !password}
              startIcon={loading ? <CircularProgress size={20} sx={{ color: '#fff' }} /> : <LoginIcon />}
              sx={{
                py: 1.5,
                borderRadius: '10px',
                fontWeight: 700,
                fontSize: '0.95rem',
                background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                boxShadow: '0 4px 16px rgba(99,102,241,0.4)',
                '&:hover': {
                  background: 'linear-gradient(135deg, #4f46e5, #7c3aed)',
                  boxShadow: '0 6px 20px rgba(99,102,241,0.5)',
                },
                '&.Mui-disabled': {
                  background: '#2d3158',
                  color: '#475569',
                },
              }}
            >
              {loading ? 'Входжу...' : 'Увійти'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </Box>
  );
};
