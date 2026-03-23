import { Layout, Menu, useGetIdentity, useSidebarState } from 'react-admin';
import { Box, Typography, Avatar } from '@mui/material';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import SupervisorAccountIcon from '@mui/icons-material/SupervisorAccount';
import SettingsIcon from '@mui/icons-material/Settings';

const CustomMenu = () => {
  const [open] = useSidebarState();
  const { data: identity } = useGetIdentity();

  return (
    <Menu>
      {/* Logo - collapses to icon only */}
      <Box
        sx={{
          px: open ? 2 : 1,
          py: 2,
          mb: 0.5,
          display: 'flex',
          alignItems: 'center',
          gap: 1.5,
          borderBottom: '1px solid #2d3158',
          justifyContent: open ? 'flex-start' : 'center',
          minHeight: 64,
        }}
      >
        <Box
          sx={{
            width: 36,
            height: 36,
            minWidth: 36,
            borderRadius: '10px',
            background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 4px 12px rgba(99,102,241,0.4)',
          }}
        >
          <AutoAwesomeIcon sx={{ fontSize: 20, color: '#fff' }} />
        </Box>
        {open && (
          <Box sx={{ overflow: 'hidden' }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 700, color: '#e2e8f0', lineHeight: 1.2, whiteSpace: 'nowrap' }}>
              Mebelka Bot
            </Typography>
            <Typography variant="caption" sx={{ color: '#6366f1', fontWeight: 500, whiteSpace: 'nowrap' }}>
              Admin Panel
            </Typography>
          </Box>
        )}
      </Box>

      {/* Section: CRM */}
      {open && (
        <Typography
          variant="caption"
          sx={{
            px: 2, py: 0.8, color: '#475569', fontWeight: 600,
            textTransform: 'uppercase', letterSpacing: '0.08em', display: 'block', fontSize: '0.65rem',
          }}
        >
          CRM
        </Typography>
      )}

      <Menu.DashboardItem primaryText="Дашборд" />
      <Menu.ResourceItem name="leads" primaryText="Ліди" />

      {/* Section: Management */}
      {open && (
        <Typography
          variant="caption"
          sx={{
            px: 2, py: 0.8, mt: 1, color: '#475569', fontWeight: 600,
            textTransform: 'uppercase', letterSpacing: '0.08em', display: 'block', fontSize: '0.65rem',
          }}
        >
          Управління
        </Typography>
      )}

      <Menu.Item to="/managers" primaryText="Менеджери" leftIcon={<SupervisorAccountIcon />} />
      <Menu.Item to="/settings" primaryText="Налаштування" leftIcon={<SettingsIcon />} />

      {/* User info at bottom */}
      {identity && (
        <Box
          sx={{
            mt: 'auto', px: open ? 2 : 1, py: 1.5,
            borderTop: '1px solid #2d3158',
            display: 'flex', alignItems: 'center', gap: 1,
            justifyContent: open ? 'flex-start' : 'center',
          }}
        >
          <Avatar sx={{ width: 28, height: 28, background: '#6366f1', fontSize: '0.75rem', fontWeight: 700 }}>
            {(identity.fullName || 'U')[0].toUpperCase()}
          </Avatar>
          {open && (
            <Typography variant="caption" sx={{ color: '#94a3b8', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {identity.fullName}
            </Typography>
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
        p: { xs: 1, sm: 2, md: 3 },
      },
      // Sidebar
      '& .RaSidebar-fixed': {
        background: '#12151f',
        borderRight: '1px solid #2d3158',
        height: '100vh',
        overflowX: 'hidden',
      },
      '& .MuiDrawer-paper': {
        background: '#12151f !important',
        borderRight: '1px solid #2d3158 !important',
      },
      // Menu root
      '& .RaMenu-root': {
        background: '#12151f',
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        pt: 0,
      },
      // Menu items
      '& .RaMenuItemLink-root': {
        borderRadius: '8px',
        mx: 1,
        my: 0.3,
        color: '#94a3b8',
        minHeight: 40,
        '&.RaMenuItemLink-active': {
          background: 'rgba(99,102,241,0.15)',
          color: '#818cf8',
          borderLeft: '3px solid #6366f1',
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
      // Top AppBar
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
