/**
 * Comprehensive Database Architecture for NKAB Vault.
 * Implements 3rd Normal Form (3NF) through lookup tables and relational constraints.
 */

import { relations } from "drizzle-orm";
import { pgTable, text, timestamp, boolean, index, integer, unique, serial, uuid } from "drizzle-orm/pg-core";

// ============================================================================
// LOOKUP TABLES & CONSTANTS
// Standardized numeric identifiers for roles, types, and statuses.
// ============================================================================

export const ROLES = {
  USER: 1,
  MODERATOR: 2,
  ADMIN: 3,
} as const;

export type RoleId = typeof ROLES[keyof typeof ROLES];
export type RoleName = Lowercase<keyof typeof ROLES>;

export const ACCESS_TYPES = {
  PUBLIC: 1,
  PRIVATE: 2,
  PAID: 3,
} as const;

export const SUBSCRIPTION_STATUSES = {
  ACTIVE: 1,
  CANCELED: 2,
  PAST_DUE: 3,
  UNPAID: 4,
  TRIALING: 5,
  INCOMPLETE: 6,
  INCOMPLETE_EXPIRED: 7,
  PAUSED: 8,
} as const;

export const RESOURCE_TYPES = {
  IMAGE: 1,
  VIDEO: 2,
  AUDIO: 3,
  DOCUMENT: 4,
} as const;

export const MEDIA_FORMATS = {
  JPEG: 1,
  PNG: 2,
  WEBP: 3,
  GIF: 4,
  MP4: 5,
  WEBM: 6,
} as const;

export const REACTION_TYPES = {
  LIKE: 1,
  DISLIKE: 2,
} as const;

export const SANCTION_TYPES = {
  MUTE: 1,
  BAN: 2,
  WARNING: 3,
} as const;

export const ADMIN_ACTION_TYPES = {
  DELETE_POST: 1,
  DELETE_COMMENT: 2,
  MUTE_USER: 3,
  BAN_USER: 4,
  REVOKE_SANCTION: 5,
  REMOVE_MODERATOR: 6,
  ADD_MODERATOR: 7,
  RECOVER_POST: 8,
  RECOVER_COMMENT: 9,
} as const;

export const NOTIFICATION_TYPES = {
  LIKE: 1,
  COMMENT: 2,
  NEW_POST: 3,
  MENTION: 4,
  SYSTEM: 5,
  WARNING: 6,
  DELETE_POST: 7,
  DELETE_COMMENT: 8,
  DISLIKE: 9,
  MUTE: 10,
  BAN: 11,
} as const;

export const MESSAGE_MEDIA_TYPES = {
  IMAGE: 1,
  VIDEO: 2,
  FILE: 3,
} as const;

export const roles = pgTable("roles", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().unique(),
});

export const accessTypes = pgTable("access_types", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().unique(),
});

export const subscriptionStatuses = pgTable("subscription_statuses", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().unique(),
});

export const resourceTypes = pgTable("resource_types", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().unique(),
});

export const mediaFormats = pgTable("media_formats", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().unique(),
});

export const reactionTypes = pgTable("reaction_types", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().unique(),
});

export const sanctionTypes = pgTable("sanction_types", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().unique(),
});

export const adminActionTypes = pgTable("admin_action_types", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().unique(),
});

export const notificationTypes = pgTable("notification_types", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().unique(),
});

export const messageMediaTypes = pgTable("message_media_types", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().unique(),
});

// ============================================================================
// CORE IDENTITY & AUTHENTICATION
// Better Auth compatible tables for user management and session tracking.
// ============================================================================

export const user = pgTable("user", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull().unique(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("email_verified").default(false).notNull(),
  image: text("image"),
  roleId: integer("role_id")
    .references(() => roles.id)
    .default(ROLES.USER)
    .notNull(),
  setupCompleted: boolean("setup_completed").default(false).notNull(),
  profileDescription: text("profile_description"),
  customerId: text("customer_id").unique(),
  failedLoginAttempts: integer("failed_login_attempts").default(0).notNull(),
  lockedUntil: timestamp("locked_until"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at")
    .defaultNow()
    .$onUpdate(() => new Date())
    .notNull(),
});

export const session = pgTable(
  "session",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    expiresAt: timestamp("expires_at").notNull(),
    token: text("token").notNull().unique(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),
    userId: uuid("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
  },
  (table) => [index("session_userId_idx").on(table.userId)],
);

export const account = pgTable(
  "account",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    accountId: text("account_id").notNull(),
    providerId: text("provider_id").notNull(),
    userId: uuid("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    accessToken: text("access_token"),
    refreshToken: text("refresh_token"),
    idToken: text("id_token"),
    accessTokenExpiresAt: timestamp("access_token_expires_at"),
    refreshTokenExpiresAt: timestamp("refresh_token_expires_at"),
    scope: text("scope"),
    password: text("password"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [index("account_userId_idx").on(table.userId)],
);

export const verification = pgTable(
  "verification",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    identifier: text("identifier").notNull(),
    value: text("value").notNull(),
    expiresAt: timestamp("expires_at").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [index("verification_identifier_idx").on(table.identifier)],
);

// ============================================================================
// CONTENT MANAGEMENT (Posts & Media)
// Hierarchical storage for posts and their associated cloud assets.
// ============================================================================

export const posts = pgTable(
  "posts",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    title: text("title").default("").notNull(),
    description: text("description").notNull(),
    accessTypeId: integer("access_type_id")
      .default(ACCESS_TYPES.PUBLIC)
      .references(() => accessTypes.id, { onDelete: "restrict", onUpdate: "cascade" })
      .notNull(),
    password: text("password"),
    deletedByStaffAt: timestamp("deleted_by_staff_at"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    index("posts_userId_idx").on(table.userId),
    index("posts_accessTypeId_idx").on(table.accessTypeId),
  ]
);

export const postMedia = pgTable(
  "post_media",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    postId: uuid("post_id")
      .notNull()
      .references(() => posts.id, { onDelete: "cascade" }),
    publicId: text("public_id").notNull().unique(),
    resourceTypeId: integer("resource_type_id")
      .references(() => resourceTypes.id)
      .notNull(),
    formatId: integer("format_id")
      .references(() => mediaFormats.id)
      .notNull(),
    secureUrl: text("secure_url").notNull(),
    width: integer("width"),
    height: integer("height"),
    bytes: integer("bytes"),
    originalFilename: text("original_filename"),
    sortOrder: integer("sort_order").default(0).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    index("post_media_postId_idx").on(table.postId),
    index("post_media_resourceTypeId_idx").on(table.resourceTypeId),
  ]
);

// ============================================================================
// SOCIAL INTERACTIONS (Comments & Reactions)
// Engagement metrics and discussion threads.
// ============================================================================

export const comments = pgTable(
  "comments",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    postId: uuid("post_id")
      .notNull()
      .references(() => posts.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    body: text("body").notNull(),
    deletedByStaffAt: timestamp("deleted_by_staff_at"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    index("comments_postId_idx").on(table.postId),
    index("comments_userId_idx").on(table.userId),
  ]
);

export const postReactions = pgTable(
  "post_reactions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    postId: uuid("post_id")
      .notNull()
      .references(() => posts.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    typeId: integer("type_id")
      .references(() => reactionTypes.id)
      .notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    index("post_reactions_postId_idx").on(table.postId),
    index("post_reactions_userId_idx").on(table.userId),
    unique("post_reactions_user_post_unique").on(table.userId, table.postId),
  ]
);

export const postViews = pgTable(
  "post_views",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    postId: uuid("post_id")
      .notNull()
      .references(() => posts.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    index("post_views_postId_idx").on(table.postId),
    index("post_views_userId_idx").on(table.userId),
    unique("post_views_user_post_unique").on(table.userId, table.postId),
  ]
);

// ============================================================================
// COMMUNICATION (Chat & Real-time Messaging)
// Direct messaging architecture with media support.
// ============================================================================

export const conversations = pgTable(
  "conversations",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  }
);

export const conversationParticipants = pgTable(
  "conversation_participants",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    conversationId: uuid("conversation_id")
      .notNull()
      .references(() => conversations.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    joinedAt: timestamp("joined_at").defaultNow().notNull(),
  },
  (table) => [
    index("conversation_participants_conversationId_idx").on(table.conversationId),
    index("conversation_participants_userId_idx").on(table.userId),
    unique("conversation_participants_user_conversation_unique").on(table.userId, table.conversationId),
  ]
);

export const messages = pgTable(
  "messages",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    conversationId: uuid("conversation_id")
      .notNull()
      .references(() => conversations.id, { onDelete: "cascade" }),
    senderId: uuid("sender_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    content: text("content").notNull(),
    mediaUrl: text("media_url"),
    mediaTypeId: integer("media_type_id").references(() => messageMediaTypes.id),
    mediaPublicId: text("media_public_id"),
    isRead: boolean("is_read").default(false).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    index("messages_conversationId_idx").on(table.conversationId),
    index("messages_senderId_idx").on(table.senderId),
  ]
);

// ============================================================================
// SYSTEM LOGS & AUDIT (Admin, Sanctions, Subscriptions)
// Disciplinary records, administrative actions, and payment tracking.
// ============================================================================

export const subscriptions = pgTable("subscriptions", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id")
    .references(() => user.id)
    .notNull(),
  stripeSubscriptionId: text("stripe_subscription_id").unique().notNull(),
  stripePriceId: text("stripe_price_id").notNull(),
  statusId: integer("status_id")
    .references(() => subscriptionStatuses.id)
    .notNull(),
  currentPeriodEnd: timestamp("current_period_end").notNull(),
  cancelAtPeriodEnd: boolean("cancel_at_period_end").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at")
    .defaultNow()
    .$onUpdate(() => new Date())
    .notNull(),
});

export const userSanctions = pgTable(
  "user_sanctions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    typeId: integer("type_id")
      .references(() => sanctionTypes.id)
      .notNull(),
    reason: text("reason").notNull(),
    createdByUserId: uuid("created_by_user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    expiresAt: timestamp("expires_at"),
    revokedAt: timestamp("revoked_at"),
    revokedByUserId: uuid("revoked_by_user_id").references(() => user.id, {
      onDelete: "set null",
    }),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    index("user_sanctions_userId_idx").on(table.userId),
    index("user_sanctions_typeId_idx").on(table.typeId),
    index("user_sanctions_createdByUserId_idx").on(table.createdByUserId),
  ]
);

export const adminActionLog = pgTable(
  "admin_action_log",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    actorUserId: uuid("actor_user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    actionTypeId: integer("action_type_id")
      .references(() => adminActionTypes.id)
      .notNull(),
    targetUserId: uuid("target_user_id").references(() => user.id, {
      onDelete: "set null",
    }),
    targetPostId: uuid("target_post_id").references(() => posts.id, {
      onDelete: "set null",
    }),
    targetCommentId: uuid("target_comment_id").references(() => comments.id, {
      onDelete: "set null",
    }),
    details: text("details"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    index("admin_action_log_actorUserId_idx").on(table.actorUserId),
    index("admin_action_log_actionTypeId_idx").on(table.actionTypeId),
    index("admin_action_log_targetUserId_idx").on(table.targetUserId),
    index("admin_action_log_targetPostId_idx").on(table.targetPostId),
    index("admin_action_log_targetCommentId_idx").on(table.targetCommentId),
  ]
);

export const notifications = pgTable(
  "notifications",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    actorId: uuid("actor_id").references(() => user.id, {
      onDelete: "set null",
    }),
    typeId: integer("type_id")
      .references(() => notificationTypes.id)
      .notNull(),
    postId: uuid("post_id").references(() => posts.id, {
      onDelete: "cascade",
    }),
    commentId: uuid("comment_id").references(() => comments.id, {
      onDelete: "cascade",
    }),
    message: text("message"),
    isRead: boolean("is_read").default(false).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    index("notifications_userId_idx").on(table.userId),
    index("notifications_isRead_idx").on(table.isRead),
  ]
);

// ============================================================================
// RELATIONAL MAPPINGS
// Virtual connections for type-safe query building.
// ============================================================================

export const userRelations = relations(user, ({ many, one }) => ({
  sessions: many(session),
  accounts: many(account),
  subscriptions: many(subscriptions),
  posts: many(posts),
  views: many(postViews),
  comments: many(comments),
  conversationParticipants: many(conversationParticipants),
  messages: many(messages),
  sanctions: many(userSanctions, { relationName: "targetSanctions" }),
  createdSanctions: many(userSanctions, { relationName: "createdSanctions" }),
  revokedSanctions: many(userSanctions, { relationName: "revokedSanctions" }),
  performedAdminActions: many(adminActionLog, { relationName: "performedActions" }),
  receivedAdminActions: many(adminActionLog, { relationName: "receivedActions" }),
  notifications: many(notifications, { relationName: "userNotifications" }),
  triggeredNotifications: many(notifications, { relationName: "triggeredNotifications" }),
  userRole: one(roles, {
    fields: [user.roleId],
    references: [roles.id],
  }),
}));

export const rolesRelations = relations(roles, ({ many }) => ({
  users: many(user),
}));

export const subscriptionsRelations = relations(subscriptions, ({ one }) => ({
  user: one(user, {
    fields: [subscriptions.userId],
    references: [user.id],
  }),
}));

export const sessionRelations = relations(session, ({ one }) => ({
  user: one(user, {
    fields: [session.userId],
    references: [user.id],
  }),
}));

export const accountRelations = relations(account, ({ one }) => ({
  user: one(user, {
    fields: [account.userId],
    references: [user.id],
  }),
}));

export const postsRelations = relations(posts, ({ many, one }) => ({
  author: one(user, {
    fields: [posts.userId],
    references: [user.id],
  }),
  media: many(postMedia),
  comments: many(comments),
  reactions: many(postReactions),
  views: many(postViews),
  adminActions: many(adminActionLog, { relationName: "postAdminActions" }),
  accessType: one(accessTypes, {
    fields: [posts.accessTypeId],
    references: [accessTypes.id],
  }),
}));

export const accessTypesRelations = relations(accessTypes, ({ many }) => ({
  posts: many(posts),
}));

export const subscriptionStatusesRelations = relations(subscriptionStatuses, ({ many }) => ({
  subscriptions: many(subscriptions),
}));

export const resourceTypesRelations = relations(resourceTypes, ({ many }) => ({
  postMedia: many(postMedia),
}));

export const mediaFormatsRelations = relations(mediaFormats, ({ many }) => ({
  postMedia: many(postMedia),
}));

export const reactionTypesRelations = relations(reactionTypes, ({ many }) => ({
  reactions: many(postReactions),
}));

export const sanctionTypesRelations = relations(sanctionTypes, ({ many }) => ({
  sanctions: many(userSanctions),
}));

export const adminActionTypesRelations = relations(adminActionTypes, ({ many }) => ({
  actionLogs: many(adminActionLog),
}));

export const notificationTypesRelations = relations(notificationTypes, ({ many }) => ({
  notifications: many(notifications),
}));

export const messageMediaTypesRelations = relations(messageMediaTypes, ({ many }) => ({
  messages: many(messages),
}));

export const postReactionsRelations = relations(postReactions, ({ one }) => ({
  post: one(posts, {
    fields: [postReactions.postId],
    references: [posts.id],
  }),
  user: one(user, {
    fields: [postReactions.userId],
    references: [user.id],
  }),
}));

export const postViewsRelations = relations(postViews, ({ one }) => ({
  post: one(posts, {
    fields: [postViews.postId],
    references: [posts.id],
  }),
  user: one(user, {
    fields: [postViews.userId],
    references: [user.id],
  }),
}));

export const postMediaRelations = relations(postMedia, ({ one }) => ({
  post: one(posts, {
    fields: [postMedia.postId],
    references: [posts.id],
  }),
}));

export const commentsRelations = relations(comments, ({ one, many }) => ({
  post: one(posts, {
    fields: [comments.postId],
    references: [posts.id],
  }),
  author: one(user, {
    fields: [comments.userId],
    references: [user.id],
  }),
  adminActions: many(adminActionLog, { relationName: "commentAdminActions" }),
}));

export const userSanctionsRelations = relations(userSanctions, ({ one }) => ({
  targetUser: one(user, {
    fields: [userSanctions.userId],
    references: [user.id],
    relationName: "targetSanctions",
  }),
  actorUser: one(user, {
    fields: [userSanctions.createdByUserId],
    references: [user.id],
    relationName: "createdSanctions",
  }),
  revokedByUser: one(user, {
    fields: [userSanctions.revokedByUserId],
    references: [user.id],
    relationName: "revokedSanctions",
  }),
}));

export const adminActionLogRelations = relations(adminActionLog, ({ one }) => ({
  actorUser: one(user, {
    fields: [adminActionLog.actorUserId],
    references: [user.id],
    relationName: "performedActions",
  }),
  targetUser: one(user, {
    fields: [adminActionLog.targetUserId],
    references: [user.id],
    relationName: "receivedActions",
  }),
  targetPost: one(posts, {
    fields: [adminActionLog.targetPostId],
    references: [posts.id],
    relationName: "postAdminActions",
  }),
  targetComment: one(comments, {
    fields: [adminActionLog.targetCommentId],
    references: [comments.id],
    relationName: "commentAdminActions",
  }),
}));

export const notificationsRelations = relations(notifications, ({ one }) => ({
  user: one(user, {
    fields: [notifications.userId],
    references: [user.id],
    relationName: "userNotifications",
  }),
  actor: one(user, {
    fields: [notifications.actorId],
    references: [user.id],
    relationName: "triggeredNotifications",
  }),
  post: one(posts, {
    fields: [notifications.postId],
    references: [posts.id],
  }),
  comment: one(comments, {
    fields: [notifications.commentId],
    references: [comments.id],
  }),
}));

export const conversationsRelations = relations(conversations, ({ many }) => ({
  participants: many(conversationParticipants),
  messages: many(messages),
}));

export const conversationParticipantsRelations = relations(conversationParticipants, ({ one }) => ({
  conversation: one(conversations, {
    fields: [conversationParticipants.conversationId],
    references: [conversations.id],
  }),
  user: one(user, {
    fields: [conversationParticipants.userId],
    references: [user.id],
  }),
}));

export const messagesRelations = relations(messages, ({ one }) => ({
  conversation: one(conversations, {
    fields: [messages.conversationId],
    references: [conversations.id],
  }),
  sender: one(user, {
    fields: [messages.senderId],
    references: [user.id],
  }),
}));
