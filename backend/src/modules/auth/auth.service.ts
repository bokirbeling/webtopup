import { compare, hash } from "bcryptjs";
import { sign, verify, type JwtPayload, type SignOptions } from "jsonwebtoken";

import { type AuthRepository } from "./auth.repository";
import { type AuthSession, type AuthUser, type LoginUserInput, type RegisterUserInput } from "./auth.types";

type AuthServiceOptions = Readonly<{
  repository: AuthRepository;
  jwtSecret: string;
  jwtExpiresIn: string;
  passwordHashCost: number;
  clock?: () => Date;
}>;

export type AuthService = Readonly<{
  register(input: RegisterUserInput): Promise<AuthSession>;
  login(input: LoginUserInput): Promise<AuthSession>;
  getCurrentUser(token: string): Promise<AuthUser>;
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
    createdAt: user.createdAt,
    updatedAt: user.updatedAt
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

export function createAuthService(options: AuthServiceOptions): AuthService {
  const clock = options.clock ?? (() => new Date());

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

      return toPublicUser(user);
    }
  };
}
