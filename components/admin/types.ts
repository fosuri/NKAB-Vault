import { ROLES } from "@/lib/db/auth-schema";

/**
 * Admin Dashboard Type Definitions.
 * Centralized types and constants used across administrative components for 
 * consistency in data handling (Users, Sanctions, Logs).
 */

// Human-readable mapping for role IDs
export const ROLE_NAMES: Record<number, string> = {
  [ROLES.USER]: "user",
  [ROLES.MODERATOR]: "moderator",
  [ROLES.ADMIN]: "admin",
};

// Represents a user record in the management list
export type UserRow = {
  id: string;
  name: string;
  email: string;
  roleId: number;
  createdAt: Date;
};

// Represents an active or historical sanction (Ban/Mute)
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

// Represents a single entry in the moderation action log
export type LogRow = {
  id: string;
  actionType: string;
  details: string | null;
  createdAt: Date;
  targetUserName: string | null;
};

// Defines the current viewer's administrative capacity
export type ActorRole = "admin" | "moderator";

