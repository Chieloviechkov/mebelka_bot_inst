import { useState, useEffect } from 'react';
import {
  Box, Typography, Card, CardContent, Avatar, Chip,
  Select, MenuItem, Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, Skeleton, TextField, Button, Dialog,
  DialogTitle, DialogContent, DialogActions, IconButton,
  FormControl, InputLabel, Alert,
} from '@mui/material';
import SupervisorAccountIcon from '@mui/icons-material/SupervisorAccount';
import BadgeIcon from '@mui/icons-material/Badge';
import GroupsIcon from '@mui/icons-material/Groups';
import AddIcon from '@mui/icons-material/Add';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import { usePermissions, useRedirect } from 'react-admin';
import api from '../api';

const API = '/admin';

const ROLES: Record<string, { label: string; color: string; bg: string }> = {
  manager: { label: 'Менеджер', color: '#6366f1', bg: 'rgba(99,102,241,0.15)' },
  supermanager: { label: 'Адміністратор', color: '#f59e0b', bg: 'rgba(245,158,11,0.15)' },
};

export const ManagersPage = () => {
  const { permissions: role } = usePermissions();
  const redirect = useRedirect();

  useEffect(() => {
    if (role && role !== 'supermanager') {
      redirect('/');
    }
  }, [role, redirect]);
  const [managers, setManagers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'manager' });
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const load = () => {
    api.get(`${API}/managers`).then(res => {
      setManagers(res.data);
      setLoading(false);
    }).catch(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const handleRoleChange = async (id: number, role: string) => {
    await api.patch(`${API}/managers/${id}/role`, { role });
    setManagers(prev => prev.map(m => m.id === id ? { ...m, role } : m));
  };

  const handleCreate = async () => {
    if (!form.name || !form.email || !form.password) {
      setError('Заповніть всі поля');
      return;
    }
    setSaving(true);
    setError('');
    try {
      const { data } = await api.post(`${API}/managers`, form);
      setManagers(prev => [...prev, { ...data, _count: { leads: 0 } }]);
      setDialogOpen(false);
      setForm({ name: '', email: '', password: '', role: 'manager' });
    } catch (e: any) {
      setError(e.response?.data?.message || 'Помилка створення');
    }
    setSaving(false);
  };

  const handleDelete = async (id: number, name: string) => {
    if (!confirm(`Видалити менеджера "${name}"?`)) return;
    await api.delete(`${API}/managers/${id}`);
    setManagers(prev => prev.filter(m => m.id !== id));
  };

  if (loading) {
    return (
      <Box sx={{ p: 3 }}>
        <Skeleton variant="rounded" height={400} sx={{ background: '#1a1d2e', borderRadius: 3 }} />
      </Box>
    );
  }

  const inputSx = {
    '& .MuiOutlinedInput-root': {
      background: '#12151f',
      borderRadius: '8px',
      '& fieldset': { borderColor: '#2d3158' },
      '&:hover fieldset': { borderColor: '#6366f1' },
      '&.Mui-focused fieldset': { borderColor: '#6366f1' },
    },
    '& .MuiInputLabel-root': { color: '#64748b' },
    '& input': { color: '#e2e8f0' },
  };

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ mb: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1 }}>
            <SupervisorAccountIcon sx={{ color: '#6366f1', fontSize: 28 }} />
            <Typography variant="h4" sx={{ fontWeight: 800, color: '#e2e8f0' }}>
              Менеджери
            </Typography>
          </Box>
          <Typography variant="body2" sx={{ color: '#475569' }}>
            Керування менеджерами та їхніми ролями
          </Typography>
        </Box>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => setDialogOpen(true)}
          sx={{
            background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
            fontWeight: 700,
            borderRadius: '10px',
            px: 3,
            '&:hover': { background: 'linear-gradient(135deg, #4f46e5, #7c3aed)' },
          }}
        >
          Додати менеджера
        </Button>
      </Box>

      {/* Stats */}
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(3, 1fr)' }, gap: 2, mb: 3 }}>
        <Card>
          <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Box sx={{ width: 44, height: 44, borderRadius: '12px', background: 'rgba(99,102,241,0.2)', border: '1px solid rgba(99,102,241,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <GroupsIcon sx={{ color: '#6366f1' }} />
            </Box>
            <Box>
              <Typography variant="caption" sx={{ color: '#64748b', fontWeight: 600, textTransform: 'uppercase', fontSize: '0.7rem' }}>Всього</Typography>
              <Typography variant="h4" sx={{ fontWeight: 800, color: '#e2e8f0', lineHeight: 1 }}>{managers.length}</Typography>
            </Box>
          </CardContent>
        </Card>
        <Card>
          <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Box sx={{ width: 44, height: 44, borderRadius: '12px', background: 'rgba(245,158,11,0.2)', border: '1px solid rgba(245,158,11,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <BadgeIcon sx={{ color: '#f59e0b' }} />
            </Box>
            <Box>
              <Typography variant="caption" sx={{ color: '#64748b', fontWeight: 600, textTransform: 'uppercase', fontSize: '0.7rem' }}>Адміністраторів</Typography>
              <Typography variant="h4" sx={{ fontWeight: 800, color: '#e2e8f0', lineHeight: 1 }}>{managers.filter(m => m.role === 'supermanager').length}</Typography>
            </Box>
          </CardContent>
        </Card>
        <Card>
          <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Box sx={{ width: 44, height: 44, borderRadius: '12px', background: 'rgba(34,197,94,0.2)', border: '1px solid rgba(34,197,94,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <SupervisorAccountIcon sx={{ color: '#22c55e' }} />
            </Box>
            <Box>
              <Typography variant="caption" sx={{ color: '#64748b', fontWeight: 600, textTransform: 'uppercase', fontSize: '0.7rem' }}>Лідів під керуванням</Typography>
              <Typography variant="h4" sx={{ fontWeight: 800, color: '#e2e8f0', lineHeight: 1 }}>{managers.reduce((s, m) => s + (m._count?.leads || 0), 0)}</Typography>
            </Box>
          </CardContent>
        </Card>
      </Box>

      {/* Table */}
      <Card>
        <TableContainer sx={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell sx={{ color: '#64748b', fontWeight: 700, fontSize: '0.72rem', textTransform: 'uppercase', background: '#12151f' }}>Менеджер</TableCell>
                <TableCell sx={{ color: '#64748b', fontWeight: 700, fontSize: '0.72rem', textTransform: 'uppercase', background: '#12151f' }}>Email</TableCell>
                <TableCell sx={{ color: '#64748b', fontWeight: 700, fontSize: '0.72rem', textTransform: 'uppercase', background: '#12151f' }}>Роль</TableCell>
                <TableCell sx={{ color: '#64748b', fontWeight: 700, fontSize: '0.72rem', textTransform: 'uppercase', background: '#12151f' }}>Лідів</TableCell>
                <TableCell sx={{ color: '#64748b', fontWeight: 700, fontSize: '0.72rem', textTransform: 'uppercase', background: '#12151f', width: 50 }}></TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {managers.map(m => {
                const r = ROLES[m.role] || ROLES.manager;
                return (
                  <TableRow key={m.id} sx={{ '&:hover': { background: 'rgba(99,102,241,0.05)' } }}>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                        <Avatar sx={{ width: 36, height: 36, background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', fontWeight: 700, fontSize: '0.9rem' }}>
                          {(m.name || 'M')[0].toUpperCase()}
                        </Avatar>
                        <Typography variant="body2" sx={{ fontWeight: 600, color: '#e2e8f0' }}>{m.name || `Manager #${m.id}`}</Typography>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" sx={{ color: '#94a3b8' }}>{m.email || '—'}</Typography>
                    </TableCell>
                    <TableCell>
                      <Select
                        value={m.role || 'manager'}
                        size="small"
                        onChange={(e) => handleRoleChange(m.id, e.target.value)}
                        sx={{
                          background: r.bg,
                          color: r.color,
                          fontWeight: 700,
                          fontSize: '0.8rem',
                          borderRadius: '8px',
                          '& .MuiOutlinedInput-notchedOutline': { borderColor: `${r.color}40` },
                          '& .MuiSelect-icon': { color: r.color },
                        }}
                      >
                        <MenuItem value="manager">Менеджер</MenuItem>
                        <MenuItem value="supermanager">Адміністратор</MenuItem>
                      </Select>
                    </TableCell>
                    <TableCell>
                      <Chip label={m._count?.leads || 0} size="small" sx={{ background: '#1e2235', color: '#94a3b8', fontWeight: 700 }} />
                    </TableCell>
                    <TableCell>
                      <IconButton size="small" onClick={() => handleDelete(m.id, m.name)} sx={{ color: '#ef4444', '&:hover': { background: 'rgba(239,68,68,0.1)' } }}>
                        <DeleteOutlineIcon sx={{ fontSize: 18 }} />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                );
              })}
              {managers.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} sx={{ textAlign: 'center', py: 6 }}>
                    <Typography variant="body2" sx={{ color: '#475569' }}>Менеджерів ще немає</Typography>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Card>

      {/* Create Dialog */}
      <Dialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        PaperProps={{
          sx: {
            background: '#1a1d2e',
            border: '1px solid #2d3158',
            borderRadius: '14px',
            minWidth: 420,
          },
        }}
      >
        <DialogTitle sx={{ color: '#e2e8f0', fontWeight: 700 }}>Новий менеджер</DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: '16px !important' }}>
          {error && <Alert severity="error" sx={{ background: 'rgba(239,68,68,0.1)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.3)' }}>{error}</Alert>}
          <TextField
            label="Ім'я"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            fullWidth
            sx={inputSx}
          />
          <TextField
            label="Email"
            type="email"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            fullWidth
            sx={inputSx}
          />
          <TextField
            label="Пароль"
            type="password"
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
            fullWidth
            sx={inputSx}
          />
          <FormControl fullWidth>
            <InputLabel sx={{ color: '#64748b' }}>Роль</InputLabel>
            <Select
              value={form.role}
              label="Роль"
              onChange={(e) => setForm({ ...form, role: e.target.value })}
              sx={{
                background: '#12151f',
                borderRadius: '8px',
                color: '#e2e8f0',
                '& .MuiOutlinedInput-notchedOutline': { borderColor: '#2d3158' },
                '& .MuiSelect-icon': { color: '#64748b' },
              }}
            >
              <MenuItem value="manager">Менеджер</MenuItem>
              <MenuItem value="supermanager">Адміністратор</MenuItem>
            </Select>
          </FormControl>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 3 }}>
          <Button onClick={() => setDialogOpen(false)} sx={{ color: '#64748b' }}>Скасувати</Button>
          <Button
            onClick={handleCreate}
            variant="contained"
            disabled={saving}
            sx={{
              background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
              fontWeight: 700,
              borderRadius: '8px',
              '&:hover': { background: 'linear-gradient(135deg, #4f46e5, #7c3aed)' },
            }}
          >
            {saving ? 'Створюю...' : 'Створити'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};
