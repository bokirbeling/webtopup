export const AUTH_USER_ROLES = ["admin", "seller", "pengguna"] as const;
export const RESELLER_STATUSES = ["none", "requested", "approved", "rejected"] as const;

export type AuthUserRole = (typeof AUTH_USER_ROLES)[number];
export type ResellerStatus = (typeof RESELLER_STATUSES)[number];

export type AuthUser = Readonly<{
  id: string;
  email: string;
  role: AuthUserRole;
  isResellerActive: boolean;
  resellerStatus: ResellerStatus;
  createdAt: Date;
  updatedAt: Date;
}>;

export type AuthUserRecord = AuthUser &
  Readonly<{
    passwordHash: string;
  }>;

export type RegisterUserInput = Readonly<{
  email: string;
  password: string;
}>;

export type LoginUserInput = Readonly<{
  email: string;
  password: string;
}>;

export type AuthSession = Readonly<{
  user: AuthUser;
  token: string;
  expiresIn: string;
}>;
