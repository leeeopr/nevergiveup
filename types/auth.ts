export type UserRole = 'admin' | 'editor' | 'viewer';

export type Permission = 
  | 'movements:read' 
  | 'movements:create' 
  | 'movements:update' 
  | 'movements:delete'
  | 'profile:read'
  | 'profile:update'
  | 'admin:dashboard';

export interface UserProfile {
  id: string;
  email: string | null;
  full_name: string | null;
  avatar_url: string | null;
  role: UserRole;
  updated_at: string;
}

export type AuthFsmState =
  | 'idle'
  | 'validating'
  | 'connecting'
  | 'authenticating'
  | 'authenticated'
  | 'network-error'
  | 'invalid-credentials'
  | 'db-unavailable'
  | 'timeout'
  | 'hydrating'
  | 'session-restoring';

export type TypedAuthError =
  | 'INVALID_CREDENTIALS'
  | 'NETWORK_FAILURE'
  | 'DB_UNAVAILABLE'
  | 'ENV_MISSING'
  | 'SESSION_EXPIRED'
  | 'RLS_DENIED'
  | 'UNKNOWN_ERROR';

export interface AuthState {
  user: any | null;
  session: any | null;
  profile: UserProfile | null;
  permissions: Permission[];
  loading: boolean;
  isIdentityResolved: boolean;
  error: Error | null;
  
  // High-reliability FSM & Connection States
  fsmState: AuthFsmState;
  isDbConnected: boolean;
  isDbUnavailable: boolean;
  isAuthLoading: boolean;
  isHydrating: boolean;
  isOffline: boolean;
  authErrorType: TypedAuthError | null;
  authErrorMessage: string | null;
  networkError: string | null;
}
