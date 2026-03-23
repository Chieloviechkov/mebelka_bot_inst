import { Show, useShowContext, useNotify } from 'react-admin';
import {
  Box, Typography, Card, CardContent, Chip,
  TextField as MuiTextField, Button, Avatar, IconButton,
} from '@mui/material';
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
import AttachFileIcon from '@mui/icons-material/AttachFile';
import { useState, useRef, useEffect, useCallback } from 'react';
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
/*  Chat / Messages panel                                             */
/* ------------------------------------------------------------------ */

const MessagesPanel = ({ initialMessages, leadId }: { initialMessages: any[]; leadId: number }) => {
  // API returns desc order; reverse once for chronological display
  const [messages, setMessages] = useState<any[]>(() => [...(initialMessages ?? [])].reverse());
  const [text, setText] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);
  const notify = useNotify();

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages]);

  const handleSend = useCallback(async () => {
    if (!text.trim()) return;
    const body = text.trim();
    const tempMsg = { id: Date.now(), text: body, role: 'manager', timestamp: new Date().toISOString() };
    setMessages(prev => [...prev, tempMsg]);
    setText('');
    try {
      const res = await api.post(`${API}/leads/${leadId}/message`, { text: body });
      setMessages(prev => prev.map(m => (m.id === tempMsg.id ? res.data : m)));
      notify('Повідомлення відправлено', { type: 'success' });
    } catch {
      setMessages(prev => prev.filter(m => m.id !== tempMsg.id));
      notify('Помилка відправки', { type: 'error' });
    }
  }, [text, leadId, notify]);

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <Box ref={scrollRef} sx={{ flex: 1, maxHeight: 450, overflowY: 'auto', pr: 1, mb: 2, display: 'flex', flexDirection: 'column', gap: 1.5 }}>
        {messages.length === 0 && (
          <Typography variant="body2" sx={{ color: '#334155', textAlign: 'center', py: 3 }}>Повідомлень немає</Typography>
        )}
        {messages.map((msg: any) => {
          const isManager = msg.role === 'manager';
          const isBot = msg.role === 'bot';
          const alignRight = isBot || isManager;

          return (
            <Box key={msg.id} sx={{ display: 'flex', justifyContent: alignRight ? 'flex-end' : 'flex-start' }}>
              <Box
                sx={{
                  maxWidth: '75%', px: 2, py: 1,
                  borderRadius: alignRight ? '12px 12px 4px 12px' : '12px 12px 12px 4px',
                  background: isManager ? 'rgba(34,197,94,0.15)' : isBot ? 'rgba(99,102,241,0.15)' : '#1e2235',
                  border: isManager ? '1px solid rgba(34,197,94,0.3)' : isBot ? '1px solid rgba(99,102,241,0.25)' : '1px solid #2d3158',
                }}
              >
                {isManager && <Typography variant="caption" sx={{ color: '#22c55e', fontWeight: 600, display: 'block', mb: 0.5 }}>Менеджер</Typography>}
                {isBot && <Typography variant="caption" sx={{ color: '#818cf8', fontWeight: 600, display: 'block', mb: 0.5 }}>AI Bot</Typography>}

                <Typography variant="body2" sx={{ color: '#e2e8f0', whiteSpace: 'pre-wrap' }}>{msg.text}</Typography>

                {/* Attachment rendering */}
                {msg.attachment_url && (
                  msg.attachment_type === 'image' ? (
                    <Box
                      component="img"
                      src={msg.attachment_url}
                      alt="attachment"
                      sx={{ mt: 1, maxWidth: '100%', maxHeight: 220, borderRadius: '8px', display: 'block' }}
                    />
                  ) : (
                    <Box sx={{ mt: 1, display: 'flex', alignItems: 'center', gap: 0.5 }}>
                      <AttachFileIcon sx={{ fontSize: 14, color: '#818cf8' }} />
                      <Typography
                        component="a"
                        href={msg.attachment_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        variant="caption"
                        sx={{ color: '#818cf8', textDecoration: 'underline', '&:hover': { color: '#a5b4fc' } }}
                      >
                        Вкладення
                      </Typography>
                    </Box>
                  )
                )}

                <Typography variant="caption" sx={{ color: '#475569', fontSize: '0.65rem', display: 'block', mt: 0.3 }}>
                  {new Date(msg.timestamp).toLocaleString('uk-UA')}
                </Typography>
              </Box>
            </Box>
          );
        })}
      </Box>

      {/* Send input */}
      <Box sx={{ display: 'flex', gap: 1 }}>
        <MuiTextField
          fullWidth
          size="small"
          placeholder="Написати клієнту..."
          value={text}
          onChange={e => setText(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && !e.shiftKey && handleSend()}
          sx={{ '& .MuiOutlinedInput-root': { background: '#12151f', borderRadius: '8px', '& fieldset': { borderColor: '#2d3158' } } }}
        />
        <Button variant="contained" onClick={handleSend} sx={{ borderRadius: '8px', minWidth: 50, background: '#22c55e', '&:hover': { background: '#16a34a' } }}>
          <SendIcon fontSize="small" />
        </Button>
      </Box>
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
            {record.instagram_id && (
              <Typography variant="body2" sx={{ color: '#94a3b8' }}>@{record.instagram_id}</Typography>
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
          <DetailRow label="Тип меблів" value={record.type} />
          <DetailRow label="Розміри" value={record.dimensions} />
          <DetailRow label="Стиль" value={record.style} />
          <DetailRow label="Матеріали" value={record.materials} />
          <DetailRow label="Бюджет" value={record.budget} />
          <DetailRow label="Ціна за м\u00B2" value={record.price_per_sqm} />
          <DetailRow label="Терміни" value={record.timeline} />
          <DetailRow label="Місцезнаходження" value={record.location} />
          <DetailRow label="Є проект" value={record.has_project != null ? (record.has_project ? 'Так' : 'Ні') : null} />
          <DetailRow label="Побажання" value={record.wishes} />
        </InfoCard>

        {/* Managers + Reminders stacked */}
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <InfoCard title="Призначені менеджери" icon={<SupervisorsIcon />}>
            {managers.length > 0 ? (
              <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                {managers.map((m: any) => (
                  <Chip
                    key={m.id}
                    label={m.name || m.telegram_id}
                    avatar={<Avatar sx={{ bgcolor: '#6366f1' }}>{(m.name || 'M')[0]}</Avatar>}
                    sx={{ background: '#1e2235', color: '#e2e8f0', border: '1px solid #2d3158' }}
                  />
                ))}
              </Box>
            ) : (
              <Typography variant="body2" sx={{ color: '#475569' }}>Немає призначених менеджерів</Typography>
            )}
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

      {/* ========== 3. BOTTOM: Chat 2fr | History 1fr ========== */}
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '2fr 1fr' }, gap: 2 }}>
        {/* Chat */}
        <InfoCard title="Чат з клієнтом" icon={<ChatIcon />}>
          <MessagesPanel initialMessages={record.messages ?? []} leadId={record.id} />
        </InfoCard>

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
  <Show>
    <LeadShowContent />
  </Show>
);
