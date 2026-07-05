import type {
  AuthState,
  CompanionResponse,
  DoctorBriefResponse,
  HospitalDoctor,
  MemoryGraph,
  MemoryInventory,
  PatientSummary,
} from '../types';

const BASE = '/api';

function getToken(): string | null {
  const raw = localStorage.getItem('auth');
  if (!raw) return null;
  try {
    return (JSON.parse(raw) as AuthState).token;
  } catch {
    return null;
  }
}

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch(`${BASE}${path}`, { headers, ...options });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`${res.status}: ${body}`);
  }
  return res.json();
}

// ─── Auth ───

export async function register(
  name: string,
  email: string,
  password: string,
): Promise<AuthState> {
  return request<AuthState>('/auth/register', {
    method: 'POST',
    body: JSON.stringify({ name, email, password }),
  });
}

export async function getHospitalDoctors(): Promise<{ doctors: HospitalDoctor[] }> {
  return request('/auth/hospital-doctors');
}

export async function login(
  email: string,
  password: string,
): Promise<AuthState> {
  return request<AuthState>('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
}

export async function getMe(): Promise<{ user: AuthState['user'] }> {
  return request('/auth/me');
}

// ─── Doctor ───

export async function getPatients(): Promise<{ patients: PatientSummary[] }> {
  return request('/doctor/patients');
}

// ─── Patient Companion ───

export async function sendPatientMessage(
  message: string,
  patientId?: string,
  sessionId?: string,
): Promise<CompanionResponse> {
  return request<CompanionResponse>('/patient/message', {
    method: 'POST',
    body: JSON.stringify({
      message,
      patient_id: patientId,
      session_id: sessionId,
    }),
  });
}

// ─── Doctor Brief ───

export async function generateDoctorBrief(
  patientId: string,
): Promise<DoctorBriefResponse> {
  return request<DoctorBriefResponse>('/doctor/brief', {
    method: 'POST',
    body: JSON.stringify({ patient_id: patientId }),
  });
}

// ─── Memory ───

export async function improveMemory(
  patientId?: string,
): Promise<{ status: string; message: string }> {
  return request('/memory/improve', {
    method: 'POST',
    body: JSON.stringify({ patient_id: patientId }),
  });
}

export async function forgetMemory(
  patientId?: string,
  target = 'all',
  dataset?: string,
): Promise<{ status: string; message: string }> {
  return request('/memory/forget', {
    method: 'POST',
    body: JSON.stringify({ patient_id: patientId, target, dataset }),
  });
}

export async function getMemoryGraph(
  patientId?: string,
): Promise<MemoryGraph> {
  const q = patientId ? `?patient_id=${patientId}` : '';
  return request(`/memory/graph${q}`);
}

export async function getMemoryInventory(
  patientId?: string,
): Promise<MemoryInventory> {
  const q = patientId ? `?patient_id=${patientId}` : '';
  return request(`/memory/inventory${q}`);
}

export async function healthCheck(): Promise<{ status: string }> {
  return request('/health');
}
