export interface User {
  id: string;
  name: string;
  email: string;
  role: 'patient' | 'doctor';
  specialization?: string;
}

export interface AuthState {
  token: string;
  user: User;
}

export interface PatientSummary {
  id: string;
  name: string;
  email: string;
  created_at: string;
}

export interface HospitalDoctor {
  name: string;
  email: string;
  specialization: string;
}

export interface MemoryEvidence {
  content: string;
  relevance?: number;
  source?: string;
}

export interface CompanionResponse {
  response: string;
  memories_used: MemoryEvidence[];
  entities_extracted: EntityInfo[];
  memory_status: string;
}

export interface EntityInfo {
  type: string;
  name: string;
}

export interface Citation {
  claim: string;
  source_memory: string;
  confidence?: number;
}

export interface DoctorBriefResponse {
  brief: string;
  citations: Citation[];
  generated_at: string;
  memory_count: number;
}

export interface MemoryNode {
  id: string;
  label: string;
  type: string;
  properties: Record<string, unknown>;
}

export interface MemoryEdge {
  source: string;
  target: string;
  relationship: string;
}

export interface MemoryGraph {
  nodes: MemoryNode[];
  edges: MemoryEdge[];
}

export interface MemoryInventoryItem {
  type: string;
  count: number;
  sample_names: string[];
  relationships: string[];
}

export interface MemoryInventory {
  inventory: MemoryInventoryItem[];
  total_entities: number;
}

export interface ChatMessage {
  id: string;
  role: 'patient' | 'companion';
  content: string;
  timestamp: Date;
  memories?: MemoryEvidence[];
  entities?: EntityInfo[];
}

export type ViewMode = 'companion' | 'doctor' | 'memory' | 'patients';
