import { Show, useShowContext, useNotify } from 'react-admin';
import {
  Box, Typography, Card, CardContent, Chip,
  TextField as MuiTextField, Button, Avatar, IconButton, Badge,
  Popover, Checkbox, FormControlLabel, CircularProgress,
} from '@mui/material';
import OpenInFullIcon from '@mui/icons-material/OpenInFull';
import SendIcon from '@mui/icons-material/Send';
import NotesIcon from '@mui/icons-material/Notes';
import HistoryIcon from '@mui/icons-material/History';
import ChatIcon from '@mui/icons-material/Chat';
import PersonIcon from '@mui/icons-material/Person';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import AlarmIcon from '@mui/icons-material/Alarm';
import SupervisorsIcon from '@mui/icons-material/SupervisorAccount';
import PhoneIcon from '@mui/icons-material/Phone';
import LocationOnIcon from '@mui/icons-material/LocationOn';
import PersonAddIcon from '@mui/icons-material/PersonAdd';
import { useState } from 'react';
import api from '../../api';
import { getStatusConfig } from '../../utils/statusMaps';

const API = '/admin';

/* ------------------------------------------------------------------ */
/*  Reusable building blocks                                          */
/* ------------------------------------------------------------------ */

const InfoCard = ({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) => (
  <Card sx={{ height: '100%', background: '#1a1d2e', border: '1px solid #2d3158' }}>
    <CardContent>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
        <Box sx={{ color: '#6366f1' }}>{icon}</Box>
        <Typography
          variant="subtitle2"
          sx={{ fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', fontSize: '0.72rem', letterSpacing: '0.08em' }}
        >
          {title}
        </Typography>
      </Box>
      {children}
    </CardContent>
  </Card>
);

import EditIcon from '@mui/icons-material/Edit';
import CheckIcon from '@mui/icons-material/Check';

const EditableDetailRow = ({ label, value, field, onSave }: { label: string; value?: string | null; field: string; leadId?: number; onSave?: (field: string, val: string) => void }) => {
  const [editing, setEditing] = useState(false);
  const [val, setVal] = useState(value || '');

  if (editing) {
    return (
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, py: 0.5, borderBottom: '1px solid #1e2235' }}>
        <Typography variant="body2" sx={{ color: '#64748b', minWidth: 100, flexShrink: 0 }}>{label}</Typography>
        <MuiTextField
          size="small" fullWidth value={val} onChange={e => setVal(e.target.value)} autoFocus
          onKeyDown={e => { if (e.key === 'Enter') { setEditing(false); onSave?.(field, val); } if (e.key === 'Escape') setEditing(false); }}
          sx={{ '& .MuiOutlinedInput-root': { background: '#12151f', borderRadius: '6px', '& fieldset': { borderColor: '#2d3158' }, '& input': { py: 0.5, fontSize: '0.85rem' } } }}
        />
        <IconButton size="small" onClick={() => { setEditing(false); onSave?.(field, val); }} sx={{ color: '#22c55e' }}>
          <CheckIcon sx={{ fontSize: 16 }} />
        </IconButton>
      </Box>
    );
  }

  return (
    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', py: 0.8, borderBottom: '1px solid #1e2235', '&:hover .edit-btn': { opacity: 1 } }}>
      <Typography variant="body2" sx={{ color: '#64748b' }}>{label}</Typography>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
        <Typography variant="body2" sx={{ color: '#e2e8f0', fontWeight: 500, maxWidth: '60%', textAlign: 'right' }}>
          {value ?? '—'}
        </Typography>
        <IconButton className="edit-btn" size="small" onClick={() => { setVal(value || ''); setEditing(true); }} sx={{ opacity: 0, transition: 'opacity 0.2s', color: '#64748b', p: 0.3 }}>
          <EditIcon sx={{ fontSize: 14 }} />
        </IconButton>
      </Box>
    </Box>
  );
};

const DetailRow = ({ label, value }: { label: string; value?: string | null }) => (
  <Box sx={{ display: 'flex', justifyContent: 'space-between', py: 0.8, borderBottom: '1px solid #1e2235' }}>
    <Typography variant="body2" sx={{ color: '#64748b' }}>{label}</Typography>
    <Typography variant="body2" sx={{ color: '#e2e8f0', fontWeight: 500, maxWidth: '60%', textAlign: 'right' }}>
      {value ?? '—'}
    </Typography>
  </Box>
);

/* ------------------------------------------------------------------ */
/*  Reminder status color map                                         */
/* ------------------------------------------------------------------ */

const REMINDER_STATUS: Record<string, { color: string; bg: string; label: string }> = {
  pending:   { color: '#fbbf24', bg: 'rgba(245,158,11,0.10)', label: 'Очікує' },
  sent:      { color: '#22c55e', bg: 'rgba(34,197,94,0.10)',  label: 'Надіслано' },
  failed:    { color: '#ef4444', bg: 'rgba(239,68,68,0.10)',  label: 'Помилка' },
  cancelled: { color: '#94a3b8', bg: 'rgba(148,163,184,0.10)', label: 'Скасовано' },
};

/* ------------------------------------------------------------------ */
/*  Notes panel                                                       */
/* ------------------------------------------------------------------ */

const NotesPanel = ({ initialNotes, leadId }: { initialNotes: any[]; leadId: number }) => {
  const [notes, setNotes] = useState<any[]>(initialNotes ?? []);
  const [text, setText] = useState('');
  const notify = useNotify();

  const handleAdd = async () => {
    if (!text.trim()) return;
    try {
      const res = await api.post(`${API}/leads/${leadId}/notes`, { text });
      setNotes([res.data, ...notes]);
      setText('');
      notify('Нотатку додано', { type: 'success' });
    } catch {
      notify('Помилка', { type: 'error' });
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await api.delete(`${API}/notes/${id}`);
      setNotes(notes.filter(n => n.id !== id));
    } catch {
      notify('Помилка видалення', { type: 'error' });
    }
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
        <MuiTextField
          fullWidth
          size="small"
          placeholder="Коментар..."
          value={text}
          onChange={e => setText(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleAdd()}
          sx={{ '& .MuiOutlinedInput-root': { background: '#12151f', borderRadius: '8px', '& fieldset': { borderColor: '#2d3158' } } }}
        />
        <Button variant="contained" onClick={handleAdd} sx={{ borderRadius: '8px', minWidth: 50 }}>
          <SendIcon fontSize="small" />
        </Button>
      </Box>
      <Box sx={{ maxHeight: 260, overflowY: 'auto', pr: 1 }}>
        {notes.length === 0 && (
          <Typography variant="body2" sx={{ color: '#334155', textAlign: 'center', py: 2 }}>Нотаток немає</Typography>
        )}
        {notes.map(note => (
          <Box key={note.id} sx={{ mb: 1, p: 1.5, background: '#12151f', borderRadius: '8px', border: '1px solid #1e2235', position: 'relative' }}>
            <Typography variant="body2" sx={{ color: '#e2e8f0', pr: 3 }}>{note.text}</Typography>
            <Typography variant="caption" sx={{ color: '#475569', display: 'block', mt: 0.5 }}>
              {new Date(note.createdAt).toLocaleString('uk-UA')}
            </Typography>
            <IconButton size="small" onClick={() => handleDelete(note.id)} sx={{ position: 'absolute', top: 4, right: 4, color: '#ef4444' }}>
              <DeleteOutlineIcon sx={{ fontSize: 16 }} />
            </IconButton>
          </Box>
        ))}
      </Box>
    </Box>
  );
};

/* ------------------------------------------------------------------ */
/*  Reminders panel                                                   */
/* ------------------------------------------------------------------ */

const RemindersPanel = ({ initialReminders, leadId }: { initialReminders: any[]; leadId: number }) => {
  const [reminders, setReminders] = useState<any[]>(
    [...(initialReminders ?? [])].sort((a, b) => new Date(a.time).getTime() - new Date(b.time).getTime()),
  );
  const [timeStr, setTimeStr] = useState('');
  const notify = useNotify();

  const handleAdd = async () => {
    if (!timeStr) return;
    try {
      const res = await api.post(`${API}/leads/${leadId}/reminders`, { time: new Date(timeStr).toISOString() });
      setReminders(prev =>
        [...prev, res.data].sort((a, b) => new Date(a.time).getTime() - new Date(b.time).getTime()),
      );
      setTimeStr('');
      notify('Нагадування створено', { type: 'success' });
    } catch {
      notify('Помилка', { type: 'error' });
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await api.delete(`${API}/reminders/${id}`);
      setReminders(reminders.filter(r => r.id !== id));
    } catch {
      notify('Помилка видалення', { type: 'error' });
    }
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
        <MuiTextField
          fullWidth
          size="small"
          type="datetime-local"
          value={timeStr}
          onChange={e => setTimeStr(e.target.value)}
          sx={{
            '& .MuiOutlinedInput-root': { background: '#12151f', borderRadius: '8px', '& fieldset': { borderColor: '#2d3158' } },
            input: { colorScheme: 'dark' },
          }}
        />
        <Button variant="contained" onClick={handleAdd} sx={{ borderRadius: '8px', minWidth: 50, background: '#f59e0b', '&:hover': { background: '#d97706' } }}>
          <AlarmIcon fontSize="small" />
        </Button>
      </Box>
      <Box sx={{ maxHeight: 200, overflowY: 'auto', pr: 1 }}>
        {reminders.length === 0 && (
          <Typography variant="body2" sx={{ color: '#334155', textAlign: 'center', py: 2 }}>Нагадувань немає</Typography>
        )}
        {reminders.map(r => {
          const st = REMINDER_STATUS[r.status] ?? REMINDER_STATUS.pending;
          return (
            <Box
              key={r.id}
              sx={{
                mb: 1, p: 1, borderRadius: '8px',
                background: st.bg,
                border: `1px solid ${st.color}33`,
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              }}
            >
              <Box>
                <Typography variant="body2" sx={{ color: st.color, fontWeight: 600 }}>{st.label}</Typography>
                <Typography variant="caption" sx={{ color: st.color, opacity: 0.85 }}>
                  {new Date(r.time).toLocaleString('uk-UA')}
                </Typography>
              </Box>
              <IconButton size="small" onClick={() => handleDelete(r.id)} sx={{ color: '#ef4444' }}>
                <DeleteOutlineIcon sx={{ fontSize: 16 }} />
              </IconButton>
            </Box>
          );
        })}
      </Box>
    </Box>
  );
};

/* ------------------------------------------------------------------ */
/*  Managers panel with add/remove                                     */
/* ------------------------------------------------------------------ */

const ManagersPanel = ({ initialManagers, leadId }: { initialManagers: any[]; leadId: number }) => {
  const [managers, setManagers] = useState<any[]>(initialManagers);
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);
  const [allManagers, setAllManagers] = useState<any[]>([]);
  const [loadingMgrs, setLoadingMgrs] = useState(false);
  const [toggling, setToggling] = useState<number | null>(null);
  const notify = useNotify();

  const assignedIds = new Set(managers.map((m: any) => m.id));

  const handleOpen = (e: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(e.currentTarget);
    if (allManagers.length === 0) {
      setLoadingMgrs(true);
      api.get(`${API}/managers`).then(res => {
        setAllManagers(res.data || []);
        setLoadingMgrs(false);
      }).catch(() => setLoadingMgrs(false));
    }
  };

  const handleToggle = async (manager: any) => {
    setToggling(manager.id);
    try {
      if (assignedIds.has(manager.id)) {
        await api.delete(`${API}/leads/${leadId}/assign/${manager.id}`);
        setManagers(prev => prev.filter((m: any) => m.id !== manager.id));
        notify('Менеджера знято', { type: 'success' });
      } else {
        await api.post(`${API}/leads/${leadId}/assign`, { manager_id: manager.id });
        setManagers(prev => [...prev, manager]);
        notify('Менеджера призначено', { type: 'success' });
      }
    } catch {
      notify('Помилка', { type: 'error' });
    }
    setToggling(null);
  };

  return (
    <Box>
      {managers.length > 0 ? (
        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 1.5 }}>
          {managers.map((m: any) => (
            <Chip
              key={m.id}
              label={m.name || m.telegram_id}
              avatar={<Avatar sx={{ bgcolor: '#6366f1' }}>{(m.name || 'M')[0]}</Avatar>}
              onDelete={() => handleToggle(m)}
              sx={{ background: '#1e2235', color: '#e2e8f0', border: '1px solid #2d3158' }}
            />
          ))}
        </Box>
      ) : (
        <Typography variant="body2" sx={{ color: '#475569', mb: 1.5 }}>Немає призначених менеджерів</Typography>
      )}
      <Button
        size="small"
        startIcon={<PersonAddIcon />}
        onClick={handleOpen}
        sx={{ color: '#818cf8', fontWeight: 600, '&:hover': { background: 'rgba(99,102,241,0.1)' } }}
      >
        Додати менеджера
      </Button>
      <Popover
        open={Boolean(anchorEl)}
        anchorEl={anchorEl}
        onClose={() => setAnchorEl(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
        transformOrigin={{ vertical: 'top', horizontal: 'left' }}
        PaperProps={{ sx: { background: '#1a1d2e', border: '1px solid #2d3158', borderRadius: '10px', p: 1.5, minWidth: 220 } }}
      >
        <Typography variant="caption" sx={{ color: '#64748b', fontWeight: 700, textTransform: 'uppercase', fontSize: '0.65rem', letterSpacing: '0.08em', display: 'block', mb: 1 }}>
          Менеджери
        </Typography>
        {loadingMgrs && <CircularProgress size={20} sx={{ display: 'block', mx: 'auto', my: 1 }} />}
        {allManagers.map((m: any) => (
          <FormControlLabel
            key={m.id}
            control={
              <Checkbox
                checked={assignedIds.has(m.id)}
                onChange={() => handleToggle(m)}
                disabled={toggling === m.id}
                size="small"
                sx={{ color: '#475569', '&.Mui-checked': { color: '#6366f1' } }}
              />
            }
            label={
              <Typography variant="body2" sx={{ color: '#e2e8f0', fontSize: '0.85rem' }}>
                {m.name || m.email || m.telegram_id}
              </Typography>
            }
            sx={{ display: 'flex', mx: 0, '&:hover': { background: 'rgba(99,102,241,0.05)', borderRadius: '6px' } }}
          />
        ))}
        {!loadingMgrs && allManagers.length === 0 && (
          <Typography variant="body2" sx={{ color: '#475569', textAlign: 'center', py: 1 }}>Немає менеджерів</Typography>
        )}
      </Popover>
    </Box>
  );
};

/* ------------------------------------------------------------------ */
/*  Main content                                                      */
/* ------------------------------------------------------------------ */

const LeadShowContent = () => {
  const { record } = useShowContext();
  if (!record) return null;

  const statusCfg = getStatusConfig(record.status ?? '');
  const displayName = record.instagram_name || record.username || record.instagram_id || `Lead #${record.id}`;

  // Extract managers from leadManagers relation
  const managers = (record.leadManagers ?? []).map((lm: any) => lm.manager).filter(Boolean);

  return (
    <Box sx={{ p: 2 }}>
      {/* ========== 1. HEADER ========== */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
        <Avatar
          sx={{
            width: 64, height: 64,
            background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
            fontSize: '1.8rem', fontWeight: 700,
          }}
        >
          {displayName[0].toUpperCase()}
        </Avatar>
        <Box sx={{ flex: 1 }}>
          <Typography variant="h5" sx={{ fontWeight: 800, color: '#e2e8f0', display: 'flex', alignItems: 'center', gap: 1.5, flexWrap: 'wrap' }}>
            {displayName}
            <Chip
              label={statusCfg.label}
              size="small"
              sx={{
                background: statusCfg.bg,
                color: statusCfg.color,
                fontWeight: 700,
                border: `1px solid ${statusCfg.border}`,
                height: 28,
              }}
            />
          </Typography>
          <Box sx={{ display: 'flex', gap: 2, mt: 0.5, alignItems: 'center', flexWrap: 'wrap' }}>
            {(record.instagram_username || record.instagram_id) && (
              <Typography variant="body2" sx={{ color: '#94a3b8' }}>
                {record.instagram_username ? `@${record.instagram_username}` : ''}
              </Typography>
            )}
            {record.phone && (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <PhoneIcon sx={{ fontSize: 14, color: '#64748b' }} />
                <Typography variant="body2" sx={{ color: '#94a3b8' }}>{record.phone}</Typography>
              </Box>
            )}
            {record.location && (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <LocationOnIcon sx={{ fontSize: 14, color: '#64748b' }} />
                <Typography variant="body2" sx={{ color: '#94a3b8' }}>{record.location}</Typography>
              </Box>
            )}
          </Box>
        </Box>
      </Box>

      {/* ========== 2. MIDDLE: 3-column grid ========== */}
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', lg: '1fr 1fr 1fr' }, gap: 2, mb: 2 }}>
        {/* Client card */}
        <InfoCard title="Картка клієнта" icon={<PersonIcon />}>
          {(() => {
            const handleFieldSave = async (field: string, val: string) => {
              try {
                await api.patch(`${API}/leads/${record.id}`, { [field]: val });
              } catch { /* ignore */ }
            };
            return (<>
              <EditableDetailRow label="Ім'я" value={record.instagram_name} field="instagram_name" leadId={record.id} onSave={handleFieldSave} />
              <EditableDetailRow label="Телефон" value={record.phone} field="phone" leadId={record.id} onSave={handleFieldSave} />
              <EditableDetailRow label="Тип меблів" value={record.type} field="type" leadId={record.id} onSave={handleFieldSave} />
              <EditableDetailRow label="Розміри" value={record.dimensions} field="dimensions" leadId={record.id} onSave={handleFieldSave} />
              <EditableDetailRow label="Стиль" value={record.style} field="style" leadId={record.id} onSave={handleFieldSave} />
              <EditableDetailRow label="Матеріали" value={record.materials} field="materials" leadId={record.id} onSave={handleFieldSave} />
              <EditableDetailRow label="Бюджет" value={record.budget} field="budget" leadId={record.id} onSave={handleFieldSave} />
              <EditableDetailRow label="Ціна за м²" value={record.price_per_sqm} field="price_per_sqm" leadId={record.id} onSave={handleFieldSave} />
              <EditableDetailRow label="Терміни" value={record.timeline} field="timeline" leadId={record.id} onSave={handleFieldSave} />
              <EditableDetailRow label="Місцезнаходження" value={record.location} field="location" leadId={record.id} onSave={handleFieldSave} />
              <DetailRow label="Є проект" value={record.has_project != null ? (record.has_project ? 'Так' : 'Ні') : null} />
              <EditableDetailRow label="Побажання" value={record.wishes} field="wishes" leadId={record.id} onSave={handleFieldSave} />
            </>);
          })()}
        </InfoCard>

        {/* Managers + Reminders stacked */}
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <InfoCard title="Призначені менеджери" icon={<SupervisorsIcon />}>
            <ManagersPanel initialManagers={managers} leadId={record.id} />
          </InfoCard>

          <Box sx={{ flex: 1 }}>
            <InfoCard title="Нагадування" icon={<AlarmIcon />}>
              <RemindersPanel initialReminders={record.reminders ?? []} leadId={record.id} />
            </InfoCard>
          </Box>
        </Box>

        {/* Notes */}
        <InfoCard title="Нотатки" icon={<NotesIcon />}>
          <NotesPanel initialNotes={record.notes ?? []} leadId={record.id} />
        </InfoCard>
      </Box>

      {/* ========== 3. BOTTOM: Chat button + History ========== */}
      <Card
        onClick={() => { window.location.hash = `#/chats?leadId=${record.id}`; }}
        sx={{
          mb: 2, cursor: 'pointer', background: '#1a1d2e', border: '1px solid #2d3158',
          '&:hover': { borderColor: '#6366f1', background: '#1e2235' },
          transition: 'all 0.2s',
        }}
      >
        <CardContent sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', py: '12px !important' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Badge badgeContent={record._count?.messages ?? 0} color="primary" max={999}>
              <ChatIcon sx={{ color: '#6366f1' }} />
            </Badge>
            <Typography variant="subtitle2" sx={{ fontWeight: 700, color: '#e2e8f0' }}>
              Відкрити чат з клієнтом
            </Typography>
          </Box>
          <OpenInFullIcon sx={{ color: '#64748b', fontSize: 20 }} />
        </CardContent>
      </Card>

      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 2 }}>

        {/* History timeline */}
        <Card sx={{ background: '#1a1d2e', border: '1px solid #2d3158' }}>
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
              <Box sx={{ color: '#6366f1' }}><HistoryIcon /></Box>
              <Typography
                variant="subtitle2"
                sx={{ fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', fontSize: '0.72rem', letterSpacing: '0.08em' }}
              >
                Історія дій
              </Typography>
            </Box>
            {(record.history ?? []).length > 0 ? (
              <Box sx={{ maxHeight: 400, overflowY: 'auto', pr: 1 }}>
                {(record.history ?? []).map((h: any) => (
                  <Box key={h.id} sx={{ display: 'flex', gap: 1.5, mb: 1.5 }}>
                    <Box sx={{ width: 6, height: 6, borderRadius: '50%', background: '#6366f1', flexShrink: 0, mt: 0.8 }} />
                    <Box>
                      <Typography variant="body2" sx={{ color: '#94a3b8' }}>{h.action}</Typography>
                      <Typography variant="caption" sx={{ color: '#475569' }}>
                        {new Date(h.createdAt).toLocaleString('uk-UA')}
                      </Typography>
                    </Box>
                  </Box>
                ))}
              </Box>
            ) : (
              <Typography variant="body2" sx={{ color: '#334155' }}>Історія порожня</Typography>
            )}
          </CardContent>
        </Card>
      </Box>
    </Box>
  );
};

/* ------------------------------------------------------------------ */
/*  Export                                                             */
/* ------------------------------------------------------------------ */

export const LeadShow = () => (
  <Show queryOptions={{ refetchOnMount: true, staleTime: 0, gcTime: 0 }}>
    <LeadShowContent />
  </Show>
);
