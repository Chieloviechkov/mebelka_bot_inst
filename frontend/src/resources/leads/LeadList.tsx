import {
  List, Datagrid, DateField, SearchInput, SelectInput, DateInput,
  FunctionField, ShowButton, EditButton, TopToolbar, FilterButton,
} from 'react-admin';
import { Box, Typography, Chip, Avatar } from '@mui/material';
import InstagramIcon from '@mui/icons-material/Instagram';
import ChatBubbleOutlineIcon from '@mui/icons-material/ChatBubbleOutline';
import { AI_STATUS_CHOICES, ALL_STATUS_CHOICES, getStatusConfig } from '../../utils/statusMaps';
import { StatusChip } from '../../components/StatusChip';

const leadsFilters = [
  <SearchInput key="q" source="q" alwaysOn placeholder="Пошук..." />,
  <SelectInput
    key="status"
    source="status"
    label="Статус"
    choices={ALL_STATUS_CHOICES}
  />,
  <DateInput key="date_from" source="date_from" label="Дата від" />,
  <DateInput key="date_to" source="date_to" label="Дата до" />,
];

const LeadActions = () => (
  <TopToolbar sx={{ gap: 1 }}>
    <FilterButton />
  </TopToolbar>
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
      bulkActionButtons={false}
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

      {/* Messages count */}
      <FunctionField
        label="Повідомлень"
        render={(record: any) => (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <ChatBubbleOutlineIcon sx={{ fontSize: 14, color: '#475569' }} />
            <Typography variant="body2" sx={{ color: '#64748b' }}>
              {record._count?.messages ?? 0}
            </Typography>
          </Box>
        )}
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
