import { Layout, Menu, useGetIdentity, usePermissions, useSidebarState } from 'react-admin';
import { Box, Typography, Avatar, Chip } from '@mui/material';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import SupervisorAccountIcon from '@mui/icons-material/SupervisorAccount';
import SettingsIcon from '@mui/icons-material/Settings';
import ChatIcon from '@mui/icons-material/Chat';

const CustomMenu = () => {
  const [open] = useSidebarState();
  const { data: identity } = useGetIdentity();
  const { permissions: role } = usePermissions();

  const isSupermanager = role === 'supermanager';

  return (
    <Menu>
      {/* Logo — always visible, text hides when closed */}
      <Box sx={{ height: 56, display: 'flex', alignItems: 'center', justifyContent: open ? 'flex-start' : 'center', px: open ? 1.5 : 0, borderBottom: '1px solid #2d3158', gap: 1, overflow: 'hidden' }}>
        <Box sx={{ width: 28, height: 28, minWidth: 28, borderRadius: '7px', background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <AutoAwesomeIcon sx={{ fontSize: 15, color: '#fff' }} />
        </Box>
        {open && (
          <Box sx={{ overflow: 'hidden', whiteSpace: 'nowrap' }}>
            <Typography sx={{ fontWeight: 700, color: '#e2e8f0', fontSize: '0.85rem', lineHeight: 1.2 }}>Mebelka Bot</Typography>
            <Typography sx={{ color: '#6366f1', fontSize: '0.65rem', fontWeight: 500 }}>Admin Panel</Typography>
          </Box>
        )}
      </Box>

      <Typography sx={{ px: open ? 2 : 0, pt: 1.5, pb: 0.5, color: '#475569', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', fontSize: '0.55rem', textAlign: open ? 'left' : 'center' }}>CRM</Typography>
      <Menu.DashboardItem primaryText={open ? 'Дашборд' : ''} sx={!open ? { justifyContent: 'center', pl: 1.5, pr: 0, '& .MuiListItemIcon-root': { minWidth: 0 } } : {}} />
      <Menu.ResourceItem name="leads" primaryText={open ? 'Ліди' : ''} sx={!open ? { justifyContent: 'center', pl: 1.5, pr: 0, '& .MuiListItemIcon-root': { minWidth: 0 } } : {}} />
      <Menu.Item to="/chats" primaryText={open ? 'Чати' : ''} leftIcon={<ChatIcon />} sx={!open ? { justifyContent: 'center', pl: 1.5, pr: 0, '& .MuiListItemIcon-root': { minWidth: 0 } } : {}} />

      {isSupermanager && (
        <>
          <Typography sx={{ px: open ? 2 : 0, pt: 1.5, pb: 0.5, color: '#475569', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', fontSize: '0.55rem', textAlign: open ? 'left' : 'center' }}>{open ? 'Управління' : 'УПР'}</Typography>
          <Menu.Item to="/managers" primaryText={open ? 'Менеджери' : ''} leftIcon={<SupervisorAccountIcon />} sx={!open ? { justifyContent: 'center', pl: 1.5, pr: 0, '& .MuiListItemIcon-root': { minWidth: 0 } } : {}} />
          <Menu.Item to="/settings" primaryText={open ? 'Налаштування' : ''} leftIcon={<SettingsIcon />} sx={!open ? { justifyContent: 'center', pl: 1.5, pr: 0, '& .MuiListItemIcon-root': { minWidth: 0 } } : {}} />
        </>
      )}

      <Box sx={{ flex: 1 }} />
      {identity && (
        <Box sx={{ height: 48, display: 'flex', alignItems: 'center', justifyContent: open ? 'flex-start' : 'center', px: open ? 1.5 : 0, borderTop: '1px solid #2d3158', gap: 1, overflow: 'hidden' }}>
          <Avatar sx={{ width: 28, height: 28, minWidth: 28, background: '#6366f1', fontSize: '0.7rem', fontWeight: 700, flexShrink: 0 }}>
            {(identity.fullName || 'U')[0].toUpperCase()}
          </Avatar>
          {open && (
            <Box sx={{ overflow: 'hidden' }}>
              <Typography sx={{ color: '#94a3b8', fontSize: '0.75rem', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {identity.fullName}
              </Typography>
              {isSupermanager && (
                <Chip
                  label="Адмін"
                  size="small"
                  sx={{ height: 16, fontSize: '0.6rem', fontWeight: 700, background: 'rgba(245,158,11,0.15)', color: '#f59e0b', '& .MuiChip-label': { px: 0.8 } }}
                />
              )}
            </Box>
          )}
        </Box>
      )}
    </Menu>
  );
};

export const CustomLayout = (props: any) => (
  <Layout
    {...props}
    menu={CustomMenu}
    sx={{
      '& .RaLayout-content': {
        background: '#0f1117',
        minHeight: '100vh',
      },
      '& .RaSidebar-fixed, & .MuiDrawer-paper': {
        background: '#12151f !important',
        borderRight: '1px solid #2d3158 !important',
        overflowX: 'hidden !important',
      },
      '& .RaMenu-root': {
        background: '#12151f',
        display: 'flex',
        flexDirection: 'column',
        minHeight: '100vh',
        overflowX: 'hidden',
      },
      '& .RaMenuItemLink-root': {
        borderRadius: '8px',
        mx: 0.5,
        my: 0.2,
        color: '#94a3b8',
        minHeight: 40,
        '&.RaMenuItemLink-active': {
          background: 'rgba(99,102,241,0.15)',
          color: '#818cf8',
        },
        '&:hover': {
          background: 'rgba(99,102,241,0.08)',
          color: '#c7d2fe',
        },
        '& .MuiListItemIcon-root': {
          color: 'inherit',
          minWidth: 36,
        },
      },
      '& .RaAppBar-toolbar': {
        background: '#12151f',
        borderBottom: '1px solid #2d3158',
        minHeight: '48px !important',
      },
      '& .RaAppBar-menuButton': {
        color: '#94a3b8',
      },
    }}
  />
);
