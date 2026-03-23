import { Layout, Menu } from 'react-admin';
import { Box, Typography } from '@mui/material';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import SupervisorAccountIcon from '@mui/icons-material/SupervisorAccount';
import SettingsIcon from '@mui/icons-material/Settings';

const CustomMenu = () => {
  return (
    <Menu>
      <Box
        sx={{
          px: 2,
          py: 2.5,
          mb: 1,
          display: 'flex',
          alignItems: 'center',
          gap: 1.5,
          borderBottom: '1px solid #2d3158',
        }}
      >
        <Box
          sx={{
            width: 36,
            height: 36,
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
        <Box>
          <Typography variant="subtitle2" sx={{ fontWeight: 700, color: '#e2e8f0', lineHeight: 1.2 }}>
            Mebelka Bot
          </Typography>
          <Typography variant="caption" sx={{ color: '#6366f1', fontWeight: 500 }}>
            Admin Panel
          </Typography>
        </Box>
      </Box>

      <Typography
        variant="caption"
        sx={{
          px: 2,
          py: 1,
          color: '#475569',
          fontWeight: 600,
          textTransform: 'uppercase',
          letterSpacing: '0.08em',
          display: 'block',
        }}
      >
        CRM
      </Typography>

      <Menu.DashboardItem primaryText="Дашборд" />
      <Menu.ResourceItem name="leads" primaryText="Ліди" />

      <Typography
        variant="caption"
        sx={{
          px: 2,
          py: 1,
          mt: 1,
          color: '#475569',
          fontWeight: 600,
          textTransform: 'uppercase',
          letterSpacing: '0.08em',
          display: 'block',
        }}
      >
        Управління
      </Typography>

      <Menu.Item to="/managers" primaryText="Менеджери" leftIcon={<SupervisorAccountIcon />} />
      <Menu.Item to="/settings" primaryText="Налаштування" leftIcon={<SettingsIcon />} />
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
      '& .RaMenu-root': {
        background: '#12151f',
        borderRight: '1px solid #2d3158',
        minHeight: '100vh',
      },
      '& .RaMenuItemLink-root': {
        borderRadius: '8px',
        mx: 1,
        color: '#94a3b8',
        '&.RaMenuItemLink-active': {
          background: 'rgba(99,102,241,0.15)',
          color: '#818cf8',
          borderLeft: '3px solid #6366f1',
        },
        '&:hover': {
          background: 'rgba(99,102,241,0.08)',
          color: '#c7d2fe',
        },
      },
    }}
  />
);
