import { relations, sql } from "drizzle-orm"
import {
  pgTable,
  text,
  varchar,
  uuid,
  integer,
  timestamp,
  boolean,
  index,
  unique,
  uniqueIndex,
  pgEnum,
  check,
} from "drizzle-orm/pg-core"
import type { ConfigData, ProtocolFamilyCode } from "@vancloak/api-contract"
import type { EndpointData, ServerData } from "@vancloak/infrastructure/shared"
import { encryptedJsonb, encryptedText } from "../columns/index.js"
import { user } from "./authSchema.js"

// Enums

export const serverStatus = pgEnum("server_status", ["provisioning", "active", "failed"])
export const endpointStatus = pgEnum("endpoint_status", ["active"])
export const configStatus = pgEnum("config_status", ["active", "pending", "deleting"])

// Catalog

export const protocol = pgTable(
  "protocol",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    code: text("code").notNull().unique(),
    family: text("family").$type<ProtocolFamilyCode>().notNull(),
    name: text("name").notNull(),
    isEnabled: boolean("is_enabled").default(true).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (t) => [
    check("protocol_code_check", sql`${t.code} in ('amneziawg2')`),
    check("protocol_family_check", sql`${t.family} in ('amneziawg')`),
  ],
)

export const deviceType = pgTable(
  "device_type",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    code: text("code").notNull().unique(),
    name: text("name").notNull(),
    sortOrder: integer("sort_order").notNull(),
    isEnabled: boolean("is_enabled").default(true).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (t) => [
    check(
      "device_type_code_check",
      sql`${t.code} in ('ios', 'ipados', 'macos', 'windows', 'android')`,
    ),
    check(
      "device_type_name_check",
      sql`${t.name} in ('iOS', 'iPadOS', 'macOS', 'Windows', 'Android')`,
    ),
  ],
)

// Limits

export const configLimit = pgTable(
  "config_limit",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    protocolFamily: text("protocol_family").$type<ProtocolFamilyCode>().notNull(),
    maxCount: integer("max_count").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (t) => [unique("config_limit_user_protocol_family_uq").on(t.userId, t.protocolFamily)],
)

// Infrastructure

export const server = pgTable(
  "server",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    name: varchar("name", { length: 255 }).notNull(),
    domainName: text("domain_name"),
    ip: encryptedText("ip").notNull(),
    country: text("country").notNull(),
    status: serverStatus("status").default("active").notNull(),
    data: encryptedJsonb<ServerData>("data"),
    isCurrent: boolean("is_current").default(false).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (t) => [
    uniqueIndex("server_is_current_uq")
      .on(t.isCurrent)
      .where(sql`${t.isCurrent}`),
  ],
)

export const endpoint = pgTable(
  "endpoint",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    serverId: uuid("server_id")
      .notNull()
      .references(() => server.id, { onDelete: "cascade" }),
    protocolId: uuid("protocol_id")
      .notNull()
      .references(() => protocol.id, { onDelete: "restrict" }),
    port: integer("port").notNull(),
    data: encryptedJsonb<EndpointData>("data").notNull(),
    status: endpointStatus("status").default("active").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (t) => [
    uniqueIndex("endpoint_server_port_uq")
      .on(t.serverId, t.port)
      .where(sql`${t.status} = 'active'`),
    uniqueIndex("endpoint_server_protocol_uq")
      .on(t.serverId, t.protocolId)
      .where(sql`${t.status} = 'active'`),
    index("endpoint_server_idx").on(t.serverId),
    index("endpoint_protocol_idx").on(t.protocolId),
  ],
)

// Issued access

export const config = pgTable(
  "config",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    endpointId: uuid("endpoint_id")
      .notNull()
      .references(() => endpoint.id, { onDelete: "restrict" }),
    deviceTypeId: uuid("device_type_id")
      .notNull()
      .references(() => deviceType.id, { onDelete: "restrict" }),
    name: varchar("name", { length: 255 }).notNull(),
    data: encryptedJsonb<ConfigData>("data").notNull(),
    clientIdentifier: text("client_identifier"),
    status: configStatus("status").default("pending").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (t) => [
    uniqueIndex("config_endpoint_client_identifier_uq").on(t.endpointId, t.clientIdentifier),
    index("config_user_idx").on(t.userId),
    index("config_endpoint_idx").on(t.endpointId),
    index("config_device_type_idx").on(t.deviceTypeId),
  ],
)

// Relations

export const protocolRelations = relations(protocol, ({ many }) => ({
  endpoints: many(endpoint),
}))

export const deviceTypeRelations = relations(deviceType, ({ many }) => ({
  configs: many(config),
}))

export const configLimitRelations = relations(configLimit, ({ one }) => ({
  user: one(user, { fields: [configLimit.userId], references: [user.id] }),
}))

export const serverRelations = relations(server, ({ many }) => ({
  endpoints: many(endpoint),
}))

export const endpointRelations = relations(endpoint, ({ one, many }) => ({
  server: one(server, { fields: [endpoint.serverId], references: [server.id] }),
  protocol: one(protocol, { fields: [endpoint.protocolId], references: [protocol.id] }),
  configs: many(config),
}))

export const configRelations = relations(config, ({ one }) => ({
  user: one(user, { fields: [config.userId], references: [user.id] }),
  endpoint: one(endpoint, { fields: [config.endpointId], references: [endpoint.id] }),
  deviceType: one(deviceType, {
    fields: [config.deviceTypeId],
    references: [deviceType.id],
  }),
}))
