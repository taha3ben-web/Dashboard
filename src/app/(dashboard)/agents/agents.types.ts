export type AgentStatus = "ACTIVE" | "SUSPENDED" | "INVITED";

export interface RoleOption {
  id: string;
  name: string;
}

export interface CityOption {
  id: string;
  name: string;
}

export interface AgentRow {
  id: string;
  agentCode: string;
  status: AgentStatus;
  notes?: string | null;
  lastLoginAt?: string | null;
  createdAt: string;
  updatedAt?: string;
  city?: { id: string; name: string; country?: string } | null;
  createdBy?: { id: string; name: string; type: string } | null;
  user: {
    id: string;
    name: string;
    phone: string;
    status: string;
    staffRole?: { id: string; name: string } | null;
  };
}

export interface AuditRow {
  id: string;
  action: string;
  ip?: string | null;
  createdAt: string;
  actor?: { id: string; name: string; type: string } | null;
}

export interface AgentEditorState {
  open: boolean;
  agent: AgentRow | null;
  name: string;
  phone: string;
  agentCode: string;
  cityId: string;
  notes: string;
}

export interface PasswordState {
  open: boolean;
  agent: AgentRow | null;
  password: string;
  confirmPassword: string;
}

export interface StatusState {
  open: boolean;
  agent: AgentRow | null;
  nextStatus: AgentStatus;
  notes: string;
}
