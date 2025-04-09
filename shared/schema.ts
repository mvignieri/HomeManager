import { pgTable, text, serial, integer, boolean, timestamp, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// User model
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  uid: text("uid").notNull().unique(),
  email: text("email").notNull(),
  displayName: text("display_name"),
  photoURL: text("photo_url"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertUserSchema = createInsertSchema(users).omit({ id: true, createdAt: true });
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

// House model
export const houses = pgTable("houses", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  createdById: integer("created_by_id").notNull().references(() => users.id),
});

export const insertHouseSchema = createInsertSchema(houses).omit({ id: true, createdAt: true });
export type InsertHouse = z.infer<typeof insertHouseSchema>;
export type House = typeof houses.$inferSelect;

// House membership model
export const houseMembers = pgTable("house_members", {
  id: serial("id").primaryKey(),
  houseId: integer("house_id").notNull().references(() => houses.id),
  userId: integer("user_id").notNull().references(() => users.id),
  role: text("role").notNull().default("member"),
  joinedAt: timestamp("joined_at").defaultNow().notNull(),
});

export const insertHouseMemberSchema = createInsertSchema(houseMembers).omit({ id: true, joinedAt: true });
export type InsertHouseMember = z.infer<typeof insertHouseMemberSchema>;
export type HouseMember = typeof houseMembers.$inferSelect;

// Task model
export const tasks = pgTable("tasks", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description"),
  priority: text("priority").notNull().default("medium"),
  status: text("status").notNull().default("created"),
  dueDate: timestamp("due_date"),
  effortHours: integer("effort_hours").default(0),
  effortMinutes: integer("effort_minutes").default(0),
  houseId: integer("house_id").notNull().references(() => houses.id),
  createdById: integer("created_by_id").notNull().references(() => users.id),
  assignedToId: integer("assigned_to_id").references(() => users.id),
  completedById: integer("completed_by_id").references(() => users.id),
  completedAt: timestamp("completed_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertTaskSchema = createInsertSchema(tasks).omit({ 
  id: true, 
  createdAt: true, 
  completedAt: true 
});

export type InsertTask = z.infer<typeof insertTaskSchema>;
export type Task = typeof tasks.$inferSelect;

// Smart home device model
export const devices = pgTable("devices", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  type: text("type").notNull(),
  status: text("status").notNull().default("inactive"),
  data: jsonb("data"),
  houseId: integer("house_id").notNull().references(() => houses.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertDeviceSchema = createInsertSchema(devices).omit({ id: true, createdAt: true });
export type InsertDevice = z.infer<typeof insertDeviceSchema>;
export type Device = typeof devices.$inferSelect;

// Task priority and status enums for validation
export const TaskPriority = z.enum(["low", "medium", "high"]);
export type TaskPriority = z.infer<typeof TaskPriority>;

export const TaskStatus = z.enum(["created", "assigned", "completed"]);
export type TaskStatus = z.infer<typeof TaskStatus>;

export const DeviceType = z.enum(["thermostat", "light", "tv", "speaker"]);
export type DeviceType = z.infer<typeof DeviceType>;

export const DeviceStatus = z.enum(["active", "inactive"]);
export type DeviceStatus = z.infer<typeof DeviceStatus>;

export const HouseRole = z.enum(["owner", "admin", "member"]);
export type HouseRole = z.infer<typeof HouseRole>;
