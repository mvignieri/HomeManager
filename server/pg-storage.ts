import { eq, and, desc } from 'drizzle-orm';
import { db } from './db.js';
import {
  users, type User, type InsertUser,
  houses, type House, type InsertHouse,
  houseMembers, type HouseMember, type InsertHouseMember,
  tasks, type Task, type InsertTask,
  devices, type Device, type InsertDevice,
  notifications, type Notification, type InsertNotification,
  houseInvitations, type HouseInvitation, type InsertHouseInvitation,
} from '@shared/schema';
import type { IStorage } from './storage.js';

export class PostgresStorage implements IStorage {
  // User methods
  async getUser(id: number): Promise<User | undefined> {
    const result = await db.select().from(users).where(eq(users.id, id));
    return result[0];
  }

  async getUserByUid(uid: string): Promise<User | undefined> {
    const result = await db.select().from(users).where(eq(users.uid, uid));
    return result[0];
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const result = await db.select().from(users).where(eq(users.email, email));
    return result[0];
  }

  async getAllUsers(): Promise<User[]> {
    return db.select().from(users);
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const result = await db.insert(users).values(insertUser).returning();
    return result[0];
  }

  async updateUser(id: number, updates: Partial<User>): Promise<User | undefined> {
    const result = await db
      .update(users)
      .set(updates)
      .where(eq(users.id, id))
      .returning();
    return result[0];
  }

  // House methods
  async getHouse(id: number): Promise<House | undefined> {
    const result = await db.select().from(houses).where(eq(houses.id, id));
    return result[0];
  }

  async getAllHouses(): Promise<House[]> {
    return db.select().from(houses);
  }

  async getHousesByUser(userId: number): Promise<House[]> {
    const memberships = await db
      .select()
      .from(houseMembers)
      .where(eq(houseMembers.userId, userId));

    const houseIds = memberships.map((m) => m.houseId);
    if (houseIds.length === 0) return [];

    return db
      .select()
      .from(houses)
      .where(eq(houses.id, houseIds[0])); // Note: This needs to be improved for multiple houses
  }

  async createHouse(insertHouse: InsertHouse): Promise<House> {
    const result = await db.insert(houses).values(insertHouse).returning();
    return result[0];
  }

  // House member methods
  async getHouseMember(id: number): Promise<HouseMember | undefined> {
    const result = await db.select().from(houseMembers).where(eq(houseMembers.id, id));
    return result[0];
  }

  async getHouseMembers(houseId: number): Promise<HouseMember[]> {
    return db.select().from(houseMembers).where(eq(houseMembers.houseId, houseId));
  }

  async addHouseMember(insertMember: InsertHouseMember): Promise<HouseMember> {
    const result = await db.insert(houseMembers).values(insertMember).returning();
    return result[0];
  }

  async updateHouseMember(id: number, updates: Partial<HouseMember>): Promise<HouseMember | undefined> {
    const result = await db
      .update(houseMembers)
      .set(updates)
      .where(eq(houseMembers.id, id))
      .returning();
    return result[0];
  }

  // Task methods
  async getTask(id: number): Promise<Task | undefined> {
    const result = await db.select().from(tasks).where(eq(tasks.id, id));
    return result[0];
  }

  async getAllTasks(): Promise<Task[]> {
    return db.select().from(tasks);
  }

  async getTasksByHouse(houseId: number): Promise<Task[]> {
    return db.select().from(tasks).where(eq(tasks.houseId, houseId));
  }

  async getTasksByUser(userId: number): Promise<Task[]> {
    return db
      .select()
      .from(tasks)
      .where(
        eq(tasks.createdById, userId)
        // Note: Should also check assignedToId and completedById
      );
  }

  async createTask(insertTask: InsertTask): Promise<Task> {
    const result = await db.insert(tasks).values(insertTask).returning();
    return result[0];
  }

  async updateTask(id: number, updates: Partial<Task>): Promise<Task> {
    const result = await db
      .update(tasks)
      .set(updates)
      .where(eq(tasks.id, id))
      .returning();

    if (!result[0]) {
      throw new Error(`Task with id ${id} not found`);
    }

    return result[0];
  }

  async deleteTask(id: number): Promise<void> {
    await db.delete(tasks).where(eq(tasks.id, id));
  }

  // Device methods
  async getDevice(id: number): Promise<Device | undefined> {
    const result = await db.select().from(devices).where(eq(devices.id, id));
    return result[0];
  }

  async getAllDevices(): Promise<Device[]> {
    return db.select().from(devices);
  }

  async getDevicesByHouse(houseId: number): Promise<Device[]> {
    return db.select().from(devices).where(eq(devices.houseId, houseId));
  }

  async createDevice(insertDevice: InsertDevice): Promise<Device> {
    const result = await db.insert(devices).values(insertDevice).returning();
    return result[0];
  }

  async updateDevice(id: number, updates: Partial<Device>): Promise<Device> {
    const result = await db
      .update(devices)
      .set(updates)
      .where(eq(devices.id, id))
      .returning();

    if (!result[0]) {
      throw new Error(`Device with id ${id} not found`);
    }

    return result[0];
  }

  async deleteDevice(id: number): Promise<void> {
    await db.delete(devices).where(eq(devices.id, id));
  }

  // Notification methods
  async getNotification(id: number): Promise<Notification | undefined> {
    const result = await db.select().from(notifications).where(eq(notifications.id, id));
    return result[0];
  }

  async getNotifications(userId: number, houseId?: number): Promise<Notification[]> {
    if (houseId !== undefined) {
      return db
        .select()
        .from(notifications)
        .where(and(eq(notifications.userId, userId), eq(notifications.houseId, houseId)))
        .orderBy(desc(notifications.createdAt));
    }

    return db
      .select()
      .from(notifications)
      .where(eq(notifications.userId, userId))
      .orderBy(desc(notifications.createdAt));
  }

  async createNotification(insertNotification: InsertNotification): Promise<Notification> {
    const result = await db.insert(notifications).values(insertNotification).returning();
    return result[0];
  }

  async markNotificationAsRead(id: number): Promise<Notification | undefined> {
    const result = await db
      .update(notifications)
      .set({ read: true })
      .where(eq(notifications.id, id))
      .returning();
    return result[0];
  }

  async deleteNotification(id: number): Promise<void> {
    await db.delete(notifications).where(eq(notifications.id, id));
  }

  // House invitation methods
  async getInvitation(id: number): Promise<HouseInvitation | undefined> {
    const result = await db.select().from(houseInvitations).where(eq(houseInvitations.id, id));
    return result[0];
  }

  async getInvitationByToken(token: string): Promise<HouseInvitation | undefined> {
    const result = await db.select().from(houseInvitations).where(eq(houseInvitations.token, token));
    return result[0];
  }

  async getInvitationsByHouse(houseId: number): Promise<HouseInvitation[]> {
    return db.select().from(houseInvitations).where(eq(houseInvitations.houseId, houseId));
  }

  async getInvitationsByEmail(email: string): Promise<HouseInvitation[]> {
    return db.select().from(houseInvitations).where(eq(houseInvitations.email, email));
  }

  async createInvitation(insertInvitation: InsertHouseInvitation): Promise<HouseInvitation> {
    const result = await db.insert(houseInvitations).values(insertInvitation).returning();
    return result[0];
  }

  async updateInvitation(id: number, updates: Partial<HouseInvitation>): Promise<HouseInvitation | undefined> {
    const result = await db
      .update(houseInvitations)
      .set(updates)
      .where(eq(houseInvitations.id, id))
      .returning();
    return result[0];
  }

  async deleteInvitation(id: number): Promise<void> {
    await db.delete(houseInvitations).where(eq(houseInvitations.id, id));
  }

  async updateHouse(id: number, updates: Partial<House>): Promise<House | undefined> {
    const result = await db
      .update(houses)
      .set(updates)
      .where(eq(houses.id, id))
      .returning();
    return result[0];
  }
}

export const storage = new PostgresStorage();
