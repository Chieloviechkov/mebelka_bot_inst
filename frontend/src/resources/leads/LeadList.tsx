import { useState } from 'react';
import {
  List, Datagrid, DateField, SearchInput, SelectInput, DateInput,
  FunctionField, ShowButton, EditButton, TopToolbar, FilterButton,
  useNotify, useRefresh, useUnselectAll, useListContext,
} from 'react-admin';
import {
  Box, Typography, Chip, Avatar, IconButton, Tooltip,
  Button, Dialog, DialogTitle, DialogContent, DialogActions, List as MuiList,
  ListItemButton, ListItemText, CircularProgress,
} from '@mui/material';
import InstagramIcon from '@mui/icons-material/Instagram';
import ChatBubbleOutlineIcon from '@mui/icons-material/ChatBubbleOutline';
import FileDownloadIcon from '@mui/icons-material/FileDownload';
import PersonAddIcon from '@mui/icons-material/PersonAdd';
import { ALL_STATUS_CHOICES } from '../../utils/statusMaps';
import { StatusChip } from '../../components/StatusChip';
import api from '../../api';

const leadsFilters = [
  <SearchInput key="q" source="q" alwaysOn placeholder="Пошук..." />,
  <SelectInput
    key="status"
    source="status"
    label="Статус"
    choices={ALL_STATUS_CHOICES}
  />,
  <SelectInput
    key="has_application"
    source="has_application"
    label="Заявка"
    choices={[
      { id: 'true', name: 'З заявкою' },
      { id: 'false', name: 'Без заявки (тільки діалог)' },
    ]}
  />,
  <DateInput key="date_from" source="date_from" label="Дата від" />,
  <DateInput key="date_to" source="date_to" label="Дата до" />,
];

const handleExportCsv = async () => {
  try {
    const res = await api.get('/admin/leads/export', { responseType: 'blob' });
    const blob = new Blob([res.data], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'leads.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  } catch {
    alert('Помилка експорту');
  }
};

const LeadActions = () => (
  <TopToolbar sx={{ gap: 1 }}>
    <Button
      size="small"
      startIcon={<FileDownloadIcon />}
      onClick={handleExportCsv}
      sx={{ color: '#94a3b8', textTransform: 'none', fontSize: '0.8rem' }}
    >
      Експорт CSV
    </Button>
    <FilterButton />
  </TopToolbar>
);

const BulkAssignButton = () => {
  const [open, setOpen] = useState(false);
  const [managers, setManagers] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const notify = useNotify();
  const refresh = useRefresh();
  const unselectAll = useUnselectAll('leads');
  const { selectedIds } = useListContext();

  const handleOpen = async () => {
    setOpen(true);
    setLoading(true);
    try {
      const res = await api.get('/admin/managers');
      setManagers(res.data);
    } catch {
      notify('Помилка завантаження менеджерів', { type: 'error' });
    }
    setLoading(false);
  };

  const handleAssign = async (managerId: number) => {
    if (!selectedIds || selectedIds.length === 0) {
      notify('Не вибрано жодного ліда', { type: 'warning' });
      setOpen(false);
      return;
    }

    let success = 0;
    let errors = 0;
    for (const leadId of selectedIds) {
      try {
        await api.post(`/admin/leads/${leadId}/assign`, { manager_id: managerId });
        success++;
      } catch {
        errors++;
      }
    }

    setOpen(false);
    if (success > 0) notify(`Менеджера призначено для ${success} лідів`, { type: 'success' });
    if (errors > 0) notify(`${errors} помилок (можливо, вже призначено)`, { type: 'warning' });
    unselectAll();
    refresh();
  };

  return (
    <>
      <Button
        size="small"
        startIcon={<PersonAddIcon />}
        onClick={handleOpen}
        sx={{ color: '#94a3b8', textTransform: 'none' }}
      >
        Призначити менеджера
      </Button>
      <Dialog open={open} onClose={() => setOpen(false)} PaperProps={{ sx: { background: '#1a1d2e', color: '#e2e8f0', minWidth: 320 } }}>
        <DialogTitle>Оберіть менеджера</DialogTitle>
        <DialogContent>
          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 3 }}><CircularProgress size={28} /></Box>
          ) : (
            <MuiList>
              {managers.map((m: any) => (
                <ListItemButton key={m.id} onClick={() => handleAssign(m.id)} sx={{ borderRadius: 1, '&:hover': { background: 'rgba(99,102,241,0.1)' } }}>
                  <ListItemText
                    primary={m.name || m.email}
                    secondary={`${m.role} | ${m._count?.leads ?? 0} лідів`}
                    primaryTypographyProps={{ sx: { color: '#e2e8f0' } }}
                    secondaryTypographyProps={{ sx: { color: '#64748b' } }}
                  />
                </ListItemButton>
              ))}
            </MuiList>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpen(false)} sx={{ color: '#94a3b8' }}>Скасувати</Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

const LeadBulkActions = () => (
  <>
    <BulkAssignButton />
  </>
);

const EmptyLeads = () => (
  <Box sx={{ textAlign: 'center', py: 10 }}>
    <InstagramIcon sx={{ fontSize: 64, color: '#2d3158', mb: 2 }} />
    <Typography variant="h6" sx={{ color: '#475569', mb: 1 }}>
      Лідів поки немає
    </Typography>
    <Typography variant="body2" sx={{ color: '#334155' }}>
      Заявки з Instagram з'являться тут автоматично
    </Typography>
  </Box>
);

export const LeadList = () => (
  <List
    filters={leadsFilters}
    actions={<LeadActions />}
    sort={{ field: 'updatedAt', order: 'DESC' }}
    perPage={25}
    empty={<EmptyLeads />}
    sx={{ '& .RaList-main': { mt: 1 } }}
  >
    <Datagrid
      bulkActionButtons={<LeadBulkActions />}
      sx={{
        '& .RaDatagrid-headerCell': {
          background: '#12151f',
          color: '#64748b',
          fontWeight: 700,
          fontSize: '0.72rem',
          textTransform: 'uppercase',
        },
        '& .RaDatagrid-row': {
          '&:hover': { background: 'rgba(99,102,241,0.05)' },
        },
        '& .RaDatagrid-rowCell': {
          borderColor: '#1e2235',
          py: 1.5,
        },
      }}
    >
      {/* Client */}
      <FunctionField
        label="Клієнт"
        render={(record: any) => {
          const displayName =
            record.instagram_name || record.instagram_username || record.instagram_id || 'U';
          return (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
              <Avatar
                sx={{
                  width: 36,
                  height: 36,
                  background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                  fontWeight: 700,
                  fontSize: '0.9rem',
                }}
              >
                {displayName[0].toUpperCase()}
              </Avatar>
              <Box>
                <Typography variant="body2" sx={{ fontWeight: 600, color: '#e2e8f0' }}>
                  {displayName}
                </Typography>
                {record.phone && (
                  <Typography variant="caption" sx={{ color: '#64748b' }}>
                    {record.phone}
                  </Typography>
                )}
              </Box>
            </Box>
          );
        }}
      />

      {/* Status */}
      <FunctionField
        label="Статус"
        render={(record: any) => <StatusChip status={record.status} />}
      />

      {/* Managers */}
      <FunctionField
        label="Менеджери"
        render={(record: any) => {
          const managers = record.leadManagers?.map((lm: any) => lm.manager);
          if (!managers || managers.length === 0) {
            return (
              <Typography variant="caption" sx={{ color: '#475569' }}>
                —
              </Typography>
            );
          }
          return (
            <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
              {managers.map((m: any) => (
                <Chip
                  key={m.id}
                  label={m.name || m.telegram_id}
                  size="small"
                  sx={{
                    background: '#1e2235',
                    color: '#94a3b8',
                    fontSize: '0.65rem',
                  }}
                />
              ))}
            </Box>
          );
        }}
      />

      {/* Chat button */}
      <FunctionField
        label="Чат"
        render={(record: any) => {
          const count = record._count?.messages ?? 0;
          return (
            <Tooltip title="Відкрити чат">
              <IconButton
                size="small"
                onClick={(e: React.MouseEvent) => {
                  e.stopPropagation();
                  window.location.hash = `#/leads/${record.id}/show`;
                }}
                sx={{ color: count > 0 ? '#6366f1' : '#475569', '&:hover': { background: 'rgba(99,102,241,0.1)' } }}
              >
                <ChatBubbleOutlineIcon sx={{ fontSize: 16 }} />
                <Typography variant="caption" sx={{ ml: 0.5, fontWeight: 600, fontSize: '0.75rem' }}>
                  {count}
                </Typography>
              </IconButton>
            </Tooltip>
          );
        }}
      />

      {/* Last update */}
      <DateField
        source="updatedAt"
        label="Оновлено"
        showTime
        locales="uk-UA"
        sx={{ color: '#64748b', fontSize: '0.8rem' }}
      />

      <ShowButton label="" sx={{ minWidth: 0, padding: 1 }} />
      <EditButton label="" sx={{ minWidth: 0, padding: 1 }} />
    </Datagrid>
  </List>
);
