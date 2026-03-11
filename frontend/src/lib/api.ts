const BASE = '/api';

function getToken(): string | null {
  return localStorage.getItem('vp_token');
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(init?.headers as Record<string, string> || {}),
  };

  const res = await fetch(`${BASE}${path}`, { ...init, headers });

  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(body.error || body.detail || res.statusText);
  }

  return res.json();
}

// Auth
export const auth = {
  register: (email: string, name: string, password: string) =>
    request<{ token: string; user: User }>('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ email, name, password }),
    }),
  login: (email: string, password: string) =>
    request<{ token: string; user: User }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),
  me: () => request<User>('/auth/me'),
};

// Pitches
export const pitches = {
  list: () => request<Pitch[]>('/pitches'),
  get: (id: string) => request<Pitch>(`/pitches/${id}`),
  create: (data: CreatePitchData) =>
    request<Pitch>('/pitches', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: string, data: Partial<Pitch>) =>
    request<Pitch>(`/pitches/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  delete: (id: string) =>
    request<{ deleted: boolean }>(`/pitches/${id}`, { method: 'DELETE' }),
  chat: (id: string, message: string) =>
    request<ChatResponse>(`/pitches/${id}/chat`, {
      method: 'POST',
      body: JSON.stringify({ message }),
    }),
  /** Get public pitch (no auth) */
  getPublic: (id: string) =>
    fetch(`${BASE}/pitches/${id}/public`).then(async (res) => {
      if (!res.ok) throw new Error('Pitch not found');
      return res.json() as Promise<Pitch>;
    }),
};

export const system = {
  health: () => request<{ status: string; ai_engine: string; cloud_sandbox: boolean }>('/health'),
  lmStatus: () => request<{ status: string; engine: string; lm_studio: string; claude: string }>('/pitches/system/status'),
};

export const sandbox = {
  status: () => request<{ cloud_available: boolean; local_available: boolean }>('/sandbox/status'),
  createPreview: (pitchId: string) =>
    request<{ preview_url?: string; html?: string; mode?: string }>(`/sandbox/${pitchId}/preview`, { method: 'POST' }),
};

// Types
export interface User {
  id: string;
  email: string;
  name: string;
}

export interface Pitch {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  industry: string;
  status: string;
  client_name: string | null;
  client_company: string | null;
  accent_color: string;
  blocks: PitchBlock[];
  brand_config: Record<string, unknown>;
  facts: { key: string; value: string }[];
  created_at: string;
  updated_at: string;
}

export interface PitchBlock {
  id: string;
  type: string;
  props: Record<string, unknown>;
  visible: boolean;
}

export interface CreatePitchData {
  title?: string;
  industry?: string;
  client_name?: string;
  client_company?: string;
  accent_color?: string;
}

export interface ChatResponse {
  message: string;
  tool_results: { tool: string; result: string }[];
  pitch: Pitch;
}
