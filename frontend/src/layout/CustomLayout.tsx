import { Layout, Menu, useGetIdentity, useSidebarState } from 'react-admin';
import { Box, Typography, Avatar } from '@mui/material';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import SupervisorAccountIcon from '@mui/icons-material/SupervisorAccount';
import SettingsIcon from '@mui/icons-material/Settings';
import ChatIcon from '@mui/icons-material/Chat';

const CustomMenu = () => {
  const [open] = useSidebarState();
  const { data: identity } = useGetIdentity();

  return (
    <Menu>
      {/* Logo */}
      <Box sx={{ height: 56, display: 'flex', alignItems: 'center', justifyContent: 'center', borderBottom: '1px solid #2d3158', gap: 1, overflow: 'hidden', px: open ? 1.5 : 0 }}>
        <Box sx={{ width: 30, height: 30, minWidth: 30, borderRadius: '8px', background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <AutoAwesomeIcon sx={{ fontSize: 18, color: '#fff' }} />
        </Box>
        <Box sx={{ overflow: 'hidden', opacity: open ? 1 : 0, transition: 'opacity 0.2s', whiteSpace: 'nowrap' }}>
          <Typography sx={{ fontWeight: 700, color: '#e2e8f0', fontSize: '0.85rem', lineHeight: 1.2 }}>Mebelka Bot</Typography>
          <Typography sx={{ color: '#6366f1', fontSize: '0.65rem', fontWeight: 500 }}>Admin Panel</Typography>
        </Box>
      </Box>

      {/* Section CRM */}
      <Box sx={{ height: open ? 'auto' : 0, overflow: 'hidden', transition: 'height 0.2s' }}>
        <Typography sx={{ px: 2, pt: 1.5, pb: 0.5, color: '#475569', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', fontSize: '0.6rem' }}>CRM</Typography>
      </Box>
      <Menu.DashboardItem primaryText="Дашборд" />
      <Menu.ResourceItem name="leads" primaryText="Ліди" />
      <Menu.Item to="/chats" primaryText="Чати" leftIcon={<ChatIcon />} />

      {/* Section Management */}
      <Box sx={{ height: open ? 'auto' : 0, overflow: 'hidden', transition: 'height 0.2s' }}>
        <Typography sx={{ px: 2, pt: 1.5, pb: 0.5, color: '#475569', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', fontSize: '0.6rem' }}>Управління</Typography>
      </Box>
      <Menu.Item to="/managers" primaryText="Менеджери" leftIcon={<SupervisorAccountIcon />} />
      <Menu.Item to="/settings" primaryText="Налаштування" leftIcon={<SettingsIcon />} />

      {/* Spacer + User */}
      <Box sx={{ flex: 1 }} />
      {identity && (
        <Box sx={{ height: 48, display: 'flex', alignItems: 'center', px: 1.5, borderTop: '1px solid #2d3158', gap: 1, overflow: 'hidden' }}>
          <Avatar sx={{ width: 28, height: 28, minWidth: 28, background: '#6366f1', fontSize: '0.7rem', fontWeight: 700 }}>
            {(identity.fullName || 'U')[0].toUpperCase()}
          </Avatar>
          <Typography sx={{ opacity: open ? 1 : 0, transition: 'opacity 0.2s', color: '#94a3b8', fontSize: '0.75rem', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {identity.fullName}
          </Typography>
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
