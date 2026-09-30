export enum AuthorityRole {
  ADMIN = 'ADMIN',
  OPERATOR = 'OPERATOR',
  VIEWER = 'VIEWER'
}

export interface AuthorityUser {
  id: string;
  email: string;
  name: string;
  role: AuthorityRole;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface AuthTokens {
  accessToken: string;
  tokenType: 'Bearer';
  expiresIn: string;
}

export interface LoginResponse {
  user: AuthorityUser;
  tokens: AuthTokens;
}

export interface DeviceRegistrationRequest {
  deviceId: string;
  deviceModel?: string;
  osVersion?: string;
  appVersion?: string;
  publicKey?: string;
  metadata?: Record<string, unknown>;
}

export interface DeviceResponse {
  id: string;
  deviceId: string;
  registeredAt: string;
  lastActiveAt: string;
  status: 'ACTIVE' | 'REVOKED';
}
