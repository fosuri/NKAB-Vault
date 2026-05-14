import { db } from "@/lib/db/db";
import { 
  roles, ROLES,
  accessTypes, ACCESS_TYPES,
  subscriptionStatuses, SUBSCRIPTION_STATUSES,
  resourceTypes, RESOURCE_TYPES,
  mediaFormats, MEDIA_FORMATS,
  reactionTypes, REACTION_TYPES,
  sanctionTypes, SANCTION_TYPES,
  adminActionTypes, ADMIN_ACTION_TYPES,
  notificationTypes, NOTIFICATION_TYPES,
  messageMediaTypes, MESSAGE_MEDIA_TYPES
} from "@/lib/db/auth-schema";

const defaultRoles = Object.entries(ROLES).map(([name, id]) => ({ id, name: name.toLowerCase() }));
const defaultAccessTypes = Object.entries(ACCESS_TYPES).map(([name, id]) => ({ id, name: name.toLowerCase() }));
const defaultSubscriptionStatuses = Object.entries(SUBSCRIPTION_STATUSES).map(([name, id]) => ({ id, name: name.toLowerCase() }));
const defaultResourceTypes = Object.entries(RESOURCE_TYPES).map(([name, id]) => ({ id, name: name.toLowerCase() }));
const defaultMediaFormats = Object.entries(MEDIA_FORMATS).map(([name, id]) => ({ id, name: name.toLowerCase() }));
const defaultReactionTypes = Object.entries(REACTION_TYPES).map(([name, id]) => ({ id, name: name.toLowerCase() }));
const defaultSanctionTypes = Object.entries(SANCTION_TYPES).map(([name, id]) => ({ id, name: name.toLowerCase() }));
const defaultAdminActionTypes = Object.entries(ADMIN_ACTION_TYPES).map(([name, id]) => ({ id, name: name.toLowerCase() }));
const defaultNotificationTypes = Object.entries(NOTIFICATION_TYPES).map(([name, id]) => ({ id, name: name.toLowerCase() }));
const defaultMessageMediaTypes = Object.entries(MESSAGE_MEDIA_TYPES).map(([name, id]) => ({ id, name: name.toLowerCase() }));

const seedData = [
  { table: roles, data: defaultRoles },
  { table: accessTypes, data: defaultAccessTypes },
  { table: subscriptionStatuses, data: defaultSubscriptionStatuses },
  { table: resourceTypes, data: defaultResourceTypes },
  { table: mediaFormats, data: defaultMediaFormats },
  { table: reactionTypes, data: defaultReactionTypes },
  { table: sanctionTypes, data: defaultSanctionTypes },
  { table: adminActionTypes, data: defaultAdminActionTypes },
  { table: notificationTypes, data: defaultNotificationTypes },
  { table: messageMediaTypes, data: defaultMessageMediaTypes },
];

let defaultsEnsuredPromise: Promise<void> | null = null;

async function seedDefaults() {
  for (const { table, data } of seedData) {
    for (const row of data) {
      await db.insert(table).values(row).onConflictDoNothing();
    }
  }
}

export async function ensureDefaults() {
  if (!defaultsEnsuredPromise) {
    defaultsEnsuredPromise = seedDefaults().catch((error) => {
      defaultsEnsuredPromise = null;
      throw error;
    });
  }

  await defaultsEnsuredPromise;
}
