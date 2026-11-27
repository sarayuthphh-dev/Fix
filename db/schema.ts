import { sqliteTable, text, integer, uniqueIndex, index } from "drizzle-orm/sqlite-core";
export const cooperatives = sqliteTable('cooperatives', {
  id: text('id').primaryKey(), code: text('code').notNull().unique(), name: text('name').notNull(),
  province: text('province').notNull().default(''), active: integer('active').notNull().default(1), createdAt: integer('created_at').notNull()
});
export const contacts = sqliteTable('contacts', {
  id: text('id').primaryKey(), cooperativeId: text('cooperative_id').notNull().references(()=>cooperatives.id),
  name: text('name').notNull(), email: text('email').notNull(), phone: text('phone').notNull().default(''),
  status: text('status').notNull().default('pending'), approvedBy: text('approved_by'), approvedAt: integer('approved_at'), createdAt: integer('created_at').notNull()
}, t=>[uniqueIndex('contacts_cooperative_email').on(t.cooperativeId,t.email),index('contacts_email_status').on(t.email,t.status)]);
export const staffMembers = sqliteTable('staff_members', {
  email:text('email').primaryKey(),name:text('name').notNull(),role:text('role').notNull().default('agent'),active:integer('active').notNull().default(1)
});
export const rateLimits = sqliteTable('rate_limits', {key:text('key').primaryKey(),count:integer('count').notNull(),expiresAt:integer('expires_at').notNull()},t=>[index('rate_limits_expiry').on(t.expiresAt)]);
export const registryEvents = sqliteTable('registry_events', {id:text('id').primaryKey(),actor:text('actor').notNull(),action:text('action').notNull(),target:text('target').notNull(),at:integer('at').notNull()});
export const lineSettings = sqliteTable('line_settings', {
  id:text('id').primaryKey(),encryptedAccessToken:text('encrypted_access_token').notNull().default(''),encryptedChannelSecret:text('encrypted_channel_secret').notNull().default(''),
  botId:text('bot_id'),botName:text('bot_name'),destinationId:text('destination_id'),enabled:integer('enabled').notNull().default(0),
  testRetryKey:text('test_retry_key'),testAttemptAt:integer('test_attempt_at'),testAcceptedAt:integer('test_accepted_at'),updatedAt:integer('updated_at').notNull(),updatedBy:text('updated_by').notNull()
});
export const lineGroups = sqliteTable('line_groups', {id:text('id').primaryKey(),name:text('name').notNull(),active:integer('active').notNull().default(1),lastSeenAt:integer('last_seen_at').notNull()});
export const lineUsers = sqliteTable('line_users', {id:text('id').primaryKey(),name:text('name').notNull(),active:integer('active').notNull().default(1),lastSeenAt:integer('last_seen_at').notNull()});
export const tickets = sqliteTable("tickets", {
  id: text("id").primaryKey(), number: text("number").notNull().unique(), title: text("title").notNull(),
  program: text("program").notNull(), category: text("category").notNull(), priority: text("priority").notNull(),
  requestType: text("request_type").notNull().default("issue"),
  cooperativeId: text('cooperative_id').references(()=>cooperatives.id),
  submitterVerified: integer('submitter_verified').notNull().default(0),
  approvalStatus: text('approval_status').notNull().default('not_required'),
  status: text("status").notNull().default("new"), reporter: text("reporter").notNull(), office: text("office").notNull(),
  email: text("email").notNull(), description: text("description").notNull(), assignee: text("assignee").notNull().default(""),
  createdAt: integer("created_at").notNull(), updatedAt: integer("updated_at").notNull(), events: text("events").notNull(),
  attachments: text("attachments").notNull().default("[]"), creatorId: text("creator_id").notNull()
},t=>[index('tickets_cooperative_created').on(t.cooperativeId,t.createdAt)]);
export const lineNotifications = sqliteTable('line_notifications', {
  ticketId:text('ticket_id').primaryKey().references(()=>tickets.id),status:text('status').notNull().default('waiting_config'),destinationId:text('destination_id'),botId:text('bot_id'),message:text('message'),retryKey:text('retry_key').notNull(),
  attempts:integer('attempts').notNull().default(0),firstAttemptAt:integer('first_attempt_at'),lastAttemptAt:integer('last_attempt_at'),acceptedAt:integer('accepted_at'),lastError:text('last_error'),lastHttpStatus:integer('last_http_status'),
  lockUntil:integer('lock_until').notNull().default(0),createdAt:integer('created_at').notNull(),updatedAt:integer('updated_at').notNull()
},t=>[index('line_notifications_status_created').on(t.status,t.createdAt)]);
