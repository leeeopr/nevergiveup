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

export interface AuthState {
  user: any | null;
  session: any | null;
  profile: UserProfile | null;
  permissions: Permission[];
  loading: boolean;
  isIdentityResolved: boolean;
  error: Error | null;
}
