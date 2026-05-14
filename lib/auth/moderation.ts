import { and, desc, eq, gt, isNull, or } from "drizzle-orm";
import { db } from "@/lib/db/db";
import { user, userSanctions, ROLES, type RoleId, SANCTION_TYPES } from "@/lib/db/auth-schema";

/**
 * Core security engine for role-based access control and user discipline.
 */

export type SanctionType = "mute" | "ban";

export type ActiveSanction = {
  id: string;
  type: SanctionType;
  reason: string;
  expiresAt: Date | null;
  createdAt: Date;
};

export type UserModerationState = {
  userId: string;
  roleId: RoleId;
  activeMute: ActiveSanction | null;
  activeBan: ActiveSanction | null;
};

/**
 * Calculates the current moderation state of a user including active sanctions.
 */
export async function getUserModerationState(userId: string): Promise<UserModerationState | null> {
  // 1. Fetch user role and identity
  const dbUser = await db.query.user.findFirst({
    where: eq(user.id, userId),
    columns: {
      id: true,
      roleId: true,
    },
  });

  if (!dbUser) return null;

  const now = new Date();

  // 2. Fetch all active sanctions: must be unrevoked and either perpetual or not yet expired
  const sanctions = await db.query.userSanctions.findMany({
    where: and(
      eq(userSanctions.userId, userId),
      isNull(userSanctions.revokedAt),
      or(isNull(userSanctions.expiresAt), gt(userSanctions.expiresAt, now)),
    ),
    orderBy: [desc(userSanctions.createdAt)], // Prioritize the most recent sanction
    columns: {
      id: true,
      typeId: true,
      reason: true,
      expiresAt: true,
      createdAt: true,
    },
  });

  // 3. Map sanctions to their respective behavioral categories
  const activeMute = sanctions.find((item) => item.typeId === SANCTION_TYPES.MUTE) ?? null;
  const activeBan = sanctions.find((item) => item.typeId === SANCTION_TYPES.BAN) ?? null;

  return {
    userId: dbUser.id,
    roleId: dbUser.roleId as RoleId,
    activeMute: activeMute
      ? {
        id: activeMute.id,
        type: "mute",
        reason: activeMute.reason,
        expiresAt: activeMute.expiresAt,
        createdAt: activeMute.createdAt,
      }
      : null,
    activeBan: activeBan
      ? {
        id: activeBan.id,
        type: "ban",
        reason: activeBan.reason,
        expiresAt: activeBan.expiresAt,
        createdAt: activeBan.createdAt,
      }
      : null,
  };
}

/**
 * Ensures the actor has Admin-level authority.
 */
export async function requireAdmin(userId: string): Promise<UserModerationState> {
  const state = await getUserModerationState(userId);

  if (!state || state.roleId !== ROLES.ADMIN) {
    throw new Error("Admin access required");
  }

  // Security: even an admin can be banned by another admin
  if (state.activeBan) {
    throw new Error("Banned users cannot access admin tools");
  }

  return state;
}

/**
 * Ensures the actor has Staff-level authority (Moderator or Admin).
 */
export async function requireStaff(userId: string): Promise<UserModerationState> {
  const state = await getUserModerationState(userId);

  if (!state || (state.roleId !== ROLES.ADMIN && state.roleId !== ROLES.MODERATOR)) {
    throw new Error("Moderator access required");
  }

  if (state.activeBan) {
    throw new Error("Banned users cannot access moderation tools");
  }

  return state;
}

/**
 * Validates if a user is eligible to submit new content.
 */
export async function ensureCanCreatePost(userId: string) {
  const state = await getUserModerationState(userId);

  if (!state) return { allowed: false, error: "User not found" } as const;

  // Bans prevent all write activity
  if (state.activeBan) return { allowed: false, error: "Your account is banned" } as const;

  // Mutes specifically prevent publishing new content
  if (state.activeMute) return { allowed: false, error: "Your account is muted. You cannot create posts." } as const;

  return { allowed: true } as const;
}

/**
 * Validates if a user is eligible to participate in discussions.
 */
export async function ensureCanCreateComment(userId: string) {
  const state = await getUserModerationState(userId);

  if (!state) return { allowed: false, error: "User not found" } as const;

  if (state.activeBan) return { allowed: false, error: "Your account is banned" } as const;

  if (state.activeMute) return { allowed: false, error: "Your account is muted. You cannot create comments." } as const;

  return { allowed: true } as const;
}
