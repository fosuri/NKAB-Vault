import { relations } from "drizzle-orm";
import { pgTable, text, timestamp, boolean, index, integer } from "drizzle-orm/pg-core";

export const user = pgTable("user", {
  id: text("id").primaryKey(),
  name: text("name").notNull().unique(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("email_verified").default(false).notNull(),
  image: text("image"),
  role: text("role").references(() => roles.name).default("user").notNull(),
  setupCompleted: boolean("setup_completed").default(false).notNull(),
  profileDescription: text("profile_description"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at")
    .defaultNow()
    .$onUpdate(() => new Date())
    .notNull(),
});

export const session = pgTable(
  "session",
  {
    id: text("id").primaryKey(),
    expiresAt: timestamp("expires_at").notNull(),
    token: text("token").notNull().unique(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .$onUpdate(() => new Date())
      .notNull(),
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
  },
  (table) => [index("session_userId_idx").on(table.userId)],
);

export const account = pgTable(
  "account",
  {
    id: text("id").primaryKey(),
    accountId: text("account_id").notNull(),
    providerId: text("provider_id").notNull(),
    userId: text("user_id")
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
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [index("account_userId_idx").on(table.userId)],
);

export const verification = pgTable(
  "verification",
  {
    id: text("id").primaryKey(),
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

export const roles = pgTable("roles", {
  name: text("name").primaryKey().notNull(),
});

export const posts = pgTable(
  "posts",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    title: text("title").default("").notNull(),
    description: text("description").notNull(),
    access: text("access").default("public").notNull(),
    viewCount: integer("view_count").default(0).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    index("posts_userId_idx").on(table.userId),
    index("posts_access_idx").on(table.access),
  ]
);

export const comments = pgTable(
  "comments",
  {
    id: text("id").primaryKey(),
    postId: text("post_id")
      .notNull()
      .references(() => posts.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    body: text("body").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    index("comments_postId_idx").on(table.postId),
    index("comments_userId_idx").on(table.userId),
  ]
);

export const postMedia = pgTable(
  "post_media",
  {
    id: text("id").primaryKey(),
    postId: text("post_id")
      .notNull()
      .references(() => posts.id, { onDelete: "cascade" }),
    publicId: text("public_id").notNull().unique(),
    resourceType: text("resource_type").notNull(),
    format: text("format"),
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
    index("post_media_resourceType_idx").on(table.resourceType),
  ]
);

export const userSanctions = pgTable(
  "user_sanctions",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    type: text("type").notNull(),
    reason: text("reason").notNull(),
    createdByUserId: text("created_by_user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    expiresAt: timestamp("expires_at"),
    revokedAt: timestamp("revoked_at"),
    revokedByUserId: text("revoked_by_user_id").references(() => user.id, {
      onDelete: "set null",
    }),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    index("user_sanctions_userId_idx").on(table.userId),
    index("user_sanctions_type_idx").on(table.type),
    index("user_sanctions_createdByUserId_idx").on(table.createdByUserId),
  ]
);

export const adminActionLog = pgTable(
  "admin_action_log",
  {
    id: text("id").primaryKey(),
    actorUserId: text("actor_user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    actionType: text("action_type").notNull(),
    targetUserId: text("target_user_id").references(() => user.id, {
      onDelete: "set null",
    }),
    targetPostId: text("target_post_id"),
    targetCommentId: text("target_comment_id"),
    details: text("details"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    index("admin_action_log_actorUserId_idx").on(table.actorUserId),
    index("admin_action_log_actionType_idx").on(table.actionType),
    index("admin_action_log_targetUserId_idx").on(table.targetUserId),
  ]
);

export const userRelations = relations(user, ({ many, one }) => ({
  sessions: many(session),
  accounts: many(account),
  posts: many(posts),
  sanctions: many(userSanctions),
  adminActions: many(adminActionLog),
  userRole: one(roles, {
    fields: [user.role],
    references: [roles.name],
  }),
}));

export const rolesRelations = relations(roles, ({ many }) => ({
  users: many(user),
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
}));

export const postMediaRelations = relations(postMedia, ({ one }) => ({
  post: one(posts, {
    fields: [postMedia.postId],
    references: [posts.id],
  }),
}));

export const commentsRelations = relations(comments, ({ one }) => ({
  post: one(posts, {
    fields: [comments.postId],
    references: [posts.id],
  }),
  author: one(user, {
    fields: [comments.userId],
    references: [user.id],
  }),
}));

export const userRelations2 = relations(user, ({ many }) => ({
  comments: many(comments),
}));

export const userSanctionsRelations = relations(userSanctions, ({ one }) => ({
  targetUser: one(user, {
    fields: [userSanctions.userId],
    references: [user.id],
  }),
  actorUser: one(user, {
    fields: [userSanctions.createdByUserId],
    references: [user.id],
  }),
  revokedByUser: one(user, {
    fields: [userSanctions.revokedByUserId],
    references: [user.id],
  }),
}));

export const adminActionLogRelations = relations(adminActionLog, ({ one }) => ({
  actorUser: one(user, {
    fields: [adminActionLog.actorUserId],
    references: [user.id],
  }),
  targetUser: one(user, {
    fields: [adminActionLog.targetUserId],
    references: [user.id],
  }),
}));
