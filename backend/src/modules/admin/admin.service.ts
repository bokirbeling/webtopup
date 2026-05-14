import { type AuthRepository } from "../auth/auth.repository";
import { type AuthUser } from "../auth/auth.types";

export type AdminService = Readonly<{
  listUsers(): Promise<AuthUser[]>;
  getUser(userId: string): Promise<AuthUser>;
  approveReseller(userId: string): Promise<AuthUser>;
  demoteSeller(userId: string): Promise<AuthUser>;
  suspendSeller(userId: string): Promise<AuthUser>;
}>;

type AdminServiceOptions = Readonly<{
  repository: AuthRepository;
  clock?: () => Date;
}>;

export class AdminUserNotFoundError extends Error {
  constructor() {
    super("User was not found.");
    this.name = "AdminUserNotFoundError";
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

export function createAdminService(options: AdminServiceOptions): AdminService {
  const clock = options.clock ?? (() => new Date());

  async function getExistingUser(userId: string): Promise<AuthUser> {
    const user = await options.repository.findUserById(userId);
    if (user === null) {
      throw new AdminUserNotFoundError();
    }

    return user;
  }

  return {
    async listUsers(): Promise<AuthUser[]> {
      return (await options.repository.listUsers()).map(toPublicUser);
    },

    async getUser(userId: string): Promise<AuthUser> {
      return toPublicUser(await getExistingUser(userId));
    },

    async approveReseller(userId: string): Promise<AuthUser> {
      await getExistingUser(userId);
      return toPublicUser(
        await options.repository.updateUser(userId, {
          role: "seller",
          resellerStatus: "approved",
          isResellerActive: true,
          updatedAt: clock()
        })
      );
    },

    async demoteSeller(userId: string): Promise<AuthUser> {
      await getExistingUser(userId);
      return toPublicUser(
        await options.repository.updateUser(userId, {
          role: "pengguna",
          resellerStatus: "none",
          isResellerActive: false,
          updatedAt: clock()
        })
      );
    },

    async suspendSeller(userId: string): Promise<AuthUser> {
      await getExistingUser(userId);
      return toPublicUser(
        await options.repository.updateUser(userId, {
          isResellerActive: false,
          updatedAt: clock()
        })
      );
    }
  };
}
