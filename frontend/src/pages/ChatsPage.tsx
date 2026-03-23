import { useState, useEffect, useRef, useCallback } from 'react';
import {
  Box, Typography, Avatar, Badge, Chip, TextField, Button,
  IconButton, Skeleton, Tooltip, Popover, Checkbox, FormControlLabel,
  CircularProgress, Divider,
} from '@mui/material';
import ChatIcon from '@mui/icons-material/Chat';
import SendIcon from '@mui/icons-material/Send';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import AttachFileIcon from '@mui/icons-material/AttachFile';
import SearchIcon from '@mui/icons-material/Search';
import ReplayIcon from '@mui/icons-material/Replay';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import PersonAddIcon from '@mui/icons-material/PersonAdd';
import ForumIcon from '@mui/icons-material/Forum';
import api from '../api';
import { getStatusConfig } from '../utils/statusMaps';

const API = '/admin';

export const ChatsPage = () => {
  const [leads, setLeads] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedLead, setSelectedLead] = useState<any>(null);
  const [messageResults, setMessageResults] = useState<any[]>([]);
  const [searchingMessages, setSearchingMessages] = useState(false);
  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    api.get(`${API}/leads?page=1&limit=50&sort_field=updatedAt&sort_order=desc`).then(res => {
      const data = res.data?.data || res.data || [];
      setLeads(data.filter((l: any) => (l._count?.messages ?? 0) > 0));
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  // Debounced message search
  useEffect(() => {
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);

    if (search.length > 2) {
      setSearchingMessages(true);
      searchTimeoutRef.current = setTimeout(() => {
        api.get(`${API}/messages/search`, { params: { q: search } })
          .then(res => {
            setMessageResults(res.data || []);
            setSearchingMessages(false);
          })
          .catch(() => {
            setMessageResults([]);
            setSearchingMessages(false);
          });
      }, 400);
    } else {
      setMessageResults([]);
      setSearchingMessages(false);
    }

    return () => {
      if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    };
  }, [search]);

  const handleMessageResultClick = (msg: any) => {
    const lead = msg.lead;
    if (!lead) return;
    const existingLead = leads.find(l => l.id === lead.id);
    setSelectedLead(existingLead || { id: lead.id, instagram_name: lead.instagram_name, instagram_username: lead.instagram_username });
  };

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

  if (selectedLead) {
    return <InlineChat lead={selectedLead} onBack={() => setSelectedLead(null)} />;
  }

  return (
    <Box sx={{ p: { xs: 1, sm: 2, md: 3 }, height: 'calc(100vh - 60px)', display: 'flex', flexDirection: 'column' }}>
      <Box sx={{ mb: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1 }}>
          <ChatIcon sx={{ color: '#6366f1', fontSize: 28 }} />
          <Typography variant="h4" sx={{ fontWeight: 800, color: '#e2e8f0' }}>Чати</Typography>
        </Box>
        <Typography variant="body2" sx={{ color: '#475569' }}>Історія переписок з клієнтами</Typography>
      </Box>

      <TextField
        fullWidth size="small" placeholder="Пошук чату або повідомлення..."
        value={search} onChange={e => setSearch(e.target.value)}
        slotProps={{ input: { startAdornment: <SearchIcon sx={{ color: '#475569', mr: 1 }} /> } }}
        sx={{ mb: 2, '& .MuiOutlinedInput-root': { background: '#1a1d2e', borderRadius: '10px', '& fieldset': { borderColor: '#2d3158' } } }}
      />

      <Box sx={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 0.5 }}>
        {filtered.length === 0 && messageResults.length === 0 && !searchingMessages && (
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

        {/* Message search results */}
        {search.length > 2 && (messageResults.length > 0 || searchingMessages) && (
          <>
            <Divider sx={{ borderColor: '#2d3158', my: 1.5 }} />
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
              <ForumIcon sx={{ color: '#818cf8', fontSize: 18 }} />
              <Typography variant="caption" sx={{ color: '#818cf8', fontWeight: 700, textTransform: 'uppercase', fontSize: '0.7rem' }}>
                Знайдено в повідомленнях
              </Typography>
              {searchingMessages && <CircularProgress size={14} sx={{ color: '#818cf8', ml: 1 }} />}
            </Box>
            {messageResults.map(msg => {
              const leadName = msg.lead?.instagram_name || msg.lead?.instagram_username || `Lead #${msg.lead_id}`;
              const snippet = (msg.text || '').length > 120 ? msg.text.substring(0, 120) + '...' : msg.text;

              return (
                <Box
                  key={msg.id}
                  onClick={() => handleMessageResultClick(msg)}
                  sx={{
                    p: 1.5, borderRadius: '10px', cursor: 'pointer',
                    background: '#1a1d2e', border: '1px solid #2d3158',
                    '&:hover': { borderColor: '#818cf8', background: '#1e2235' },
                    transition: 'all 0.15s',
                  }}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                    <Typography variant="caption" sx={{ color: '#94a3b8', fontWeight: 600 }}>
                      {leadName}
                    </Typography>
                    <Typography variant="caption" sx={{ color: '#475569', fontSize: '0.6rem' }}>
                      {new Date(msg.timestamp).toLocaleString('uk-UA')}
                    </Typography>
                    <Chip
                      label={msg.role === 'manager' ? 'Менеджер' : msg.role === 'bot' ? 'AI' : 'Клієнт'}
                      size="small"
                      sx={{ height: 18, fontSize: '0.55rem', background: '#1e2235', color: '#64748b' }}
                    />
                  </Box>
                  <Typography variant="body2" sx={{ color: '#cbd5e1', fontSize: '0.8rem' }}>
                    {snippet}
                  </Typography>
                </Box>
              );
            })}
          </>
        )}
      </Box>
    </Box>
  );
};

/* ─── Inline chat ─── */

const ManagerAssignPopover = ({ leadId, assignedManagers, onUpdate }: { leadId: number; assignedManagers: any[]; onUpdate: (managers: any[]) => void }) => {
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);
  const [allManagers, setAllManagers] = useState<any[]>([]);
  const [loadingMgrs, setLoadingMgrs] = useState(false);
  const [toggling, setToggling] = useState<number | null>(null);

  const assignedIds = new Set(assignedManagers.map((m: any) => m.id));

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
        onUpdate(assignedManagers.filter((m: any) => m.id !== manager.id));
      } else {
        await api.post(`${API}/leads/${leadId}/assign`, { manager_id: manager.id });
        onUpdate([...assignedManagers, manager]);
      }
    } catch { /* ignore */ }
    setToggling(null);
  };

  return (
    <>
      <Tooltip title="Призначити менеджера">
        <IconButton onClick={handleOpen} sx={{ color: '#64748b' }}>
          <PersonAddIcon fontSize="small" />
        </IconButton>
      </Tooltip>
      <Popover
        open={Boolean(anchorEl)}
        anchorEl={anchorEl}
        onClose={() => setAnchorEl(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
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
    </>
  );
};

const InlineChat = ({ lead, onBack }: { lead: any; onBack: () => void }) => {
  const [messages, setMessages] = useState<any[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [text, setText] = useState('');
  const [assignedManagers, setAssignedManagers] = useState<any[]>([]);
  const [attachmentPreview, setAttachmentPreview] = useState<{ file: File; dataUrl: string } | null>(null);
  const [uploadingAttachment, setUploadingAttachment] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textRef = useRef(text);
  textRef.current = text;

  const name = lead.instagram_name || lead.instagram_username || lead.instagram_id;

  // Load assigned managers
  useEffect(() => {
    api.get(`${API}/leads/${lead.id}/managers`).then(res => {
      const data = res.data || [];
      setAssignedManagers(data.map((lm: any) => lm.manager).filter(Boolean));
    }).catch(() => {});
  }, [lead.id]);

  useEffect(() => {
    window.history.pushState({ chat: true }, '');
    const handlePop = () => onBack();
    window.addEventListener('popstate', handlePop);
    return () => window.removeEventListener('popstate', handlePop);
  }, [onBack]);

  const fetchMessages = useCallback(() => {
    return api.get(`${API}/leads/${lead.id}/messages?limit=200`).then(res => {
      const data = res.data?.data || res.data || [];
      return data;
    });
  }, [lead.id]);

  useEffect(() => {
    fetchMessages().then(data => {
      setMessages(data);
      setLoaded(true);
    }).catch(() => setLoaded(true));
  }, [fetchMessages]);

  // Polling every 5 seconds for new messages
  useEffect(() => {
    const interval = setInterval(() => {
      fetchMessages().then(data => {
        setMessages(prev => {
          if (data.length !== prev.length || (data.length > 0 && prev.length > 0 && data[data.length - 1]?.id !== prev[prev.length - 1]?.id)) {
            return data;
          }
          return prev;
        });
      }).catch(() => {});
    }, 5000);
    return () => clearInterval(interval);
  }, [fetchMessages]);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages]);

  const handleSend = useCallback(async () => {
    const t = textRef.current;
    if (!t.trim()) return;
    const body = t.trim();
    const tempMsg = { id: Date.now(), text: body, role: 'manager', delivered: true, timestamp: new Date().toISOString() };
    setMessages(prev => [...prev, tempMsg]);
    setText('');
    try {
      const res = await api.post(`${API}/leads/${lead.id}/message`, { text: body });
      setMessages(prev => prev.map(m => (m.id === tempMsg.id ? res.data : m)));
    } catch (err: any) {
      // Show failed message instead of removing
      const errMsg = err.response?.data?.message || 'Помилка сервера';
      setMessages(prev => prev.map(m => m.id === tempMsg.id ? { ...m, delivered: false, delivery_error: errMsg } : m));
    }
  }, [lead.id]);

  const handleRetry = async (msgId: number) => {
    try {
      const res = await api.post(`${API}/messages/${msgId}/retry`);
      setMessages(prev => prev.map(m => (m.id === msgId ? res.data : m)));
    } catch { /* ignore */ }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      alert('Файл занадто великий (макс. 5MB)');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setAttachmentPreview({ file, dataUrl: reader.result as string });
    };
    reader.readAsDataURL(file);
    // Reset input so same file can be selected again
    e.target.value = '';
  };

  const handleSendAttachment = async () => {
    if (!attachmentPreview) return;
    setUploadingAttachment(true);
    const formData = new FormData();
    formData.append('file', attachmentPreview.file);

    const isImage = attachmentPreview.file.type.startsWith('image/');
    const tempMsg = {
      id: Date.now(),
      text: null,
      role: 'manager',
      delivered: true,
      attachment_url: attachmentPreview.dataUrl,
      attachment_type: isImage ? 'image' : 'file',
      timestamp: new Date().toISOString(),
    };
    setMessages(prev => [...prev, tempMsg]);
    setAttachmentPreview(null);

    try {
      const res = await api.post(`${API}/leads/${lead.id}/attachment`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setMessages(prev => prev.map(m => (m.id === tempMsg.id ? res.data : m)));
    } catch (err: any) {
      const errMsg = err.response?.data?.message || 'Помилка завантаження';
      setMessages(prev => prev.map(m => m.id === tempMsg.id ? { ...m, delivered: false, delivery_error: errMsg } : m));
    }
    setUploadingAttachment(false);
  };

  return (
    <Box sx={{ p: { xs: 1, sm: 2, md: 3 }, height: 'calc(100vh - 60px)', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <Box sx={{ mb: 2, pb: 1.5, borderBottom: '1px solid #2d3158' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <IconButton onClick={onBack} sx={{ color: '#94a3b8' }}>
            <ArrowBackIcon />
          </IconButton>
          <Avatar sx={{ width: 38, height: 38, background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', fontWeight: 700, fontSize: '0.95rem' }}>
            {(name || 'U')[0].toUpperCase()}
          </Avatar>
          <Box sx={{ flex: 1 }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 700, color: '#e2e8f0', lineHeight: 1.2 }}>{name}</Typography>
            <Typography variant="caption" sx={{ color: '#64748b' }}>
              @{lead.instagram_username || lead.instagram_id}
              {lead.phone && ` · ${lead.phone}`}
            </Typography>
          </Box>
          <ManagerAssignPopover leadId={lead.id} assignedManagers={assignedManagers} onUpdate={setAssignedManagers} />
          <Tooltip title="Відкрити картку ліда">
            <IconButton onClick={() => { window.location.hash = `#/leads/${lead.id}/show`; }} sx={{ color: '#64748b' }}>
              <OpenInNewIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Box>
        {assignedManagers.length > 0 && (
          <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap', ml: 7, mt: 0.5 }}>
            {assignedManagers.map((m: any) => (
              <Chip
                key={m.id}
                label={m.name || m.email || m.telegram_id}
                size="small"
                sx={{ height: 20, fontSize: '0.65rem', background: '#1e2235', color: '#94a3b8', border: '1px solid #2d3158' }}
              />
            ))}
          </Box>
        )}
      </Box>

      {/* Messages */}
      <Box ref={scrollRef} sx={{ flex: 1, overflowY: 'auto', pr: 1, display: 'flex', flexDirection: 'column', gap: 1.5 }}>
        {!loaded && <Typography variant="body2" sx={{ color: '#475569', textAlign: 'center', py: 4 }}>Завантаження...</Typography>}
        {loaded && messages.length === 0 && <Typography variant="body2" sx={{ color: '#334155', textAlign: 'center', py: 4 }}>Повідомлень немає</Typography>}
        {messages.map((msg: any) => {
          const isManager = msg.role === 'manager';
          const isBot = msg.role === 'bot';
          const alignRight = isBot || isManager;
          const failed = isManager && msg.delivered === false;

          return (
            <Box key={msg.id} sx={{ display: 'flex', justifyContent: alignRight ? 'flex-end' : 'flex-start', maxWidth: 800, mx: 'auto', width: '100%' }}>
              <Box
                sx={{
                  maxWidth: { xs: '85%', sm: '70%' }, px: 2, py: 1,
                  borderRadius: alignRight ? '14px 14px 4px 14px' : '14px 14px 14px 4px',
                  background: failed ? 'rgba(239,68,68,0.1)' : isManager ? 'rgba(34,197,94,0.15)' : isBot ? 'rgba(99,102,241,0.15)' : '#1e2235',
                  border: failed ? '1px solid rgba(239,68,68,0.3)' : isManager ? '1px solid rgba(34,197,94,0.3)' : isBot ? '1px solid rgba(99,102,241,0.25)' : '1px solid #2d3158',
                }}
              >
                {isManager && !failed && <Typography variant="caption" sx={{ color: '#22c55e', fontWeight: 600, display: 'block', mb: 0.3 }}>Менеджер</Typography>}
                {failed && (
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.3 }}>
                    <ErrorOutlineIcon sx={{ fontSize: 14, color: '#ef4444' }} />
                    <Typography variant="caption" sx={{ color: '#ef4444', fontWeight: 600 }}>
                      {msg.delivery_error || 'Не доставлено'}
                    </Typography>
                  </Box>
                )}
                {isBot && <Typography variant="caption" sx={{ color: '#818cf8', fontWeight: 600, display: 'block', mb: 0.3 }}>AI Bot</Typography>}
                {msg.text && <Typography variant="body2" sx={{ color: failed ? '#fca5a5' : '#e2e8f0', whiteSpace: 'pre-wrap' }}>{msg.text}</Typography>}
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
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mt: 0.3 }}>
                  <Typography variant="caption" sx={{ color: '#475569', fontSize: '0.6rem' }}>
                    {new Date(msg.timestamp).toLocaleString('uk-UA')}
                  </Typography>
                  {failed && (
                    <Tooltip title="Повторити відправку">
                      <IconButton size="small" onClick={() => handleRetry(msg.id)} sx={{ color: '#f59e0b', ml: 1, p: 0.3 }}>
                        <ReplayIcon sx={{ fontSize: 16 }} />
                      </IconButton>
                    </Tooltip>
                  )}
                </Box>
              </Box>
            </Box>
          );
        })}
      </Box>

      {/* Attachment preview */}
      {attachmentPreview && (
        <Box sx={{ pt: 1, maxWidth: 800, mx: 'auto', width: '100%' }}>
          <Box sx={{
            display: 'flex', alignItems: 'center', gap: 1.5, p: 1.5,
            background: '#1a1d2e', border: '1px solid #2d3158', borderRadius: '10px',
          }}>
            {attachmentPreview.file.type.startsWith('image/') ? (
              <Box component="img" src={attachmentPreview.dataUrl} alt="preview" sx={{ maxHeight: 120, maxWidth: 200, borderRadius: '8px' }} />
            ) : (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <AttachFileIcon sx={{ color: '#818cf8' }} />
                <Typography variant="body2" sx={{ color: '#e2e8f0' }}>{attachmentPreview.file.name}</Typography>
              </Box>
            )}
            <Box sx={{ ml: 'auto', display: 'flex', gap: 0.5 }}>
              <Button
                size="small" variant="contained"
                onClick={handleSendAttachment}
                disabled={uploadingAttachment}
                sx={{ borderRadius: '8px', background: '#22c55e', '&:hover': { background: '#16a34a' }, minWidth: 40 }}
              >
                {uploadingAttachment ? <CircularProgress size={18} sx={{ color: '#fff' }} /> : <SendIcon fontSize="small" />}
              </Button>
              <IconButton size="small" onClick={() => setAttachmentPreview(null)} sx={{ color: '#ef4444' }}>
                <Typography variant="caption" sx={{ fontWeight: 700 }}>X</Typography>
              </IconButton>
            </Box>
          </Box>
        </Box>
      )}

      {/* Input */}
      <Box sx={{ display: 'flex', gap: 1, pt: 1.5, flexShrink: 0, maxWidth: 800, mx: 'auto', width: '100%' }}>
        <input type="file" ref={fileInputRef} onChange={handleFileSelect} accept="image/*,.pdf,.doc,.docx,.xls,.xlsx" style={{ display: 'none' }} />
        <Tooltip title="Прикріпити файл">
          <IconButton onClick={() => fileInputRef.current?.click()} sx={{ color: '#818cf8', '&:hover': { background: 'rgba(99,102,241,0.1)' } }}>
            <AttachFileIcon />
          </IconButton>
        </Tooltip>
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
  );
};
