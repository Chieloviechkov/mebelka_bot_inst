import { useState, useEffect } from 'react';
import {
  Box, Typography, Card, CardContent, TextField, Button,
  Switch, FormControlLabel, Skeleton, Alert, Divider, IconButton,
  ToggleButton, ToggleButtonGroup,
} from '@mui/material';
import SettingsIcon from '@mui/icons-material/Settings';
import SmartToyIcon from '@mui/icons-material/SmartToy';
import TuneIcon from '@mui/icons-material/Tune';
import SaveIcon from '@mui/icons-material/Save';
import LocationOnIcon from '@mui/icons-material/LocationOn';
import PsychologyIcon from '@mui/icons-material/Psychology';
import LabelIcon from '@mui/icons-material/Label';
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import ChatBubbleOutlineIcon from '@mui/icons-material/ChatBubbleOutline';
import GavelIcon from '@mui/icons-material/Gavel';
import { usePermissions, useRedirect } from 'react-admin';
import api from '../api';
import { ALL_STATUSES, setCustomStatusLabels } from '../utils/statusMaps';

interface CompanyAddress {
  name: string;
  address: string;
  map: string;
}

interface ObjectionPair {
  objection: string;
  response: string;
}

interface TrainingExample {
  user: string;
  assistant: string;
}

const inputSx = {
  '& .MuiOutlinedInput-root': {
    background: '#12151f',
    borderRadius: '8px',
    '& fieldset': { borderColor: '#2d3158' },
  },
};

export const SettingsPage = () => {
  const { permissions: role } = usePermissions();
  const redirect = useRedirect();

  useEffect(() => {
    if (role && role !== 'supermanager') {
      redirect('/');
    }
  }, [role, redirect]);
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [addresses, setAddresses] = useState<CompanyAddress[]>([]);
  const [statusLabels, setStatusLabels] = useState<Record<string, string>>({});
  const [objections, setObjections] = useState<ObjectionPair[]>([]);
  const [examples, setExamples] = useState<TrainingExample[]>([]);
  const [importError, setImportError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    api.get('/admin/settings').then(res => {
      setSettings(res.data);
      // Parse addresses from JSON string
      try {
        const parsed = JSON.parse(res.data.COMPANY_ADDRESSES || '[]');
        setAddresses(Array.isArray(parsed) ? parsed : []);
      } catch {
        setAddresses([]);
      }
      // Parse status labels
      try {
        const parsed = JSON.parse(res.data.STATUS_LABELS || '{}');
        setStatusLabels(typeof parsed === 'object' && parsed !== null ? parsed : {});
      } catch {
        setStatusLabels({});
      }
      try {
        const parsed = JSON.parse(res.data.AI_OBJECTIONS || '[]');
        setObjections(Array.isArray(parsed) ? parsed : []);
      } catch { setObjections([]); }
      try {
        const parsed = JSON.parse(res.data.AI_TRAINING_EXAMPLES || '[]');
        setExamples(Array.isArray(parsed) ? parsed : []);
      } catch { setExamples([]); }
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  const handleChange = (key: string, value: string) => {
    setSettings(prev => ({ ...prev, [key]: value }));
    setSaved(false);
  };

  const handleAddressChange = (index: number, field: keyof CompanyAddress, value: string) => {
    setAddresses(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
    setSaved(false);
  };

  const addAddress = () => {
    setAddresses(prev => [...prev, { name: '', address: '', map: '' }]);
    setSaved(false);
  };

  const removeAddress = (index: number) => {
    setAddresses(prev => prev.filter((_, i) => i !== index));
    setSaved(false);
  };

  const handleStatusLabelChange = (statusKey: string, label: string) => {
    setStatusLabels(prev => ({ ...prev, [statusKey]: label }));
    setSaved(false);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      // Filter out empty custom labels (keep only overrides with actual values)
      const cleanedLabels: Record<string, string> = {};
      for (const [key, val] of Object.entries(statusLabels)) {
        if (val && val.trim()) cleanedLabels[key] = val.trim();
      }
      const cleanedObjections = objections.filter(o => o.objection?.trim() && o.response?.trim());
      const cleanedExamples = examples.filter(e => e.user?.trim() && e.assistant?.trim());
      const payload = {
        ...settings,
        COMPANY_ADDRESSES: JSON.stringify(addresses),
        STATUS_LABELS: JSON.stringify(cleanedLabels),
        AI_OBJECTIONS: JSON.stringify(cleanedObjections),
        AI_TRAINING_EXAMPLES: JSON.stringify(cleanedExamples),
      };
      await api.patch('/admin/settings', payload);
      // Update runtime status labels
      setCustomStatusLabels(cleanedLabels);
      setSaved(true);
    } catch {
      // error
    }
    setSaving(false);
  };

  if (loading) {
    return (
      <Box sx={{ p: 3 }}>
        <Skeleton variant="rounded" height={500} sx={{ background: '#1a1d2e', borderRadius: 3 }} />
      </Box>
    );
  }

  const aiEnabled = settings.AI_ENABLED === 'true';

  return (
    <Box sx={{ p: 3, maxWidth: 800 }}>
      <Box sx={{ mb: 4 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1 }}>
          <SettingsIcon sx={{ color: '#6366f1', fontSize: 28 }} />
          <Typography variant="h4" sx={{ fontWeight: 800, color: '#e2e8f0' }}>
            Налаштування
          </Typography>
        </Box>
        <Typography variant="body2" sx={{ color: '#475569' }}>
          Параметри AI-бота та кваліфікації лідів
        </Typography>
      </Box>

      {saved && (
        <Alert severity="success" sx={{ mb: 3, background: 'rgba(34,197,94,0.1)', color: '#22c55e', border: '1px solid rgba(34,197,94,0.3)', '& .MuiAlert-icon': { color: '#22c55e' } }}>
          Налаштування збережено
        </Alert>
      )}

      {/* AI Toggle */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
            <SmartToyIcon sx={{ color: '#6366f1' }} />
            <Typography variant="subtitle2" sx={{ fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', fontSize: '0.72rem', letterSpacing: '0.08em' }}>
              AI Асистент
            </Typography>
          </Box>

          <Box sx={{
            p: 2.5, borderRadius: 2,
            background: aiEnabled ? 'rgba(34,197,94,0.08)' : 'rgba(239,68,68,0.08)',
            border: `1px solid ${aiEnabled ? 'rgba(34,197,94,0.25)' : 'rgba(239,68,68,0.25)'}`,
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          }}>
            <Box>
              <Typography variant="body1" sx={{ fontWeight: 700, color: '#e2e8f0' }}>
                AI автовідповідач
              </Typography>
              <Typography variant="body2" sx={{ color: '#94a3b8', mt: 0.5 }}>
                {aiEnabled
                  ? 'Бот відповідає клієнтам в Instagram автоматично та створює нагадування (23 год).'
                  : 'Вимкнено — бот лише зберігає повідомлення, не відповідає і не створює нагадування.'}
              </Typography>
            </Box>
            <FormControlLabel
              control={
                <Switch
                  checked={aiEnabled}
                  onChange={async (e) => {
                    const val = e.target.checked ? 'true' : 'false';
                    handleChange('AI_ENABLED', val);
                    try { await api.patch('/admin/settings', { AI_ENABLED: val }); } catch { /* */ }
                  }}
                  sx={{
                    '& .MuiSwitch-switchBase.Mui-checked': { color: '#22c55e' },
                    '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': { backgroundColor: '#22c55e' },
                  }}
                />
              }
              label=""
            />
          </Box>
        </CardContent>
      </Card>

      {/* AI System Prompt */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
            <PsychologyIcon sx={{ color: '#6366f1' }} />
            <Typography variant="subtitle2" sx={{ fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', fontSize: '0.72rem', letterSpacing: '0.08em' }}>
              Системний промпт AI
            </Typography>
          </Box>

          <Typography variant="body2" sx={{ color: '#475569', fontSize: '0.8rem', mb: 2 }}>
            Інструкції для AI-асистента при спілкуванні з клієнтами в Instagram
          </Typography>

          <TextField
            fullWidth
            multiline
            minRows={8}
            maxRows={20}
            value={settings.AI_SYSTEM_PROMPT || ''}
            onChange={(e) => handleChange('AI_SYSTEM_PROMPT', e.target.value)}
            placeholder="Введіть системний промпт для AI-асистента..."
            sx={{
              '& .MuiOutlinedInput-root': {
                background: '#12151f',
                borderRadius: '8px',
                fontFamily: 'monospace',
                fontSize: '0.85rem',
                '& fieldset': { borderColor: '#2d3158' },
              },
            }}
          />
        </CardContent>
      </Card>

      {/* AI Behavior */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
            <TuneIcon sx={{ color: '#6366f1' }} />
            <Typography variant="subtitle2" sx={{ fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', fontSize: '0.72rem', letterSpacing: '0.08em' }}>
              Поведінка AI
            </Typography>
          </Box>
          <Typography variant="body2" sx={{ color: '#475569', fontSize: '0.8rem', mb: 2 }}>
            Модифікатори поверх системного промпту. Застосовуються до кожної відповіді AI.
          </Typography>

          <Typography variant="caption" sx={{ color: '#64748b', fontWeight: 600, mb: 0.5, display: 'block' }}>
            Напористість
          </Typography>
          <ToggleButtonGroup
            exclusive
            value={settings.AI_ASSERTIVENESS || 'medium'}
            onChange={(_, v) => v && handleChange('AI_ASSERTIVENESS', v)}
            size="small"
            sx={{ mb: 2.5, '& .MuiToggleButton-root': { color: '#94a3b8', borderColor: '#2d3158', textTransform: 'none', '&.Mui-selected': { background: 'rgba(99,102,241,0.2)', color: '#a5b4fc', borderColor: '#6366f1' } } }}
          >
            <ToggleButton value="low">М'яка</ToggleButton>
            <ToggleButton value="medium">Середня</ToggleButton>
            <ToggleButton value="high">Активна</ToggleButton>
          </ToggleButtonGroup>

          <Typography variant="caption" sx={{ color: '#64748b', fontWeight: 600, mb: 0.5, display: 'block' }}>
            Стиль спілкування
          </Typography>
          <ToggleButtonGroup
            exclusive
            value={settings.AI_STYLE || 'friendly'}
            onChange={(_, v) => v && handleChange('AI_STYLE', v)}
            size="small"
            sx={{ mb: 2.5, '& .MuiToggleButton-root': { color: '#94a3b8', borderColor: '#2d3158', textTransform: 'none', '&.Mui-selected': { background: 'rgba(99,102,241,0.2)', color: '#a5b4fc', borderColor: '#6366f1' } } }}
          >
            <ToggleButton value="formal">Офіційний</ToggleButton>
            <ToggleButton value="friendly">Дружній</ToggleButton>
            <ToggleButton value="casual">Невимушений</ToggleButton>
          </ToggleButtonGroup>

          <Typography variant="caption" sx={{ color: '#64748b', fontWeight: 600, mb: 0.5, display: 'block' }}>
            Мова відповідей
          </Typography>
          <ToggleButtonGroup
            exclusive
            value={settings.AI_LANGUAGE || 'uk'}
            onChange={(_, v) => v && handleChange('AI_LANGUAGE', v)}
            size="small"
            sx={{ '& .MuiToggleButton-root': { color: '#94a3b8', borderColor: '#2d3158', textTransform: 'none', '&.Mui-selected': { background: 'rgba(99,102,241,0.2)', color: '#a5b4fc', borderColor: '#6366f1' } } }}
          >
            <ToggleButton value="uk">Українська</ToggleButton>
            <ToggleButton value="ru">Російська</ToggleButton>
            <ToggleButton value="en">English</ToggleButton>
            <ToggleButton value="auto">Авто (як клієнт)</ToggleButton>
          </ToggleButtonGroup>
        </CardContent>
      </Card>

      {/* Objections */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
            <GavelIcon sx={{ color: '#6366f1' }} />
            <Typography variant="subtitle2" sx={{ fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', fontSize: '0.72rem', letterSpacing: '0.08em' }}>
              Робота з запереченнями
            </Typography>
          </Box>
          <Typography variant="body2" sx={{ color: '#475569', fontSize: '0.8rem', mb: 2 }}>
            Типові заперечення клієнтів і готові відповіді. AI використовує їх як основу при відповідних ситуаціях.
          </Typography>

          {objections.map((o, idx) => (
            <Box key={idx} sx={{ p: 2, mb: 2, borderRadius: 2, background: '#12151f', border: '1px solid #2d3158' }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                <Typography variant="caption" sx={{ color: '#64748b', fontWeight: 600 }}>Пара #{idx + 1}</Typography>
                <IconButton
                  size="small"
                  onClick={() => { setObjections(prev => prev.filter((_, i) => i !== idx)); setSaved(false); }}
                  sx={{ color: '#ef4444' }}
                >
                  <DeleteOutlineIcon fontSize="small" />
                </IconButton>
              </Box>
              <TextField
                fullWidth size="small" label="Заперечення клієнта"
                value={o.objection}
                onChange={(e) => { setObjections(prev => { const u = [...prev]; u[idx] = { ...u[idx], objection: e.target.value }; return u; }); setSaved(false); }}
                placeholder="Дорого / Подумаю / У конкурентів дешевше"
                sx={{ ...inputSx, mb: 1.5 }}
              />
              <TextField
                fullWidth size="small" multiline minRows={2} label="Відповідь AI"
                value={o.response}
                onChange={(e) => { setObjections(prev => { const u = [...prev]; u[idx] = { ...u[idx], response: e.target.value }; return u; }); setSaved(false); }}
                placeholder="Розумію, ціна важлива. Менеджер підбере оптимальний варіант з врахуванням бюджету..."
                sx={inputSx}
              />
            </Box>
          ))}

          <Button
            startIcon={<AddCircleOutlineIcon />}
            onClick={() => { setObjections(prev => [...prev, { objection: '', response: '' }]); setSaved(false); }}
            sx={{ color: '#818cf8', fontWeight: 600, '&:hover': { background: 'rgba(99,102,241,0.1)' } }}
          >
            Додати заперечення
          </Button>
        </CardContent>
      </Card>

      {/* Training examples */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
            <ChatBubbleOutlineIcon sx={{ color: '#6366f1' }} />
            <Typography variant="subtitle2" sx={{ fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', fontSize: '0.72rem', letterSpacing: '0.08em' }}>
              Приклади діалогів (навчання AI)
            </Typography>
          </Box>
          <Typography variant="body2" sx={{ color: '#475569', fontSize: '0.8rem', mb: 2 }}>
            Зразкові пари "клієнт → ідеальна відповідь". AI використовує їх як приклад тону і манери (few-shot). Достатньо 3–10 пар.
          </Typography>

          <Button
            component="label"
            startIcon={<UploadFileIcon />}
            sx={{ color: '#818cf8', fontWeight: 600, mb: 2, '&:hover': { background: 'rgba(99,102,241,0.1)' } }}
          >
            Імпорт з JSON
            <input
              type="file"
              accept="application/json,.json"
              hidden
              onChange={async (e) => {
                const f = e.target.files?.[0];
                if (!f) return;
                setImportError(null);
                try {
                  const text = await f.text();
                  const parsed = JSON.parse(text);
                  if (!Array.isArray(parsed)) throw new Error('JSON має бути масивом');
                  const valid = parsed.filter((x: any) => x?.user && x?.assistant)
                    .map((x: any) => ({ user: String(x.user), assistant: String(x.assistant) }));
                  if (!valid.length) throw new Error('Жодної валідної пари {user, assistant}');
                  setExamples(prev => [...prev, ...valid]);
                  setSaved(false);
                } catch (err: any) {
                  setImportError(err.message || 'Помилка парсингу');
                }
                e.target.value = '';
              }}
            />
          </Button>

          {importError && (
            <Alert severity="error" sx={{ mb: 2, background: 'rgba(239,68,68,0.1)', color: '#fca5a5', border: '1px solid rgba(239,68,68,0.3)' }}>
              {importError}
            </Alert>
          )}

          {examples.map((ex, idx) => (
            <Box key={idx} sx={{ p: 2, mb: 2, borderRadius: 2, background: '#12151f', border: '1px solid #2d3158' }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                <Typography variant="caption" sx={{ color: '#64748b', fontWeight: 600 }}>Діалог #{idx + 1}</Typography>
                <IconButton
                  size="small"
                  onClick={() => { setExamples(prev => prev.filter((_, i) => i !== idx)); setSaved(false); }}
                  sx={{ color: '#ef4444' }}
                >
                  <DeleteOutlineIcon fontSize="small" />
                </IconButton>
              </Box>
              <TextField
                fullWidth size="small" multiline minRows={2} label="Клієнт"
                value={ex.user}
                onChange={(e) => { setExamples(prev => { const u = [...prev]; u[idx] = { ...u[idx], user: e.target.value }; return u; }); setSaved(false); }}
                sx={{ ...inputSx, mb: 1.5 }}
              />
              <TextField
                fullWidth size="small" multiline minRows={2} label="Ідеальна відповідь AI"
                value={ex.assistant}
                onChange={(e) => { setExamples(prev => { const u = [...prev]; u[idx] = { ...u[idx], assistant: e.target.value }; return u; }); setSaved(false); }}
                sx={inputSx}
              />
            </Box>
          ))}

          <Button
            startIcon={<AddCircleOutlineIcon />}
            onClick={() => { setExamples(prev => [...prev, { user: '', assistant: '' }]); setSaved(false); }}
            sx={{ color: '#818cf8', fontWeight: 600, '&:hover': { background: 'rgba(99,102,241,0.1)' } }}
          >
            Додати діалог вручну
          </Button>
        </CardContent>
      </Card>

      {/* Qualification Thresholds */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 3 }}>
            <TuneIcon sx={{ color: '#6366f1' }} />
            <Typography variant="subtitle2" sx={{ fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', fontSize: '0.72rem', letterSpacing: '0.08em' }}>
              Пороги кваліфікації
            </Typography>
          </Box>

          <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2.5 }}>
            <Box>
              <Typography variant="caption" sx={{ color: '#64748b', fontWeight: 600, mb: 0.5, display: 'block' }}>
                Мінімальний бюджет (грн)
              </Typography>
              <TextField
                fullWidth
                size="small"
                type="number"
                value={settings.MIN_BUDGET_UAH || ''}
                onChange={(e) => handleChange('MIN_BUDGET_UAH', e.target.value)}
                sx={inputSx}
              />
            </Box>

            <Box>
              <Typography variant="caption" sx={{ color: '#64748b', fontWeight: 600, mb: 0.5, display: 'block' }}>
                Мін. ціна за м2 (грн)
              </Typography>
              <TextField
                fullWidth
                size="small"
                type="number"
                value={settings.MIN_PRICE_PER_SQM || ''}
                onChange={(e) => handleChange('MIN_PRICE_PER_SQM', e.target.value)}
                sx={inputSx}
              />
            </Box>

            <Box>
              <Typography variant="caption" sx={{ color: '#64748b', fontWeight: 600, mb: 0.5, display: 'block' }}>
                Макс. ціна за м2 (грн)
              </Typography>
              <TextField
                fullWidth
                size="small"
                type="number"
                value={settings.MAX_PRICE_PER_SQM || ''}
                onChange={(e) => handleChange('MAX_PRICE_PER_SQM', e.target.value)}
                sx={inputSx}
              />
            </Box>

            <Box>
              <Typography variant="caption" sx={{ color: '#64748b', fontWeight: 600, mb: 0.5, display: 'block' }}>
                Мін. терміни (днів)
              </Typography>
              <TextField
                fullWidth
                size="small"
                type="number"
                value={settings.MIN_TIMELINE_DAYS || ''}
                onChange={(e) => handleChange('MIN_TIMELINE_DAYS', e.target.value)}
                sx={inputSx}
              />
            </Box>
          </Box>

          <Divider sx={{ borderColor: '#2d3158', my: 2.5 }} />

          <Typography variant="body2" sx={{ color: '#475569', fontSize: '0.8rem' }}>
            Ці параметри використовуються для автоматичної кваліфікації лідів.
            Клієнт з бюджетом нижче мінімального або нереальними термінами отримає статус "Неперспективний".
          </Typography>
        </CardContent>
      </Card>

      {/* Company Addresses */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
            <LocationOnIcon sx={{ color: '#6366f1' }} />
            <Typography variant="subtitle2" sx={{ fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', fontSize: '0.72rem', letterSpacing: '0.08em' }}>
              Адреси компанії
            </Typography>
          </Box>

          <Typography variant="body2" sx={{ color: '#475569', fontSize: '0.8rem', mb: 2.5 }}>
            Список адрес салонів/офісів. AI-асистент використовує їх при спілкуванні з клієнтами.
          </Typography>

          {addresses.map((addr, index) => (
            <Box
              key={index}
              sx={{
                p: 2, mb: 2, borderRadius: 2,
                background: '#12151f',
                border: '1px solid #2d3158',
              }}
            >
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }}>
                <Typography variant="caption" sx={{ color: '#64748b', fontWeight: 600 }}>
                  Адреса #{index + 1}
                </Typography>
                <IconButton
                  size="small"
                  onClick={() => removeAddress(index)}
                  sx={{ color: '#ef4444', '&:hover': { background: 'rgba(239,68,68,0.1)' } }}
                >
                  <DeleteOutlineIcon fontSize="small" />
                </IconButton>
              </Box>

              <Box sx={{ display: 'grid', gap: 1.5 }}>
                <TextField
                  fullWidth
                  size="small"
                  label="Назва"
                  value={addr.name}
                  onChange={(e) => handleAddressChange(index, 'name', e.target.value)}
                  placeholder="Салон на Подолі"
                  sx={inputSx}
                />
                <TextField
                  fullWidth
                  size="small"
                  label="Адреса"
                  value={addr.address}
                  onChange={(e) => handleAddressChange(index, 'address', e.target.value)}
                  placeholder="м. Київ, вул. Хрещатик 1"
                  sx={inputSx}
                />
                <TextField
                  fullWidth
                  size="small"
                  label="Посилання на карту"
                  value={addr.map}
                  onChange={(e) => handleAddressChange(index, 'map', e.target.value)}
                  placeholder="https://maps.google.com/..."
                  sx={inputSx}
                />
              </Box>
            </Box>
          ))}

          <Button
            startIcon={<AddCircleOutlineIcon />}
            onClick={addAddress}
            sx={{
              color: '#818cf8',
              fontWeight: 600,
              '&:hover': { background: 'rgba(99,102,241,0.1)' },
            }}
          >
            Додати адресу
          </Button>
        </CardContent>
      </Card>

      {/* Status Labels */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
            <LabelIcon sx={{ color: '#6366f1' }} />
            <Typography variant="subtitle2" sx={{ fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', fontSize: '0.72rem', letterSpacing: '0.08em' }}>
              Кастомні статуси
            </Typography>
          </Box>

          <Typography variant="body2" sx={{ color: '#475569', fontSize: '0.8rem', mb: 2.5 }}>
            Змініть відображувані назви статусів. Залиште поле порожнім, щоб використовувати назву за замовчуванням.
          </Typography>

          <Box sx={{ display: 'grid', gap: 1.5 }}>
            {Object.entries(ALL_STATUSES).map(([key, cfg]) => (
              <Box
                key={key}
                sx={{
                  display: 'flex', alignItems: 'center', gap: 2,
                  p: 1.5, borderRadius: 2,
                  background: '#12151f',
                  border: '1px solid #2d3158',
                }}
              >
                <Box sx={{ minWidth: 140 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Box sx={{ width: 10, height: 10, borderRadius: '50%', background: cfg.color, flexShrink: 0 }} />
                    <Typography variant="caption" sx={{ color: '#64748b', fontWeight: 600, fontSize: '0.7rem' }}>
                      {key}
                    </Typography>
                  </Box>
                  <Typography variant="caption" sx={{ color: '#475569', fontSize: '0.65rem', ml: 2.5 }}>
                    {cfg.label}
                  </Typography>
                </Box>
                <TextField
                  fullWidth
                  size="small"
                  placeholder={cfg.label}
                  value={statusLabels[key] || ''}
                  onChange={(e) => handleStatusLabelChange(key, e.target.value)}
                  sx={inputSx}
                />
              </Box>
            ))}
          </Box>
        </CardContent>
      </Card>

      {/* Save */}
      <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
        <Button
          variant="contained"
          startIcon={<SaveIcon />}
          onClick={handleSave}
          disabled={saving}
          sx={{
            background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
            fontWeight: 700,
            px: 4,
            py: 1.2,
            borderRadius: '10px',
            '&:hover': { background: 'linear-gradient(135deg, #4f46e5, #7c3aed)' },
          }}
        >
          {saving ? 'Зберігаю...' : 'Зберегти'}
        </Button>
      </Box>
    </Box>
  );
};
