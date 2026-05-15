import { randomUUID } from "node:crypto";

import { type AuthUserRecord, type AuthUserRole, type ResellerStatus } from "./auth.types";

export type UpdateAuthUserInput = Readonly<{
  role?: AuthUserRole;
  isResellerActive?: boolean;
  resellerStatus?: ResellerStatus;
  emailVerifiedAt?: Date | null;
  emailVerificationTokenHash?: string | null;
  emailVerificationExpiresAt?: Date | null;
  emailVerificationSentAt?: Date | null;
  emailVerificationResendCount?: number;
  updatedAt: Date;
}>;

export interface AuthRepository {
  createUser(input: {
    email: string;
    passwordHash: string;
    role: AuthUserRole;
    createdAt: Date;
    updatedAt: Date;
  }): Promise<AuthUserRecord>;
  findUserByEmail(email: string): Promise<AuthUserRecord | null>;
  findUserById(userId: string): Promise<AuthUserRecord | null>;
  listUsers(): Promise<AuthUserRecord[]>;
  updateUser(userId: string, input: UpdateAuthUserInput): Promise<AuthUserRecord>;
}

type SupabaseAuthRepositoryOptions = Readonly<{
  supabaseUrl: string;
  supabaseServiceRoleKey: string;
  tablePrefix?: string;
}>;

function asAuthUserRole(value: unknown): AuthUserRole {
  if (value === "admin" || value === "seller" || value === "pengguna") {
    return value;
  }

  throw new Error("Unexpected auth user role from persistence layer.");
}

function asResellerStatus(value: unknown): ResellerStatus {
  if (value === "none" || value === "requested" || value === "approved" || value === "rejected") {
    return value;
  }

  throw new Error("Unexpected reseller status from persistence layer.");
}

function parseNullableDate(value: unknown, fieldName: string): Date | null {
  if (value === null) {
    return null;
  }

  if (typeof value !== "string") {
    throw new Error("Invalid " + fieldName + " from persistence layer.");
  }

  return new Date(value);
}

function parseUserRow(value: unknown): AuthUserRecord {
  if (typeof value !== "object" || value === null) {
    throw new Error("Invalid auth user payload from persistence layer.");
  }

  const row = value as Record<string, unknown>;

  if (
    typeof row.id !== "string" ||
    typeof row.email !== "string" ||
    typeof row.password_hash !== "string" ||
    typeof row.is_reseller_active !== "boolean" ||
    typeof row.email_verification_resend_count !== "number" ||
    typeof row.created_at !== "string" ||
    typeof row.updated_at !== "string"
  ) {
    throw new Error("Missing required auth user fields from persistence layer.");
  }

  if (row.email_verification_token_hash !== null && typeof row.email_verification_token_hash !== "string") {
    throw new Error("Invalid email verification token hash from persistence layer.");
  }

  return {
    id: row.id,
    email: row.email,
    passwordHash: row.password_hash,
    role: asAuthUserRole(row.role),
    isResellerActive: row.is_reseller_active,
    resellerStatus: asResellerStatus(row.reseller_status),
    emailVerifiedAt: parseNullableDate(row.email_verified_at, "email verified timestamp"),
    emailVerificationTokenHash: row.email_verification_token_hash,
    emailVerificationExpiresAt: parseNullableDate(row.email_verification_expires_at, "email verification expiry"),
    emailVerificationSentAt: parseNullableDate(row.email_verification_sent_at, "email verification sent timestamp"),
    emailVerificationResendCount: row.email_verification_resend_count,
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at)
  };
}

async function readJson(response: Response): Promise<unknown> {
  const bodyText = await response.text();

  if (bodyText.trim() === "") {
    return null;
  }

  try {
    return JSON.parse(bodyText) as unknown;
  } catch {
    throw new Error("Persistence layer returned malformed JSON.");
  }
}

function extractErrorMessage(payload: unknown): string {
  if (typeof payload === "object" && payload !== null && "message" in payload && typeof (payload as { message: unknown }).message === "string") {
    return (payload as { message: string }).message;
  }

  return "Persistence layer request failed.";
}

export class SupabaseAuthRepository implements AuthRepository {
  private readonly baseUrl: string;

  constructor(private readonly options: SupabaseAuthRepositoryOptions) {
    this.baseUrl = options.supabaseUrl.replace(/\/$/, "");
  }

  private tableName() {
    return (this.options.tablePrefix ?? "") + "users";
  }

  private selectColumns() {
    return "id,email,password_hash,role,is_reseller_active,reseller_status,email_verified_at,email_verification_token_hash,email_verification_expires_at,email_verification_sent_at,email_verification_resend_count,created_at,updated_at";
  }

  private async request(path: string, init: RequestInit = {}): Promise<Response> {
    const headers: Record<string, string> = {
      apikey: this.options.supabaseServiceRoleKey,
      Authorization: "Bearer " + this.options.supabaseServiceRoleKey,
      "Content-Type": "application/json"
    };

    if (init.headers) {
      Object.assign(headers, init.headers as Record<string, string>);
    }

    return fetch(this.baseUrl + path, {
      ...init,
      headers
    });
  }

  async createUser(input: {
    email: string;
    passwordHash: string;
    role: AuthUserRole;
    createdAt: Date;
    updatedAt: Date;
  }): Promise<AuthUserRecord> {
    const response = await this.request(
      "/rest/v1/" + this.tableName() + "?select=" + this.selectColumns(),
      {
        method: "POST",
        headers: {
          Prefer: "return=representation"
        },
        body: JSON.stringify({
          email: input.email,
          password_hash: input.passwordHash,
          role: input.role,
          is_reseller_active: false,
          reseller_status: "none",
          email_verified_at: null,
          email_verification_token_hash: null,
          email_verification_expires_at: null,
          email_verification_sent_at: null,
          email_verification_resend_count: 0,
          metadata: {},
          created_at: input.createdAt.toISOString(),
          updated_at: input.updatedAt.toISOString()
        })
      }
    );

    const payload = await readJson(response);
    if (!response.ok) {
      throw new Error(extractErrorMessage(payload));
    }

    if (!Array.isArray(payload) || payload.length !== 1) {
      throw new Error("Failed to persist auth user record.");
    }

    return parseUserRow(payload[0]);
  }

  async findUserByEmail(email: string): Promise<AuthUserRecord | null> {
    const response = await this.request(
      "/rest/v1/" + this.tableName() + "?email=eq." + encodeURIComponent(email) + "&select=" + this.selectColumns() + "&limit=1",
      {
        method: "GET"
      }
    );

    const payload = await readJson(response);
    if (!response.ok) {
      throw new Error(extractErrorMessage(payload));
    }

    if (!Array.isArray(payload) || payload.length === 0) {
      return null;
    }

    return parseUserRow(payload[0]);
  }

  async findUserById(userId: string): Promise<AuthUserRecord | null> {
    const response = await this.request(
      "/rest/v1/" + this.tableName() + "?id=eq." + encodeURIComponent(userId) + "&select=" + this.selectColumns() + "&limit=1",
      {
        method: "GET"
      }
    );

    const payload = await readJson(response);
    if (!response.ok) {
      throw new Error(extractErrorMessage(payload));
    }

    if (!Array.isArray(payload) || payload.length === 0) {
      return null;
    }

    return parseUserRow(payload[0]);
  }

  async listUsers(): Promise<AuthUserRecord[]> {
    const response = await this.request(
      "/rest/v1/" + this.tableName() + "?select=" + this.selectColumns() + "&order=created_at.asc",
      {
        method: "GET"
      }
    );

    const payload = await readJson(response);
    if (!response.ok) {
      throw new Error(extractErrorMessage(payload));
    }

    if (!Array.isArray(payload)) {
      throw new Error("Failed to list auth user records.");
    }

    return payload.map(parseUserRow);
  }

  async updateUser(userId: string, input: UpdateAuthUserInput): Promise<AuthUserRecord> {
    const body: Record<string, unknown> = {
      updated_at: input.updatedAt.toISOString()
    };

    if (input.role !== undefined) {
      body.role = input.role;
    }

    if (input.isResellerActive !== undefined) {
      body.is_reseller_active = input.isResellerActive;
    }

    if (input.resellerStatus !== undefined) {
      body.reseller_status = input.resellerStatus;
    }

    if (input.emailVerifiedAt !== undefined) {
      body.email_verified_at = input.emailVerifiedAt?.toISOString() ?? null;
    }

    if (input.emailVerificationTokenHash !== undefined) {
      body.email_verification_token_hash = input.emailVerificationTokenHash;
    }

    if (input.emailVerificationExpiresAt !== undefined) {
      body.email_verification_expires_at = input.emailVerificationExpiresAt?.toISOString() ?? null;
    }

    if (input.emailVerificationSentAt !== undefined) {
      body.email_verification_sent_at = input.emailVerificationSentAt?.toISOString() ?? null;
    }

    if (input.emailVerificationResendCount !== undefined) {
      body.email_verification_resend_count = input.emailVerificationResendCount;
    }

    const response = await this.request(
      "/rest/v1/" + this.tableName() + "?id=eq." + encodeURIComponent(userId) + "&select=" + this.selectColumns(),
      {
        method: "PATCH",
        headers: {
          Prefer: "return=representation"
        },
        body: JSON.stringify(body)
      }
    );

    const payload = await readJson(response);
    if (!response.ok) {
      throw new Error(extractErrorMessage(payload));
    }

    if (!Array.isArray(payload) || payload.length !== 1) {
      throw new Error("Auth user record was not found.");
    }

    return parseUserRow(payload[0]);
  }
}

export class InMemoryAuthRepository implements AuthRepository {
  private readonly usersById = new Map<string, AuthUserRecord>();
  private readonly userIdByEmail = new Map<string, string>();

  async createUser(input: {
    email: string;
    passwordHash: string;
    role: AuthUserRole;
    createdAt: Date;
    updatedAt: Date;
  }): Promise<AuthUserRecord> {
    if (this.userIdByEmail.has(input.email)) {
      throw new Error("User with email " + input.email + " already exists.");
    }

    const user: AuthUserRecord = {
      id: randomUUID(),
      email: input.email,
      passwordHash: input.passwordHash,
      role: input.role,
      isResellerActive: false,
      resellerStatus: "none",
      emailVerifiedAt: null,
      emailVerificationTokenHash: null,
      emailVerificationExpiresAt: null,
      emailVerificationSentAt: null,
      emailVerificationResendCount: 0,
      createdAt: input.createdAt,
      updatedAt: input.updatedAt
    };

    this.usersById.set(user.id, user);
    this.userIdByEmail.set(user.email, user.id);

    return user;
  }

  async findUserByEmail(email: string): Promise<AuthUserRecord | null> {
    const userId = this.userIdByEmail.get(email);
    return userId === undefined ? null : this.usersById.get(userId) ?? null;
  }

  async findUserById(userId: string): Promise<AuthUserRecord | null> {
    return this.usersById.get(userId) ?? null;
  }

  async listUsers(): Promise<AuthUserRecord[]> {
    return Array.from(this.usersById.values()).sort((left, right) => left.createdAt.getTime() - right.createdAt.getTime());
  }

  async updateUser(userId: string, input: UpdateAuthUserInput): Promise<AuthUserRecord> {
    const existingUser = this.usersById.get(userId);
    if (existingUser === undefined) {
      throw new Error("Auth user record was not found.");
    }

    const updatedUser: AuthUserRecord = {
      ...existingUser,
      role: input.role ?? existingUser.role,
      isResellerActive: input.isResellerActive ?? existingUser.isResellerActive,
      resellerStatus: input.resellerStatus ?? existingUser.resellerStatus,
      emailVerifiedAt: input.emailVerifiedAt === undefined ? existingUser.emailVerifiedAt : input.emailVerifiedAt,
      emailVerificationTokenHash: input.emailVerificationTokenHash === undefined ? existingUser.emailVerificationTokenHash : input.emailVerificationTokenHash,
      emailVerificationExpiresAt: input.emailVerificationExpiresAt === undefined ? existingUser.emailVerificationExpiresAt : input.emailVerificationExpiresAt,
      emailVerificationSentAt: input.emailVerificationSentAt === undefined ? existingUser.emailVerificationSentAt : input.emailVerificationSentAt,
      emailVerificationResendCount: input.emailVerificationResendCount ?? existingUser.emailVerificationResendCount,
      updatedAt: input.updatedAt
    };

    this.usersById.set(userId, updatedUser);
    return updatedUser;
  }
}
