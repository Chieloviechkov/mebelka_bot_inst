import { useState, useEffect, useRef, useCallback } from 'react';
import {
  Box, Typography, Avatar, Badge, Chip, TextField, Button,
  IconButton, Skeleton, Dialog, AppBar, Toolbar, DialogContent,
} from '@mui/material';
import ChatIcon from '@mui/icons-material/Chat';
import SendIcon from '@mui/icons-material/Send';
import CloseIcon from '@mui/icons-material/Close';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import AttachFileIcon from '@mui/icons-material/AttachFile';
import SearchIcon from '@mui/icons-material/Search';
import api from '../api';
import { getStatusConfig } from '../utils/statusMaps';

const API = '/admin';

export const ChatsPage = () => {
  const [leads, setLeads] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedLead, setSelectedLead] = useState<any>(null);

  useEffect(() => {
    api.get(`${API}/leads?page=1&limit=50&sort_field=updatedAt&sort_order=desc`).then(res => {
      const data = res.data?.data || res.data || [];
      // Only show leads that have messages
      setLeads(data.filter((l: any) => (l._count?.messages ?? 0) > 0));
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  const filtered = search
    ? leads.filter(l =>
        (l.instagram_name || '').toLowerCase().includes(search.toLowerCase()) ||
        (l.instagram_username || '').toLowerCase().includes(search.toLowerCase()) ||
        (l.phone || '').includes(search)
      )
    : leads;

  if (loading) {
    return (
      <Box sx={{ p: 3 }}>
        <Skeleton variant="rounded" height={500} sx={{ background: '#1a1d2e', borderRadius: 3 }} />
      </Box>
    );
  }

  return (
    <Box sx={{ p: { xs: 1, sm: 2, md: 3 }, height: 'calc(100vh - 60px)', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <Box sx={{ mb: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1 }}>
          <ChatIcon sx={{ color: '#6366f1', fontSize: 28 }} />
          <Typography variant="h4" sx={{ fontWeight: 800, color: '#e2e8f0' }}>Чати</Typography>
        </Box>
        <Typography variant="body2" sx={{ color: '#475569' }}>
          Історія переписок з клієнтами в Instagram
        </Typography>
      </Box>

      {/* Search */}
      <TextField
        fullWidth size="small" placeholder="Пошук чату..."
        value={search} onChange={e => setSearch(e.target.value)}
        slotProps={{ input: { startAdornment: <SearchIcon sx={{ color: '#475569', mr: 1 }} /> } }}
        sx={{
          mb: 2,
          '& .MuiOutlinedInput-root': { background: '#1a1d2e', borderRadius: '10px', '& fieldset': { borderColor: '#2d3158' } },
        }}
      />

      {/* Chat list */}
      <Box sx={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 0.5 }}>
        {filtered.length === 0 && (
          <Typography variant="body2" sx={{ color: '#475569', textAlign: 'center', py: 6 }}>
            {search ? 'Нічого не знайдено' : 'Чатів поки немає'}
          </Typography>
        )}
        {filtered.map(lead => {
          const name = lead.instagram_name || lead.instagram_username || lead.instagram_id;
          const cfg = getStatusConfig(lead.status);
          const msgCount = lead._count?.messages ?? 0;

          return (
            <Box
              key={lead.id}
              onClick={() => setSelectedLead(lead)}
              sx={{
                display: 'flex', alignItems: 'center', gap: 1.5,
                p: 1.5, borderRadius: '10px', cursor: 'pointer',
                background: '#1a1d2e', border: '1px solid #2d3158',
                '&:hover': { borderColor: '#6366f1', background: '#1e2235' },
                transition: 'all 0.15s',
              }}
            >
              <Avatar sx={{ width: 42, height: 42, background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', fontWeight: 700, fontSize: '1rem' }}>
                {(name || 'U')[0].toUpperCase()}
              </Avatar>
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Typography variant="body2" sx={{ fontWeight: 600, color: '#e2e8f0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {name}
                  </Typography>
                  <Chip label={cfg.label} size="small" sx={{ height: 20, fontSize: '0.6rem', background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.border}` }} />
                </Box>
                <Typography variant="caption" sx={{ color: '#64748b' }}>
                  @{lead.instagram_username || lead.instagram_id}
                  {lead.phone && ` · ${lead.phone}`}
                </Typography>
              </Box>
              <Badge badgeContent={msgCount} color="primary" max={999} sx={{ '& .MuiBadge-badge': { fontSize: '0.65rem' } }} />
            </Box>
          );
        })}
      </Box>

      {/* Chat dialog */}
      {selectedLead && (
        <ChatFullscreen lead={selectedLead} onClose={() => setSelectedLead(null)} />
      )}
    </Box>
  );
};

/* ─── Fullscreen chat ─── */

const ChatFullscreen = ({ lead, onClose }: { lead: any; onClose: () => void }) => {
  // Push history entry so browser back button closes the chat
  useEffect(() => {
    window.history.pushState({ chat: true }, '');
    const handlePop = () => onClose();
    window.addEventListener('popstate', handlePop);
    return () => window.removeEventListener('popstate', handlePop);
  }, [onClose]);
  const [messages, setMessages] = useState<any[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [text, setText] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);
  const textRef = useRef(text);
  textRef.current = text;

  const name = lead.instagram_name || lead.instagram_username || lead.instagram_id;

  useEffect(() => {
    api.get(`${API}/leads/${lead.id}/messages?limit=200`).then(res => {
      const data = res.data?.data || res.data || [];
      setMessages([...data].reverse());
      setLoaded(true);
    }).catch(() => setLoaded(true));
  }, [lead.id]);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages]);

  const handleSend = useCallback(async () => {
    const t = textRef.current;
    if (!t.trim()) return;
    const body = t.trim();
    const tempMsg = { id: Date.now(), text: body, role: 'manager', timestamp: new Date().toISOString() };
    setMessages(prev => [...prev, tempMsg]);
    setText('');
    try {
      const res = await api.post(`${API}/leads/${lead.id}/message`, { text: body });
      setMessages(prev => prev.map(m => (m.id === tempMsg.id ? res.data : m)));
    } catch {
      setMessages(prev => prev.filter(m => m.id !== tempMsg.id));
    }
  }, [lead.id]);

  return (
    <Dialog open fullScreen PaperProps={{ sx: { background: '#0f1117' } }}>
      <AppBar sx={{ position: 'relative', background: '#12151f', borderBottom: '1px solid #2d3158', boxShadow: 'none' }}>
        <Toolbar sx={{ minHeight: '52px !important', gap: 1.5 }}>
          <IconButton edge="start" onClick={onClose} sx={{ color: '#94a3b8' }}>
            <ArrowBackIcon />
          </IconButton>
          <Avatar sx={{ width: 32, height: 32, background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', fontSize: '0.85rem', fontWeight: 700 }}>
            {(name || 'U')[0].toUpperCase()}
          </Avatar>
          <Box sx={{ flex: 1 }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 700, color: '#e2e8f0', lineHeight: 1.2 }}>{name}</Typography>
            <Typography variant="caption" sx={{ color: '#64748b' }}>@{lead.instagram_username || lead.instagram_id}</Typography>
          </Box>
          <IconButton onClick={onClose} sx={{ color: '#94a3b8' }}>
            <CloseIcon />
          </IconButton>
        </Toolbar>
      </AppBar>

      <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', maxWidth: 800, mx: 'auto', width: '100%', p: { xs: 1, sm: 2 } }}>
        {/* Messages */}
        <Box ref={scrollRef} sx={{ flex: 1, overflowY: 'auto', pr: 1, display: 'flex', flexDirection: 'column', gap: 1.5 }}>
          {!loaded && <Typography variant="body2" sx={{ color: '#475569', textAlign: 'center', py: 4 }}>Завантаження...</Typography>}
          {loaded && messages.length === 0 && <Typography variant="body2" sx={{ color: '#334155', textAlign: 'center', py: 4 }}>Повідомлень немає</Typography>}
          {messages.map((msg: any) => {
            const isManager = msg.role === 'manager';
            const isBot = msg.role === 'bot';
            const alignRight = isBot || isManager;

            return (
              <Box key={msg.id} sx={{ display: 'flex', justifyContent: alignRight ? 'flex-end' : 'flex-start' }}>
                <Box
                  sx={{
                    maxWidth: { xs: '85%', sm: '70%' }, px: 2, py: 1,
                    borderRadius: alignRight ? '14px 14px 4px 14px' : '14px 14px 14px 4px',
                    background: isManager ? 'rgba(34,197,94,0.15)' : isBot ? 'rgba(99,102,241,0.15)' : '#1e2235',
                    border: isManager ? '1px solid rgba(34,197,94,0.3)' : isBot ? '1px solid rgba(99,102,241,0.25)' : '1px solid #2d3158',
                  }}
                >
                  {isManager && <Typography variant="caption" sx={{ color: '#22c55e', fontWeight: 600, display: 'block', mb: 0.3 }}>Менеджер</Typography>}
                  {isBot && <Typography variant="caption" sx={{ color: '#818cf8', fontWeight: 600, display: 'block', mb: 0.3 }}>AI Bot</Typography>}
                  {msg.text && <Typography variant="body2" sx={{ color: '#e2e8f0', whiteSpace: 'pre-wrap' }}>{msg.text}</Typography>}
                  {msg.attachment_url && msg.attachment_type === 'image' && (
                    <Box component="img" src={msg.attachment_url} alt="" sx={{ mt: 1, maxWidth: '100%', maxHeight: 400, borderRadius: '8px', display: 'block' }} />
                  )}
                  {msg.attachment_url && msg.attachment_type !== 'image' && (
                    <Box sx={{ mt: 1, display: 'flex', alignItems: 'center', gap: 0.5 }}>
                      <AttachFileIcon sx={{ fontSize: 14, color: '#818cf8' }} />
                      <Typography component="a" href={msg.attachment_url} target="_blank" rel="noopener noreferrer" variant="caption" sx={{ color: '#818cf8', textDecoration: 'underline' }}>
                        Вкладення
                      </Typography>
                    </Box>
                  )}
                  <Typography variant="caption" sx={{ color: '#475569', fontSize: '0.6rem', display: 'block', mt: 0.3 }}>
                    {new Date(msg.timestamp).toLocaleString('uk-UA')}
                  </Typography>
                </Box>
              </Box>
            );
          })}
        </Box>

        {/* Input */}
        <Box sx={{ display: 'flex', gap: 1, py: 1.5, flexShrink: 0 }}>
          <TextField
            fullWidth size="small" placeholder="Написати клієнту..."
            value={text} onChange={e => setText(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
            sx={{ '& .MuiOutlinedInput-root': { background: '#1a1d2e', borderRadius: '10px', '& fieldset': { borderColor: '#2d3158' } } }}
          />
          <Button variant="contained" onClick={handleSend} sx={{ borderRadius: '10px', minWidth: 50, background: '#22c55e', '&:hover': { background: '#16a34a' } }}>
            <SendIcon fontSize="small" />
          </Button>
        </Box>
      </Box>
    </Dialog>
  );
};
