import { ROLES } from "@/lib/db/auth-schema";

export const ROLE_NAMES: Record<number, string> = {
  [ROLES.USER]: "user",
  [ROLES.MODERATOR]: "moderator",
  [ROLES.ADMIN]: "admin",
};

export type UserRow = {
  id: string;
  name: string;
  email: string;
  roleId: number;
  createdAt: Date;
};

export type SanctionRow = {
  id: string;
  type: string;
  reason: string;
  createdAt: Date;
  expiresAt: Date | null;
  targetUserName: string;
  createdByName: string;
  revokedAt: Date | null;
};

export type LogRow = {
  id: string;
  actionType: string;
  details: string | null;
  createdAt: Date;
  targetUserName: string | null;
};

export type ActorRole = "admin" | "moderator";
