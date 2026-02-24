export interface RequestUser {
  userId: string;
  tenantId: string;
  email: string;
  role: 'admin' | 'member';
}

export interface JwtPayload {
  sub: string;
  tenantId: string;
  email: string;
  role: 'admin' | 'member';
}

export interface LoginDto {
  email: string;
  password: string;
}

export interface LoginResponse {
  accessToken: string;
  user: {
    id: string;
    email: string;
    role: 'admin' | 'member';
  };
}
