import { Chip } from '@mui/material';
import { getStatusConfig } from '../utils/statusMaps';

interface StatusChipProps {
  status: string | null | undefined;
  size?: 'small' | 'medium';
}

export const StatusChip = ({ status, size = 'small' }: StatusChipProps) => {
  const cfg = getStatusConfig(status ?? '');
  return (
    <Chip
      label={cfg.label}
      size={size}
      sx={{
        background: cfg.bg,
        color: cfg.color,
        border: `1px solid ${cfg.border}`,
        fontWeight: 600,
        fontSize: size === 'small' ? '0.72rem' : '0.8rem',
        height: size === 'small' ? 26 : 32,
      }}
    />
  );
};
