import { useEffect } from 'react';
import { Admin, Resource, CustomRoutes, defaultTheme } from 'react-admin';
import { Route } from 'react-router-dom';
import { createTheme } from '@mui/material/styles';
import PeopleAltIcon from '@mui/icons-material/PeopleAlt';

import { dataProvider } from './dataProvider';
import { authProvider } from './authProvider';
import { LeadList } from './resources/leads/LeadList';
import { LeadShow } from './resources/leads/LeadShow';
import { LeadEdit } from './resources/leads/LeadEdit';
import { Dashboard } from './pages/Dashboard';
import { ManagersPage } from './pages/ManagersPage';
import { SettingsPage } from './pages/SettingsPage';
import { ChatsPage } from './pages/ChatsPage';
import { CustomLayout } from './layout/CustomLayout';
import { LoginPage } from './pages/LoginPage';
import { i18nProvider } from './i18n/i18nProvider';
import { setCustomStatusLabels } from './utils/statusMaps';
import api from './api';

const darkTheme = createTheme({
  ...defaultTheme,
  palette: {
    mode: 'dark',
    primary: { main: '#6366f1', light: '#818cf8', dark: '#4f46e5' },
    secondary: { main: '#22c55e' },
    background: {
      default: '#0f1117',
      paper: '#1a1d2e',
    },
    error: { main: '#ef4444' },
    warning: { main: '#f59e0b' },
    success: { main: '#22c55e' },
    text: {
      primary: '#e2e8f0',
      secondary: '#94a3b8',
    },
    divider: '#2d3158',
    action: {
      hover: 'rgba(99,102,241,0.08)',
      selected: 'rgba(99,102,241,0.12)',
      focus: 'rgba(99,102,241,0.08)',
    },
  },
  shape: { borderRadius: 12 },
  typography: {
    fontFamily: "'Inter', -apple-system, sans-serif",
    h5: { fontWeight: 700 },
    h6: { fontWeight: 600 },
  },
  components: {
    MuiCard: {
      styleOverrides: {
        root: {
          background: '#1a1d2e',
          border: '1px solid #2d3158',
          boxShadow: '0 4px 24px rgba(0,0,0,0.3)',
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundImage: 'none',
        },
      },
    },
    MuiTableCell: {
      styleOverrides: {
        root: {
          borderColor: '#2d3158',
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          fontWeight: 600,
          fontSize: '0.75rem',
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          fontWeight: 600,
          textTransform: 'none',
        },
      },
    },
  },
});

export default function App() {
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      api.get('/admin/status-labels').then(res => {
        setCustomStatusLabels(res.data || {});
      }).catch(() => {});
    }
  }, []);

  return (
    <Admin
      dataProvider={dataProvider}
      authProvider={authProvider}
      i18nProvider={i18nProvider}
      dashboard={Dashboard}
      theme={darkTheme}
      layout={CustomLayout}
      title="Mebelka Bot · Admin"
      loginPage={LoginPage}
      requireAuth
    >
      <Resource
        name="leads"
        list={LeadList}
        show={LeadShow}
        edit={LeadEdit}
        icon={PeopleAltIcon}
        options={{ label: 'Ліди' }}
      />
      <Resource name="managers" />

      <CustomRoutes>
        <Route path="/chats" element={<ChatsPage />} />
        <Route path="/managers" element={<ManagersPage />} />
        <Route path="/settings" element={<SettingsPage />} />
      </CustomRoutes>
    </Admin>
  );
}
