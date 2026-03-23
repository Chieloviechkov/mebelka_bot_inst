import type { DataProvider } from 'react-admin';
import { fetchUtils } from 'react-admin';

const API = import.meta.env.VITE_API_URL || '/admin';

const httpClient = (url: string, options: fetchUtils.Options = {}) => {
  const token = localStorage.getItem('token');
  const headers = new Headers(options.headers);
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }
  return fetchUtils.fetchJson(url, { ...options, headers });
};

export const dataProvider: DataProvider = {
  // GET /admin/leads?page=1&limit=10&status=...&sort_field=...&sort_order=...&q=...
  getList: async (resource, params) => {
    const { page, perPage } = params.pagination || { page: 1, perPage: 10 };
    const { field, order } = params.sort || { field: 'id', order: 'DESC' };

    const query: Record<string, string> = {
      page: String(page),
      limit: String(perPage),
    };

    // Sort params
    if (field) query.sort_field = field;
    if (order) query.sort_order = order.toLowerCase();

    // Filters
    if (params.filter) {
      for (const [key, value] of Object.entries(params.filter)) {
        if (value !== undefined && value !== null && value !== '') {
          query[key] = String(value);
        }
      }
    }

    const qs = new URLSearchParams(query).toString();
    const url = `${API}/${resource}?${qs}`;
    const { json } = await httpClient(url);

    // Backend returns { total, page, limit, totalPages, data } for leads
    // or plain array for managers
    if (Array.isArray(json)) {
      return { data: json, total: json.length };
    }

    return {
      data: json.data || json,
      total: json.total || 0,
    };
  },

  getOne: async (resource, params) => {
    if (resource === 'leads') {
      // Fetch lead directly + messages
      const [leadRes, msgsRes] = await Promise.all([
        httpClient(`${API}/leads/${params.id}`),
        httpClient(`${API}/leads/${params.id}/messages?limit=200`).catch(() => ({ json: { data: [] } })),
      ]);

      const lead = leadRes.json;

      // Map managers from leadManagers relation
      lead.managers = (lead.leadManagers || []).map((lm: any) => lm.manager);
      lead.manager_ids = (lead.leadManagers || []).map((lm: any) => lm.manager_id);

      // Messages come desc from API, reverse for chronological order
      const messages = msgsRes.json.data || msgsRes.json || [];
      lead.messages = messages.reverse();

      return { data: lead };
    }

    if (resource === 'managers') {
      const { json } = await httpClient(`${API}/managers`);
      const manager = json.find((m: any) => m.id === Number(params.id));
      if (!manager) throw new Error('Manager not found');
      return { data: manager };
    }

    throw new Error(`getOne not implemented for ${resource}`);
  },

  getMany: async (resource, params) => {
    if (resource === 'managers') {
      const { json } = await httpClient(`${API}/managers`);
      const data = json.filter((m: any) => params.ids.includes(m.id));
      return { data };
    }
    return { data: [] };
  },

  getManyReference: async () => ({ data: [], total: 0 }),

  update: async (resource, params) => {
    if (resource === 'leads') {
      const prev = params.previousData;
      const curr = params.data;

      // Update status if changed
      if (curr.status !== prev.status) {
        await httpClient(`${API}/leads/${params.id}/status`, {
          method: 'PATCH',
          body: JSON.stringify({ status: curr.status }),
        });
      }

      // Handle manager assignment changes
      const prevManagerIds: number[] = prev.manager_ids || [];
      const newManagerIds: number[] = curr.manager_ids || [];

      const toAssign = newManagerIds.filter((id: number) => !prevManagerIds.includes(id));
      const toUnassign = prevManagerIds.filter((id: number) => !newManagerIds.includes(id));

      for (const mid of toAssign) {
        await httpClient(`${API}/leads/${params.id}/assign`, {
          method: 'POST',
          body: JSON.stringify({ manager_id: mid }),
        });
      }
      for (const mid of toUnassign) {
        await httpClient(`${API}/leads/${params.id}/assign/${mid}`, { method: 'DELETE' });
      }

      return { data: { ...curr, id: params.id } };
    }

    if (resource === 'managers') {
      const { json } = await httpClient(`${API}/managers/${params.id}/role`, {
        method: 'PATCH',
        body: JSON.stringify({ role: params.data.role }),
      });
      return { data: { ...params.data, ...json } };
    }

    throw new Error(`update not implemented for ${resource}`);
  },

  create: async () => { throw new Error('create not implemented'); },
  delete: async () => { throw new Error('delete not implemented'); },
  deleteMany: async () => { throw new Error('deleteMany not implemented'); },
  updateMany: async () => { throw new Error('updateMany not implemented'); },
};
