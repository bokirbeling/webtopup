import { type AuthRepository } from "../auth/auth.repository";
import { type AuthUser } from "../auth/auth.types";

export type AccountService = Readonly<{
  getOwnStatus(user: AuthUser): AuthUser;
  getUserStatus(requester: AuthUser, userId: string): Promise<AuthUser>;
  requestReseller(user: AuthUser): Promise<AuthUser>;
}>;

type AccountServiceOptions = Readonly<{
  repository: AuthRepository;
  clock?: () => Date;
}>;

export class AccountForbiddenError extends Error {
  constructor() {
    super("Insufficient permissions.");
    this.name = "AccountForbiddenError";
  }
}

export class AccountUserNotFoundError extends Error {
  constructor() {
    super("User was not found.");
    this.name = "AccountUserNotFoundError";
  }
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

export function createAccountService(options: AccountServiceOptions): AccountService {
  const clock = options.clock ?? (() => new Date());

  return {
    getOwnStatus(user: AuthUser): AuthUser {
      return toPublicUser(user);
    },

    async getUserStatus(requester: AuthUser, userId: string): Promise<AuthUser> {
      if (requester.role !== "admin" && requester.id !== userId) {
        throw new AccountForbiddenError();
      }

      const user = await options.repository.findUserById(userId);
      if (user === null) {
        throw new AccountUserNotFoundError();
      }

      return toPublicUser(user);
    },

    async requestReseller(user: AuthUser): Promise<AuthUser> {
      if (user.role === "admin") {
        throw new AccountForbiddenError();
      }

      if (user.role === "seller" || user.resellerStatus === "approved") {
        return toPublicUser(user);
      }

      return toPublicUser(
        await options.repository.updateUser(user.id, {
          resellerStatus: "requested",
          isResellerActive: false,
          updatedAt: clock()
        })
      );
    }
  };
}
