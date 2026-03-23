import {
  Edit, SimpleForm, TextInput, SelectInput, BooleanInput,
  ReferenceArrayInput, SelectArrayInput,
} from 'react-admin';
import { Box, Typography, Divider } from '@mui/material';
import { ALL_STATUS_CHOICES } from '../../utils/statusMaps';

const Aside = () => (
  <Box sx={{ width: 300, ml: 4, mt: 8, p: 2, background: 'rgba(99,102,241,0.05)', borderRadius: 2, border: '1px solid rgba(99,102,241,0.1)' }}>
    <Typography variant="subtitle2" sx={{ color: '#818cf8', fontWeight: 700, mb: 1, textTransform: 'uppercase', fontSize: '0.75rem' }}>
      Редагування ліда
    </Typography>
    <Typography variant="body2" sx={{ color: '#94a3b8' }}>
      Змінюйте статуси, контактні дані та призначайте відповідальних менеджерів.
      Усі зміни будуть зафіксовані в історії дій.
    </Typography>
  </Box>
);

export const LeadEdit = () => {
  return (
    <Edit aside={<Aside />}>
      <SimpleForm sx={{ '& .MuiFormControl-root': { mb: 2 } }}>
        <Typography variant="h6" sx={{ color: '#e2e8f0', mb: 2, fontWeight: 700 }}>Контакти</Typography>

        <Box sx={{ display: 'flex', gap: 2, width: '100%' }}>
          <TextInput source="instagram_id" label="Instagram ID" disabled fullWidth sx={{ flex: 1 }} />
          <TextInput source="instagram_name" label="Ім'я" fullWidth sx={{ flex: 1 }} />
          <TextInput source="phone" label="Телефон" fullWidth sx={{ flex: 1 }} />
        </Box>
        <Box sx={{ display: 'flex', gap: 2, width: '100%' }}>
          <TextInput source="location" label="Місцезнаходження" fullWidth sx={{ flex: 1 }} />
          <BooleanInput source="has_project" label="Є проект/ескіз" sx={{ flex: 1 }} />
        </Box>

        <Divider sx={{ borderColor: '#2d3158', my: 2, width: '100%' }} />
        <Typography variant="h6" sx={{ color: '#e2e8f0', mb: 2, fontWeight: 700 }}>Статус та менеджери</Typography>

        <Box sx={{ display: 'flex', gap: 2, width: '100%' }}>
          <SelectInput
            source="status"
            label="Статус"
            fullWidth
            sx={{ flex: 1 }}
            choices={ALL_STATUS_CHOICES}
          />
        </Box>

        <ReferenceArrayInput source="manager_ids" reference="managers">
          <SelectArrayInput
            label="Призначені менеджери (до 4-х)"
            fullWidth
            optionText={(choice: any) => choice.name || choice.telegram_id}
            helperText="Виберіть менеджерів, які будуть відповідальні за цього клієнта"
          />
        </ReferenceArrayInput>

        <Divider sx={{ borderColor: '#2d3158', my: 2, width: '100%' }} />
        <Typography variant="h6" sx={{ color: '#e2e8f0', mb: 2, fontWeight: 700 }}>Деталі заявки</Typography>

        <Box sx={{ display: 'flex', gap: 2, width: '100%' }}>
          <TextInput source="type" label="Тип меблів" fullWidth sx={{ flex: 1 }} />
          <TextInput source="dimensions" label="Розміри" fullWidth sx={{ flex: 1 }} />
        </Box>
        <Box sx={{ display: 'flex', gap: 2, width: '100%' }}>
          <TextInput source="style" label="Стиль" fullWidth sx={{ flex: 1 }} />
          <TextInput source="materials" label="Матеріали" fullWidth sx={{ flex: 1 }} />
        </Box>
        <Box sx={{ display: 'flex', gap: 2, width: '100%' }}>
          <TextInput source="budget" label="Бюджет" fullWidth sx={{ flex: 1 }} />
          <TextInput source="price_per_sqm" label="Ціна за м²" fullWidth sx={{ flex: 1 }} />
        </Box>
        <Box sx={{ display: 'flex', gap: 2, width: '100%' }}>
          <TextInput source="timeline" label="Терміни" fullWidth sx={{ flex: 1 }} />
        </Box>
        <TextInput source="wishes" label="Побажання" fullWidth multiline rows={3} />
      </SimpleForm>
    </Edit>
  );
};
