import {
  Edit, SimpleForm, TextInput, SelectInput, BooleanInput,
  ReferenceArrayInput, SelectArrayInput, useRecordContext,
  SaveButton, Toolbar, useRedirect, useNotify,
} from 'react-admin';
import {
  Box, Typography, Card, CardContent, Avatar, Chip, Tab, Tabs,
} from '@mui/material';
import PersonIcon from '@mui/icons-material/Person';
import AssignmentIcon from '@mui/icons-material/Assignment';
import BuildIcon from '@mui/icons-material/Build';
import SupervisorAccountIcon from '@mui/icons-material/SupervisorAccount';
import { useState } from 'react';
import { AI_STATUS_CHOICES, MANAGER_STATUS_CHOICES, getStatusConfig } from '../../utils/statusMaps';

const EditToolbar = () => (
  <Toolbar sx={{ background: 'transparent', px: '0 !important', justifyContent: 'flex-end', gap: 1 }}>
    <SaveButton
      label="Зберегти"
      sx={{
        background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
        fontWeight: 700,
        px: 4,
        py: 1.2,
        borderRadius: '10px',
        '&:hover': { background: 'linear-gradient(135deg, #4f46e5, #7c3aed)' },
      }}
    />
  </Toolbar>
);

const SectionCard = ({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) => (
  <Card sx={{ background: '#1a1d2e', border: '1px solid #2d3158', mb: 2.5 }}>
    <CardContent>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2.5 }}>
        <Box sx={{ color: '#6366f1' }}>{icon}</Box>
        <Typography variant="subtitle2" sx={{ fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', fontSize: '0.72rem', letterSpacing: '0.08em' }}>
          {title}
        </Typography>
      </Box>
      {children}
    </CardContent>
  </Card>
);

const inputSx = {
  '& .MuiOutlinedInput-root': {
    background: '#12151f',
    borderRadius: '8px',
    '& fieldset': { borderColor: '#2d3158' },
    '&:hover fieldset': { borderColor: '#6366f1' },
    '&.Mui-focused fieldset': { borderColor: '#6366f1' },
  },
  '& .MuiInputLabel-root': { color: '#64748b' },
  '& .MuiInputLabel-root.Mui-focused': { color: '#818cf8' },
};

const LeadHeader = () => {
  const record = useRecordContext();
  if (!record) return null;
  const name = record.instagram_name || record.instagram_username || record.instagram_id;
  const cfg = getStatusConfig(record.status);
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
      <Avatar sx={{ width: 56, height: 56, background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', fontWeight: 700, fontSize: '1.5rem' }}>
        {(name || 'L')[0].toUpperCase()}
      </Avatar>
      <Box>
        <Typography variant="h5" sx={{ fontWeight: 800, color: '#e2e8f0', display: 'flex', alignItems: 'center', gap: 1.5 }}>
          {name}
          <Chip label={cfg.label} size="small" sx={{ background: cfg.bg, color: cfg.color, fontWeight: 700, border: `1px solid ${cfg.border}` }} />
        </Typography>
        <Typography variant="body2" sx={{ color: '#64748b' }}>
          ID: {record.id} · @{record.instagram_username || record.instagram_id}
          {record.phone && ` · ${record.phone}`}
        </Typography>
      </Box>
    </Box>
  );
};

const TabPanel = ({ value, index, children }: { value: number; index: number; children: React.ReactNode }) => (
  <Box sx={{ display: value === index ? 'block' : 'none', pt: 2 }}>{children}</Box>
);

const LeadEditForm = () => {
  const [tab, setTab] = useState(0);

  return (
    <>
      <LeadHeader />

      <Tabs
        value={tab}
        onChange={(_, v) => setTab(v)}
        sx={{
          mb: 2,
          '& .MuiTab-root': { color: '#64748b', fontWeight: 600, textTransform: 'none', minHeight: 44 },
          '& .Mui-selected': { color: '#818cf8 !important' },
          '& .MuiTabs-indicator': { backgroundColor: '#6366f1' },
        }}
      >
        <Tab label="Контакти та статус" />
        <Tab label="Деталі заявки" />
      </Tabs>

      {/* Tab 1: Contacts + Status + Managers */}
      <TabPanel value={tab} index={0}>
        <SectionCard title="Контактні дані" icon={<PersonIcon />}>
          <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
            <TextInput source="instagram_name" label="Ім'я" fullWidth sx={inputSx} />
            <TextInput source="phone" label="Телефон" fullWidth sx={inputSx} />
            <TextInput source="instagram_username" label="Instagram username" fullWidth sx={inputSx} disabled />
            <TextInput source="location" label="Місцезнаходження" fullWidth sx={inputSx} />
          </Box>
          <Box sx={{ mt: 1 }}>
            <BooleanInput source="has_project" label="Є проект або ескіз" />
          </Box>
        </SectionCard>

        <SectionCard title="Статус" icon={<AssignmentIcon />}>
          <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
            <Box>
              <Typography variant="caption" sx={{ color: '#64748b', fontWeight: 600, mb: 0.5, display: 'block' }}>AI оцінка</Typography>
              <SelectInput source="status" label="" fullWidth choices={AI_STATUS_CHOICES} sx={inputSx} />
            </Box>
            <Box>
              <Typography variant="caption" sx={{ color: '#64748b', fontWeight: 600, mb: 0.5, display: 'block' }}>Статус воронки</Typography>
              <SelectInput source="status" label="" fullWidth choices={MANAGER_STATUS_CHOICES} sx={inputSx} />
            </Box>
          </Box>
        </SectionCard>

        <SectionCard title="Призначені менеджери" icon={<SupervisorAccountIcon />}>
          <ReferenceArrayInput source="manager_ids" reference="managers">
            <SelectArrayInput
              label=""
              fullWidth
              optionText={(choice: any) => choice.name || choice.email || choice.telegram_id}
              helperText="Максимум 4 менеджери"
              sx={inputSx}
            />
          </ReferenceArrayInput>
        </SectionCard>
      </TabPanel>

      {/* Tab 2: Order details */}
      <TabPanel value={tab} index={1}>
        <SectionCard title="Параметри замовлення" icon={<BuildIcon />}>
          <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
            <TextInput source="type" label="Тип меблів" fullWidth sx={inputSx} />
            <TextInput source="dimensions" label="Розміри" fullWidth sx={inputSx} />
            <TextInput source="style" label="Стиль" fullWidth sx={inputSx} />
            <TextInput source="materials" label="Матеріали" fullWidth sx={inputSx} />
            <TextInput source="budget" label="Бюджет" fullWidth sx={inputSx} />
            <TextInput source="price_per_sqm" label="Ціна за м²" fullWidth sx={inputSx} />
            <TextInput source="timeline" label="Терміни" fullWidth sx={inputSx} />
          </Box>
          <Box sx={{ mt: 2 }}>
            <TextInput source="wishes" label="Побажання" fullWidth multiline rows={4} sx={inputSx} />
          </Box>
        </SectionCard>
      </TabPanel>
    </>
  );
};

export const LeadEdit = () => (
  <Edit
    sx={{
      '& .RaEdit-main': { maxWidth: 900 },
    }}
  >
    <SimpleForm toolbar={<EditToolbar />} sx={{ p: 3 }}>
      <LeadEditForm />
    </SimpleForm>
  </Edit>
);
