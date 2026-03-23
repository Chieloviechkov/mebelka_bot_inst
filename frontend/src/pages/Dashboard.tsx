import { useEffect, useState } from 'react';
import { Link } from 'react-admin';
import {
  Box, Card, CardContent, Typography, Avatar,
  Button, Skeleton, LinearProgress,
} from '@mui/material';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell, Legend,
} from 'recharts';
import PeopleAltIcon from '@mui/icons-material/PeopleAlt';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import HourglassTopIcon from '@mui/icons-material/HourglassTop';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import TodayIcon from '@mui/icons-material/Today';
import MarkUnreadChatAltIcon from '@mui/icons-material/MarkUnreadChatAlt';
import api from '../api';
import { ALL_STATUSES } from '../utils/statusMaps';

const StatCard = ({
  title, value, icon, color, subtitle,
}: {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  color: string;
  subtitle?: string;
}) => (
  <Card>
    <CardContent>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <Box>
          <Typography variant="caption" sx={{ color: '#64748b', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', fontSize: '0.7rem' }}>
            {title}
          </Typography>
          <Typography variant="h4" sx={{ fontWeight: 800, color: '#e2e8f0', mt: 0.5, lineHeight: 1 }}>
            {value}
          </Typography>
          {subtitle && (
            <Typography variant="caption" sx={{ color: '#475569', mt: 0.5, display: 'block' }}>
              {subtitle}
            </Typography>
          )}
        </Box>
        <Box
          sx={{
            width: 44, height: 44, borderRadius: '12px',
            background: `${color}20`,
            border: `1px solid ${color}40`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: color,
          }}
        >
          {icon}
        </Box>
      </Box>
    </CardContent>
  </Card>
);

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload?.length) {
    return (
      <Box sx={{ background: '#1e2235', border: '1px solid #2d3158', borderRadius: '8px', px: 2, py: 1.5 }}>
        <Typography variant="caption" sx={{ color: '#94a3b8', mb: 0.5, display: 'block' }}>{label}</Typography>
        <Typography variant="body2" sx={{ color: '#6366f1', fontWeight: 700 }}>
          {payload[0].value}
        </Typography>
      </Box>
    );
  }
  return null;
};

export const Dashboard = () => {
  const [analytics, setAnalytics] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/admin/analytics')
      .then(res => { setAnalytics(res.data); setLoading(false); })
      .catch(() => { setLoading(false); });
  }, []);

  const total = analytics?.totalLeads ?? 0;
  const byStatus = analytics?.byStatus ?? {};
  const perspective = byStatus.Perspektive ?? 0;
  const needsClarification = byStatus.NeedsClarification ?? 0;
  const qualRate = analytics?.conversionRates?.qualifiedPercent ?? '0%';
  const newToday = analytics?.newToday ?? 0;
  const unreadChats = analytics?.unreadChats ?? 0;
  const managers = analytics?.managers ?? [];

  // Build pie data from byStatus using ALL_STATUSES from statusMaps
  const pieData = Object.entries(byStatus).map(([key, val]) => {
    const cfg = ALL_STATUSES[key];
    return {
      name: cfg?.label ?? key,
      value: val as number,
      color: cfg?.color ?? '#6366f1',
    };
  }).filter(d => d.value > 0);

  // Build funnel chart data
  const funnel = analytics?.funnel;
  const funnelData = funnel ? [
    { name: 'Заявки', value: funnel.zayavka },
    { name: 'Контакт менеджера', value: funnel.kontaktMenedzhera },
    { name: 'Угода', value: funnel.ugoda },
  ] : [];

  if (loading) {
    return (
      <Box sx={{ p: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 4 }}>
          <AutoAwesomeIcon sx={{ color: '#6366f1', fontSize: 28 }} />
          <Typography variant="h4" sx={{ fontWeight: 800, color: '#e2e8f0' }}>Дашборд</Typography>
        </Box>
        <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 2, mb: 3 }}>
          {[0,1,2,3].map(i => (
            <Skeleton key={i} variant="rounded" height={100} sx={{ background: '#1a1d2e', borderRadius: 3 }} />
          ))}
        </Box>
        <Skeleton variant="rounded" height={300} sx={{ background: '#1a1d2e', borderRadius: 3 }} />
      </Box>
    );
  }

  const maxLeads = Math.max(...managers.map((m: any) => m.leads), 1);

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Box sx={{ mb: 4 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1 }}>
          <AutoAwesomeIcon sx={{ color: '#6366f1', fontSize: 28 }} />
          <Typography variant="h4" sx={{ fontWeight: 800, color: '#e2e8f0' }}>
            Дашборд
          </Typography>
        </Box>
        <Typography variant="body2" sx={{ color: '#475569' }}>
          Огляд активності Instagram-бота та статус лідів
        </Typography>
      </Box>

      {/* Offline banner */}
      {!analytics && (
        <Box sx={{ mb: 3, p: 2, borderRadius: 2, background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)' }}>
          <Typography variant="body2" sx={{ color: '#ef4444' }}>
            Бекенд недоступний — підключіть NestJS сервер на порту 3000
          </Typography>
        </Box>
      )}

      {/* Stat Cards — row 1 */}
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr 1fr', md: 'repeat(3, 1fr)' }, gap: 2, mb: 2 }}>
        <StatCard title="Всього лідів" value={total} icon={<PeopleAltIcon />} color="#6366f1" subtitle="за весь час" />
        <StatCard title="Нові сьогодні" value={newToday} icon={<TodayIcon />} color="#06b6d4" subtitle="створено за сьогодні" />
        <StatCard title="Непрочитані чати" value={unreadChats} icon={<MarkUnreadChatAltIcon />} color="#ef4444" subtitle="очікують відповіді" />
      </Box>

      {/* Stat Cards — row 2 */}
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr 1fr', md: 'repeat(3, 1fr)' }, gap: 2, mb: 3 }}>
        <StatCard title="Перспективних" value={perspective} icon={<CheckCircleOutlineIcon />} color="#22c55e" subtitle="готові до роботи" />
        <StatCard title="Кваліфікація" value={qualRate} icon={<TrendingUpIcon />} color="#818cf8" subtitle="від усіх заявок" />
        <StatCard title="Уточнення" value={needsClarification} icon={<HourglassTopIcon />} color="#f59e0b" subtitle="потребують відповіді" />
      </Box>

      {/* Charts + Managers */}
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '2fr 1fr' }, gap: 2, mb: 3 }}>
        {/* Funnel Bar Chart */}
        <Card>
          <CardContent>
            <Typography variant="subtitle2" sx={{ fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', fontSize: '0.72rem', letterSpacing: '0.08em', mb: 2.5 }}>
              Воронка конверсії
            </Typography>
            {funnelData.length > 0 ? (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={funnelData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e2235" />
                  <XAxis dataKey="name" tick={{ fill: '#475569', fontSize: 11 }} axisLine={{ stroke: '#1e2235' }} tickLine={false} />
                  <YAxis tick={{ fill: '#475569', fontSize: 11 }} axisLine={false} tickLine={false} allowDecimals={false} />
                  <Tooltip content={<CustomTooltip />} cursor={false} />
                  <Bar dataKey="value" fill="#6366f1" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 220 }}>
                <Typography variant="body2" sx={{ color: '#334155' }}>Немає даних</Typography>
              </Box>
            )}

            {/* Conversion rates */}
            {analytics?.conversionRates && (
              <Box sx={{ display: 'flex', gap: 3, mt: 2, pt: 2, borderTop: '1px solid #1e2235' }}>
                <Box>
                  <Typography variant="caption" sx={{ color: '#64748b', fontSize: '0.65rem' }}>Заявка → Контакт</Typography>
                  <Typography variant="body2" sx={{ color: '#818cf8', fontWeight: 700 }}>{analytics.conversionRates.zayavkaToKontakt}</Typography>
                </Box>
                <Box>
                  <Typography variant="caption" sx={{ color: '#64748b', fontSize: '0.65rem' }}>Контакт → Угода</Typography>
                  <Typography variant="body2" sx={{ color: '#22c55e', fontWeight: 700 }}>{analytics.conversionRates.kontaktToUgoda}</Typography>
                </Box>
                <Box>
                  <Typography variant="caption" sx={{ color: '#64748b', fontSize: '0.65rem' }}>Загальна конверсія</Typography>
                  <Typography variant="body2" sx={{ color: '#f59e0b', fontWeight: 700 }}>{analytics.conversionRates.overallConversion}</Typography>
                </Box>
              </Box>
            )}
          </CardContent>
        </Card>

        {/* Pie Chart */}
        <Card>
          <CardContent>
            <Typography variant="subtitle2" sx={{ fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', fontSize: '0.72rem', letterSpacing: '0.08em', mb: 2.5 }}>
              Розподіл статусів
            </Typography>
            {pieData.length === 0 ? (
              <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: 220 }}>
                <Typography variant="body2" sx={{ color: '#334155' }}>Немає даних</Typography>
              </Box>
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={85}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={index} fill={entry.color} stroke="transparent" />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{ background: '#1e2235', border: '1px solid #2d3158', borderRadius: 8 }}
                    labelStyle={{ color: '#94a3b8' }}
                    itemStyle={{ color: '#e2e8f0' }}
                  />
                  <Legend
                    formatter={(value) => (
                      <Typography component="span" variant="caption" sx={{ color: '#94a3b8' }}>{value}</Typography>
                    )}
                  />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </Box>

      {/* Managers leaderboard */}
      {managers.length > 0 && (
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Typography variant="subtitle2" sx={{ fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', fontSize: '0.72rem', letterSpacing: '0.08em', mb: 2 }}>
              Менеджери
            </Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
              {managers.map((m: any) => (
                <Box key={m.id} sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                  <Avatar sx={{ width: 32, height: 32, background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', fontWeight: 700, fontSize: '0.8rem' }}>
                    {(m.name || 'M')[0].toUpperCase()}
                  </Avatar>
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.3 }}>
                      <Typography variant="body2" sx={{ fontWeight: 600, color: '#e2e8f0', fontSize: '0.85rem' }}>
                        {m.name}
                      </Typography>
                      <Typography variant="caption" sx={{ color: '#94a3b8', fontWeight: 700 }}>
                        {m.leads}
                      </Typography>
                    </Box>
                    <LinearProgress
                      variant="determinate"
                      value={(m.leads / maxLeads) * 100}
                      sx={{
                        height: 6, borderRadius: 3,
                        background: '#1e2235',
                        '& .MuiLinearProgress-bar': { background: 'linear-gradient(90deg, #6366f1, #8b5cf6)', borderRadius: 3 },
                      }}
                    />
                  </Box>
                </Box>
              ))}
            </Box>
          </CardContent>
        </Card>
      )}

      {/* Quick Link */}
      <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
        <Button
          component={Link}
          to="/leads"
          endIcon={<ArrowForwardIcon />}
          sx={{
            color: '#818cf8',
            fontWeight: 600,
            '&:hover': { color: '#e2e8f0', background: 'rgba(99,102,241,0.1)' },
          }}
        >
          Переглянути всі ліди
        </Button>
      </Box>
    </Box>
  );
};
