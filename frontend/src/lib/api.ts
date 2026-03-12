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
  /** Get shared pitch by token (no auth) */
  getShared: (token: string) =>
    fetch(`${BASE}/pitches/s/${token}`).then(async (res) => {
      if (!res.ok) {
        if (res.status === 410) throw new Error('Share link expired');
        throw new Error('Pitch not found');
      }
      return res.json() as Promise<Pitch & { allow_download: boolean }>;
    }),

  // Versions
  listVersions: (id: string) =>
    request<PitchVersion[]>(`/pitches/${id}/versions`),
  getVersion: (id: string, versionId: string) =>
    request<PitchVersion & { html_content: string }>(`/pitches/${id}/versions/${versionId}`),
  restoreVersion: (id: string, versionId: string) =>
    request<Pitch>(`/pitches/${id}/versions/${versionId}/restore`, { method: 'POST' }),

  // Share
  createShare: (id: string, data: { password?: string; expires_hours?: number; allow_download?: boolean }) =>
    request<{ share: PitchShare; url: string }>(`/pitches/${id}/share`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  listShares: (id: string) =>
    request<PitchShare[]>(`/pitches/${id}/shares`),
  deleteShare: (id: string, shareId: string) =>
    request<{ deleted: boolean }>(`/pitches/${id}/shares/${shareId}`, { method: 'DELETE' }),

  // Analytics
  getAnalytics: (id: string) =>
    request<PitchAnalytics>(`/pitches/${id}/analytics`),
  recordView: (id: string, data: { share_token?: string; duration_seconds?: number; scroll_depth?: number }) =>
    fetch(`${BASE}/pitches/${id}/views`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    }),

  // Image
  generateImage: (id: string, prompt: string, style: string = 'abstract') =>
    request<{ url: string }>(`/pitches/${id}/generate-image`, {
      method: 'POST',
      body: JSON.stringify({ prompt, style }),
    }),
};

export const system = {
  health: () => request<{ status: string; ai_engine: string }>('/health'),
  lmStatus: () => request<{ status: string; engine: string; lm_studio: string; claude: string }>('/pitches/system/status'),
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
  html_content: string | null;
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

export interface PitchVersion {
  id: string;
  pitch_id: string;
  version_number: number;
  message: string | null;
  created_at: string;
}

export interface PitchShare {
  id: string;
  pitch_id: string;
  token: string;
  password: string | null;
  expires_at: string | null;
  allow_download: boolean;
  created_at: string;
}

export interface PitchAnalytics {
  total_views: number;
  unique_viewers: number;
  avg_duration_seconds: number;
  avg_scroll_depth: number;
  recent_views: Array<{
    id: string;
    viewer_ip: string;
    viewer_ua: string;
    duration_seconds: number;
    scroll_depth: number;
    created_at: string;
  }>;
}
