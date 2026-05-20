import { randomBytes, createHash, timingSafeEqual } from "node:crypto";

import { compare, hash } from "bcryptjs";
import { sign, verify, type JwtPayload, type SignOptions } from "jsonwebtoken";

import { type AuthRepository } from "./auth.repository";
import { type AuthSession, type AuthUser, type AuthUserRecord, type EmailVerificationStatus, type LoginUserInput, type RegisterUserInput } from "./auth.types";

const EMAIL_VERIFICATION_TTL_MS = 30 * 60 * 1000;
const EMAIL_VERIFICATION_COOLDOWN_MS = 60 * 1000;
const EMAIL_VERIFICATION_MAX_RESENDS = 5;

export type EmailVerificationMessage = Readonly<{
  to: string;
  token: string;
  expiresAt: Date;
}>;

export type EmailVerificationSender = Readonly<{
  sendVerificationEmail(message: EmailVerificationMessage): Promise<void>;
}>;

type AuthServiceOptions = Readonly<{
  repository: AuthRepository;
  jwtSecret: string;
  jwtExpiresIn: string;
  passwordHashCost: number;
  clock?: () => Date;
  emailVerificationSender?: EmailVerificationSender;
}>;

export type EmailVerificationRequestResult = Readonly<{
  status: EmailVerificationStatus;
  emailSent: boolean;
}>;

export type AuthService = Readonly<{
  register(input: RegisterUserInput): Promise<AuthSession>;
  login(input: LoginUserInput): Promise<AuthSession>;
  getCurrentUser(token: string): Promise<AuthUser>;
  requestEmailVerification(token: string): Promise<EmailVerificationRequestResult>;
  verifyEmail(token: string, verificationToken: string): Promise<AuthUser>;
  updateProfile(token: string, input: { name?: string; phoneNumber?: string }): Promise<AuthUser>;
  changePin(token: string, oldPin: string | null, newPin: string): Promise<AuthUser>;
}>;

export class EmailAlreadyRegisteredError extends Error {
  constructor() {
    super("Email is already registered.");
    this.name = "EmailAlreadyRegisteredError";
  }
}

export class InvalidCredentialsError extends Error {
  constructor() {
    super("Invalid email or password.");
    this.name = "InvalidCredentialsError";
  }
}

export class InvalidAuthTokenError extends Error {
  constructor() {
    super("Invalid or expired authentication token.");
    this.name = "InvalidAuthTokenError";
  }
}

export class EmailVerificationCooldownError extends Error {
  constructor() {
    super("Please wait before requesting another verification email.");
    this.name = "EmailVerificationCooldownError";
  }
}

export class EmailVerificationRateLimitError extends Error {
  constructor() {
    super("Email verification resend limit reached. Try again after the current token expires.");
    this.name = "EmailVerificationRateLimitError";
  }
}

export class InvalidEmailVerificationTokenError extends Error {
  constructor() {
    super("Invalid or expired email verification token.");
    this.name = "InvalidEmailVerificationTokenError";
  }
}

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function toPublicUser(user: AuthUser): AuthUser {
  return {
    id: user.id,
    email: user.email,
    role: user.role,
    isResellerActive: user.isResellerActive,
    resellerStatus: user.resellerStatus,
    emailVerifiedAt: user.emailVerifiedAt,
    metadata: user.metadata,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt
  };
}

function toEmailVerificationStatus(user: AuthUserRecord): EmailVerificationStatus {
  return {
    emailVerified: user.emailVerifiedAt !== null,
    emailVerifiedAt: user.emailVerifiedAt,
    emailVerificationSentAt: user.emailVerificationSentAt,
    emailVerificationExpiresAt: user.emailVerificationExpiresAt,
    emailVerificationResendCount: user.emailVerificationResendCount
  };
}

function createToken(user: AuthUser, jwtSecret: string, jwtExpiresIn: string): string {
  const signOptions: SignOptions = {
    subject: user.id,
    expiresIn: jwtExpiresIn as SignOptions["expiresIn"]
  };

  return sign(
    {
      email: user.email,
      role: user.role
    },
    jwtSecret,
    signOptions
  );
}

function getSubject(payload: string | JwtPayload): string {
  if (typeof payload === "string" || typeof payload.sub !== "string" || payload.sub.trim() === "") {
    throw new InvalidAuthTokenError();
  }

  return payload.sub;
}

function hashVerificationToken(token: string): string {
  return createHash("sha256").update(token, "utf8").digest("hex");
}

function generateVerificationToken(): string {
  return randomBytes(32).toString("hex");
}

function hashesMatch(rawToken: string, expectedHash: string): boolean {
  const actualHash = Buffer.from(hashVerificationToken(rawToken), "hex");
  const expected = Buffer.from(expectedHash, "hex");

  return actualHash.length === expected.length && timingSafeEqual(actualHash, expected);
}

const noopVerificationSender: EmailVerificationSender = {
  async sendVerificationEmail(): Promise<void> {
    return;
  }
};

export function createAuthService(options: AuthServiceOptions): AuthService {
  const clock = options.clock ?? (() => new Date());
  const emailVerificationSender = options.emailVerificationSender ?? noopVerificationSender;

  async function getRecordFromToken(token: string): Promise<AuthUserRecord> {
    let payload: string | JwtPayload;

    try {
      payload = verify(token, options.jwtSecret) as string | JwtPayload;
    } catch {
      throw new InvalidAuthTokenError();
    }

    const user = await options.repository.findUserById(getSubject(payload));
    if (user === null) {
      throw new InvalidAuthTokenError();
    }

    return user;
  }

  return {
    async register(input: RegisterUserInput): Promise<AuthSession> {
      const email = normalizeEmail(input.email);
      const existingUser = await options.repository.findUserByEmail(email);

      if (existingUser !== null) {
        throw new EmailAlreadyRegisteredError();
      }

      const now = clock();
      const passwordHash = await hash(input.password, options.passwordHashCost);
      const user = await options.repository.createUser({
        email,
        passwordHash,
        role: "pengguna",
        createdAt: now,
        updatedAt: now
      });
      const publicUser = toPublicUser(user);

      return {
        user: publicUser,
        token: createToken(publicUser, options.jwtSecret, options.jwtExpiresIn),
        expiresIn: options.jwtExpiresIn
      };
    },

    async login(input: LoginUserInput): Promise<AuthSession> {
      const email = normalizeEmail(input.email);
      const user = await options.repository.findUserByEmail(email);

      if (user === null) {
        throw new InvalidCredentialsError();
      }

      const passwordMatches = await compare(input.password, user.passwordHash);
      if (!passwordMatches) {
        throw new InvalidCredentialsError();
      }

      const publicUser = toPublicUser(user);

      return {
        user: publicUser,
        token: createToken(publicUser, options.jwtSecret, options.jwtExpiresIn),
        expiresIn: options.jwtExpiresIn
      };
    },

    async getCurrentUser(token: string): Promise<AuthUser> {
      return toPublicUser(await getRecordFromToken(token));
    },

    async requestEmailVerification(token: string): Promise<EmailVerificationRequestResult> {
      const user = await getRecordFromToken(token);
      if (user.emailVerifiedAt !== null) {
        return {
          status: toEmailVerificationStatus(user),
          emailSent: false
        };
      }

      const now = clock();
      if (user.emailVerificationSentAt !== null && now.getTime() - user.emailVerificationSentAt.getTime() < EMAIL_VERIFICATION_COOLDOWN_MS) {
        throw new EmailVerificationCooldownError();
      }

      if (
        user.emailVerificationExpiresAt !== null &&
        user.emailVerificationExpiresAt.getTime() > now.getTime() &&
        user.emailVerificationResendCount >= EMAIL_VERIFICATION_MAX_RESENDS
      ) {
        throw new EmailVerificationRateLimitError();
      }

      const verificationToken = generateVerificationToken();
      const expiresAt = new Date(now.getTime() + EMAIL_VERIFICATION_TTL_MS);
      const nextResendCount = user.emailVerificationExpiresAt !== null && user.emailVerificationExpiresAt.getTime() > now.getTime()
        ? user.emailVerificationResendCount + 1
        : 1;
      const updatedUser = await options.repository.updateUser(user.id, {
        emailVerificationTokenHash: hashVerificationToken(verificationToken),
        emailVerificationExpiresAt: expiresAt,
        emailVerificationSentAt: now,
        emailVerificationResendCount: nextResendCount,
        updatedAt: now
      });

      await emailVerificationSender.sendVerificationEmail({
        to: updatedUser.email,
        token: verificationToken,
        expiresAt
      });

      return {
        status: toEmailVerificationStatus(updatedUser),
        emailSent: true
      };
    },

    async verifyEmail(token: string, verificationToken: string): Promise<AuthUser> {
      const user = await getRecordFromToken(token);
      const now = clock();

      if (
        user.emailVerificationTokenHash === null ||
        user.emailVerificationExpiresAt === null ||
        user.emailVerificationExpiresAt.getTime() <= now.getTime() ||
        !hashesMatch(verificationToken, user.emailVerificationTokenHash)
      ) {
        throw new InvalidEmailVerificationTokenError();
      }

      return toPublicUser(
        await options.repository.updateUser(user.id, {
          emailVerifiedAt: now,
          emailVerificationTokenHash: null,
          emailVerificationExpiresAt: null,
          emailVerificationSentAt: null,
          emailVerificationResendCount: 0,
          updatedAt: now
        })
      );
    },

    async updateProfile(token: string, input: { name?: string; phoneNumber?: string }): Promise<AuthUser> {
      const user = await getRecordFromToken(token);
      const now = clock();
      const currentMeta = user.metadata || {};

      const metadata = {
        ...currentMeta,
        name: input.name !== undefined ? input.name : currentMeta.name,
        no_hp: input.phoneNumber !== undefined ? input.phoneNumber : currentMeta.no_hp
      };

      const updated = await options.repository.updateUser(user.id, {
        metadata,
        updatedAt: now
      });

      return toPublicUser(updated);
    },

    async changePin(token: string, oldPin: string | null, newPin: string): Promise<AuthUser> {
      const user = await getRecordFromToken(token);
      const now = clock();
      const currentMeta = user.metadata || {};

      // If user already has a PIN, oldPin is required and must match
      if (currentMeta.pin_hash) {
        if (!oldPin) {
          throw new Error("PIN lama wajib diisi");
        }
        const matches = await compare(oldPin, currentMeta.pin_hash);
        if (!matches) {
          throw new Error("PIN lama salah");
        }
      }

      // Hash the new PIN using bcryptjs
      const pinHash = await hash(newPin, 10);

      const metadata = {
        ...currentMeta,
        pin_hash: pinHash
      };

      const updated = await options.repository.updateUser(user.id, {
        metadata,
        updatedAt: now
      });

      return toPublicUser(updated);
    }
  };
}
