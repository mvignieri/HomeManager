import {
  users, type User, type InsertUser,
  houses, type House, type InsertHouse,
  houseMembers, type HouseMember, type InsertHouseMember,
  tasks, type Task, type InsertTask,
  shoppingListItems, type ShoppingListItem, type InsertShoppingListItem,
  devices, type Device, type InsertDevice,
  notifications, type Notification, type InsertNotification,
  houseInvitations, type HouseInvitation, type InsertHouseInvitation,
  type PushSubscriptionRecord,
  TaskStatus, TaskPriority, DeviceStatus, DeviceType, HouseRole
} from "../shared/schema.js";

// modify the interface with any CRUD methods
// you might need

export interface IStorage {
  // User methods
  getUser(id: number): Promise<User | undefined>;
  getUserByUid(uid: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  getAllUsers(): Promise<User[]>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: number, updates: Partial<User>): Promise<User | undefined>;

  // House methods
  getHouse(id: number): Promise<House | undefined>;
  getAllHouses(): Promise<House[]>;
  getHousesByUser(userId: number): Promise<House[]>;
  createHouse(house: InsertHouse): Promise<House>;
  updateHouse(id: number, updates: Partial<House>): Promise<House | undefined>;
  deleteHouse(id: number): Promise<void>;
  
  // House member methods
  getHouseMember(id: number): Promise<HouseMember | undefined>;
  getHouseMembers(houseId: number): Promise<HouseMember[]>;
  addHouseMember(member: InsertHouseMember): Promise<HouseMember>;
  updateHouseMember(id: number, updates: Partial<HouseMember>): Promise<HouseMember | undefined>;
  removeHouseMember(id: number): Promise<void>;
  
  // Task methods
  getTask(id: number): Promise<Task | undefined>;
  getAllTasks(): Promise<Task[]>;
  getTasksByHouse(houseId: number): Promise<Task[]>;
  getTasksByUser(userId: number): Promise<Task[]>;
  createTask(task: InsertTask): Promise<Task>;
  updateTask(id: number, updates: Partial<Task>): Promise<Task>;
  deleteTask(id: number): Promise<void>;

  // Shopping list methods
  getShoppingListItem(id: number): Promise<ShoppingListItem | undefined>;
  getShoppingListItemsByHouse(houseId: number): Promise<ShoppingListItem[]>;
  createShoppingListItem(item: InsertShoppingListItem): Promise<ShoppingListItem>;
  updateShoppingListItem(id: number, updates: Partial<ShoppingListItem>): Promise<ShoppingListItem>;
  deleteShoppingListItem(id: number): Promise<void>;
  
  // Device methods
  getDevice(id: number): Promise<Device | undefined>;
  getAllDevices(): Promise<Device[]>;
  getDevicesByHouse(houseId: number): Promise<Device[]>;
  createDevice(device: InsertDevice): Promise<Device>;
  updateDevice(id: number, updates: Partial<Device>): Promise<Device>;
  deleteDevice(id: number): Promise<void>;

  // Notification methods
  getNotification(id: number): Promise<Notification | undefined>;
  getNotifications(userId: number, houseId?: number): Promise<Notification[]>;
  createNotification(notification: InsertNotification): Promise<Notification>;
  markNotificationAsRead(id: number): Promise<Notification | undefined>;
  deleteNotification(id: number): Promise<void>;

  // House invitation methods
  getInvitation(id: number): Promise<HouseInvitation | undefined>;
  getInvitationByToken(token: string): Promise<HouseInvitation | undefined>;
  getInvitationsByHouse(houseId: number): Promise<HouseInvitation[]>;
  getInvitationsByEmail(email: string): Promise<HouseInvitation[]>;
  createInvitation(invitation: InsertHouseInvitation): Promise<HouseInvitation>;
  updateInvitation(id: number, updates: Partial<HouseInvitation>): Promise<HouseInvitation | undefined>;
  deleteInvitation(id: number): Promise<void>;

  // Push subscription methods
  getPushSubscriptionsByUser(userId: number): Promise<PushSubscriptionRecord[]>;
  upsertPushSubscription(userId: number, endpoint: string, subscription: string): Promise<PushSubscriptionRecord>;
  deletePushSubscriptionByEndpoint(endpoint: string): Promise<void>;
}

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private houses: Map<number, House>;
  private houseMembers: Map<number, HouseMember>;
  private tasks: Map<number, Task>;
  private shoppingListItems: Map<number, ShoppingListItem>;
  private devices: Map<number, Device>;
  private notifications: Map<number, Notification>;
  private invitations: Map<number, HouseInvitation>;
  private pushSubscriptions: Map<number, PushSubscriptionRecord>;

  private userIdCounter: number;
  private houseIdCounter: number;
  private houseMemberIdCounter: number;
  private taskIdCounter: number;
  private shoppingListItemIdCounter: number;
  private deviceIdCounter: number;
  private notificationIdCounter: number;
  private invitationIdCounter: number;
  private pushSubscriptionIdCounter: number;

  constructor() {
    this.users = new Map();
    this.houses = new Map();
    this.houseMembers = new Map();
    this.tasks = new Map();
    this.shoppingListItems = new Map();
    this.devices = new Map();
    this.notifications = new Map();
    this.invitations = new Map();
    this.pushSubscriptions = new Map();

    this.userIdCounter = 1;
    this.houseIdCounter = 1;
    this.houseMemberIdCounter = 1;
    this.taskIdCounter = 1;
    this.shoppingListItemIdCounter = 1;
    this.deviceIdCounter = 1;
    this.notificationIdCounter = 1;
    this.invitationIdCounter = 1;
    this.pushSubscriptionIdCounter = 1;
  }

  // User methods
  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUid(uid: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.uid === uid
    );
  }
  
  async getUserByEmail(email: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.email === email
    );
  }
  
  async getAllUsers(): Promise<User[]> {
    return Array.from(this.users.values());
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.userIdCounter++;
    const now = new Date();
    const user: User = { displayName: null, photoURL: null, ...insertUser, id, createdAt: now };
    this.users.set(id, user);
    return user;
  }

  async updateUser(id: number, updates: Partial<User>): Promise<User | undefined> {
    const user = this.users.get(id);
    if (!user) {
      return undefined;
    }

    const updatedUser = { ...user, ...updates };
    this.users.set(id, updatedUser);
    return updatedUser;
  }

  // House methods
  async getHouse(id: number): Promise<House | undefined> {
    return this.houses.get(id);
  }
  
  async getAllHouses(): Promise<House[]> {
    return Array.from(this.houses.values());
  }
  
  async getHousesByUser(userId: number): Promise<House[]> {
    // Get all house memberships for the user
    const memberships = Array.from(this.houseMembers.values()).filter(
      (member) => member.userId === userId
    );
    
    // Get the houses
    return memberships.map(
      (membership) => this.houses.get(membership.houseId)
    ).filter((house): house is House => house !== undefined);
  }
  
  async createHouse(insertHouse: InsertHouse): Promise<House> {
    const id = this.houseIdCounter++;
    const now = new Date();
    const house: House = { ...insertHouse, id, createdAt: now };
    this.houses.set(id, house);
    return house;
  }

  async updateHouse(id: number, updates: Partial<House>): Promise<House | undefined> {
    const house = this.houses.get(id);
    if (!house) {
      return undefined;
    }

    const updatedHouse = { ...house, ...updates };
    this.houses.set(id, updatedHouse);
    return updatedHouse;
  }

  async deleteHouse(id: number): Promise<void> {
    this.houses.delete(id);
    // Also delete all related data
    const membersToDelete = Array.from(this.houseMembers.values()).filter(m => m.houseId === id);
    membersToDelete.forEach(m => this.houseMembers.delete(m.id));

    const tasksToDelete = Array.from(this.tasks.values()).filter(t => t.houseId === id);
    tasksToDelete.forEach(t => this.tasks.delete(t.id));

    const shoppingItemsToDelete = Array.from(this.shoppingListItems.values()).filter(i => i.houseId === id);
    shoppingItemsToDelete.forEach(i => this.shoppingListItems.delete(i.id));

    const devicesToDelete = Array.from(this.devices.values()).filter(d => d.houseId === id);
    devicesToDelete.forEach(d => this.devices.delete(d.id));

    const invitationsToDelete = Array.from(this.invitations.values()).filter(i => i.houseId === id);
    invitationsToDelete.forEach(i => this.invitations.delete(i.id));
  }

  // House member methods
  async getHouseMember(id: number): Promise<HouseMember | undefined> {
    return this.houseMembers.get(id);
  }
  
  async getHouseMembers(houseId: number): Promise<HouseMember[]> {
    return Array.from(this.houseMembers.values()).filter(
      (member) => member.houseId === houseId
    );
  }
  
  async addHouseMember(insertMember: InsertHouseMember): Promise<HouseMember> {
    const id = this.houseMemberIdCounter++;
    const now = new Date();
    const member: HouseMember = { ...insertMember, id, joinedAt: now };
    this.houseMembers.set(id, member);
    return member;
  }

  async updateHouseMember(id: number, updates: Partial<HouseMember>): Promise<HouseMember | undefined> {
    const member = this.houseMembers.get(id);
    if (!member) {
      return undefined;
    }

    const updatedMember = { ...member, ...updates };
    this.houseMembers.set(id, updatedMember);
    return updatedMember;
  }

  async removeHouseMember(id: number): Promise<void> {
    this.houseMembers.delete(id);
  }

  // Task methods
  async getTask(id: number): Promise<Task | undefined> {
    return this.tasks.get(id);
  }
  
  async getAllTasks(): Promise<Task[]> {
    return Array.from(this.tasks.values());
  }
  
  async getTasksByHouse(houseId: number): Promise<Task[]> {
    return Array.from(this.tasks.values()).filter(
      (task) => task.houseId === houseId
    );
  }
  
  async getTasksByUser(userId: number): Promise<Task[]> {
    return Array.from(this.tasks.values()).filter(
      (task) => 
        task.createdById === userId || 
        task.assignedToId === userId ||
        task.completedById === userId
    );
  }
  
  async createTask(insertTask: InsertTask): Promise<Task> {
    const id = this.taskIdCounter++;
    const now = new Date();
    const task: Task = { 
      ...insertTask, 
      id, 
      createdAt: now,
      completedAt: null,
      completedById: null
    };
    this.tasks.set(id, task);
    return task;
  }
  
  async updateTask(id: number, updates: Partial<Task>): Promise<Task> {
    const task = this.tasks.get(id);
    if (!task) {
      throw new Error(`Task with id ${id} not found`);
    }
    
    const updatedTask = { ...task, ...updates };
    this.tasks.set(id, updatedTask);
    return updatedTask;
  }
  
  async deleteTask(id: number): Promise<void> {
    this.tasks.delete(id);
  }

  // Shopping list methods
  async getShoppingListItem(id: number): Promise<ShoppingListItem | undefined> {
    return this.shoppingListItems.get(id);
  }

  async getShoppingListItemsByHouse(houseId: number): Promise<ShoppingListItem[]> {
    return Array.from(this.shoppingListItems.values())
      .filter((item) => item.houseId === houseId)
      .sort((a, b) => {
        if (a.isPurchased !== b.isPurchased) {
          return a.isPurchased ? 1 : -1;
        }
        return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      });
  }

  async createShoppingListItem(insertItem: InsertShoppingListItem): Promise<ShoppingListItem> {
    const id = this.shoppingListItemIdCounter++;
    const now = new Date();
    const item: ShoppingListItem = {
      houseId: insertItem.houseId,
      name: insertItem.name,
      quantity: insertItem.quantity ?? 1,
      unit: insertItem.unit ?? 'pcs',
      category: insertItem.category ?? 'other',
      note: insertItem.note ?? null,
      addedById: insertItem.addedById,
      id,
      isPurchased: false,
      purchasedById: null,
      purchasedAt: null,
      createdAt: now,
      updatedAt: now,
    };
    this.shoppingListItems.set(id, item);
    return item;
  }

  async updateShoppingListItem(id: number, updates: Partial<ShoppingListItem>): Promise<ShoppingListItem> {
    const item = this.shoppingListItems.get(id);
    if (!item) {
      throw new Error(`Shopping list item with id ${id} not found`);
    }

    const updatedItem: ShoppingListItem = {
      ...item,
      ...updates,
      updatedAt: new Date(),
    };
    this.shoppingListItems.set(id, updatedItem);
    return updatedItem;
  }

  async deleteShoppingListItem(id: number): Promise<void> {
    this.shoppingListItems.delete(id);
  }
  
  // Device methods
  async getDevice(id: number): Promise<Device | undefined> {
    return this.devices.get(id);
  }
  
  async getAllDevices(): Promise<Device[]> {
    return Array.from(this.devices.values());
  }
  
  async getDevicesByHouse(houseId: number): Promise<Device[]> {
    return Array.from(this.devices.values()).filter(
      (device) => device.houseId === houseId
    );
  }
  
  async createDevice(insertDevice: InsertDevice): Promise<Device> {
    const id = this.deviceIdCounter++;
    const now = new Date();
    const device: Device = { ...insertDevice, id, createdAt: now };
    this.devices.set(id, device);
    return device;
  }
  
  async updateDevice(id: number, updates: Partial<Device>): Promise<Device> {
    const device = this.devices.get(id);
    if (!device) {
      throw new Error(`Device with id ${id} not found`);
    }
    
    const updatedDevice = { ...device, ...updates };
    this.devices.set(id, updatedDevice);
    return updatedDevice;
  }
  
  async deleteDevice(id: number): Promise<void> {
    this.devices.delete(id);
  }

  // Notification methods
  async getNotification(id: number): Promise<Notification | undefined> {
    return this.notifications.get(id);
  }

  async getNotifications(userId: number, houseId?: number): Promise<Notification[]> {
    let notifications = Array.from(this.notifications.values()).filter(
      (notification) => notification.userId === userId
    );

    if (houseId !== undefined) {
      notifications = notifications.filter(
        (notification) => notification.houseId === houseId
      );
    }

    // Sort by created date, newest first
    return notifications.sort((a, b) =>
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }

  async createNotification(insertNotification: InsertNotification): Promise<Notification> {
    const id = this.notificationIdCounter++;
    const now = new Date();
    const notification: Notification = {
      ...insertNotification,
      id,
      createdAt: now,
    };
    this.notifications.set(id, notification);
    return notification;
  }

  async markNotificationAsRead(id: number): Promise<Notification | undefined> {
    const notification = this.notifications.get(id);
    if (!notification) {
      return undefined;
    }

    const updatedNotification = { ...notification, read: true };
    this.notifications.set(id, updatedNotification);
    return updatedNotification;
  }

  async deleteNotification(id: number): Promise<void> {
    this.notifications.delete(id);
  }

  // House invitation methods
  async getInvitation(id: number): Promise<HouseInvitation | undefined> {
    return this.invitations.get(id);
  }

  async getInvitationByToken(token: string): Promise<HouseInvitation | undefined> {
    return Array.from(this.invitations.values()).find(
      (invitation) => invitation.token === token
    );
  }

  async getInvitationsByHouse(houseId: number): Promise<HouseInvitation[]> {
    return Array.from(this.invitations.values()).filter(
      (invitation) => invitation.houseId === houseId
    );
  }

  async getInvitationsByEmail(email: string): Promise<HouseInvitation[]> {
    return Array.from(this.invitations.values()).filter(
      (invitation) => invitation.email === email
    );
  }

  async createInvitation(insertInvitation: InsertHouseInvitation): Promise<HouseInvitation> {
    const id = this.invitationIdCounter++;
    const now = new Date();
    const invitation: HouseInvitation = {
      ...insertInvitation,
      id,
      createdAt: now,
    };
    this.invitations.set(id, invitation);
    return invitation;
  }

  async updateInvitation(id: number, updates: Partial<HouseInvitation>): Promise<HouseInvitation | undefined> {
    const invitation = this.invitations.get(id);
    if (!invitation) {
      return undefined;
    }

    const updatedInvitation = { ...invitation, ...updates };
    this.invitations.set(id, updatedInvitation);
    return updatedInvitation;
  }

  async deleteInvitation(id: number): Promise<void> {
    this.invitations.delete(id);
  }

  // Push subscription methods
  async getPushSubscriptionsByUser(userId: number): Promise<PushSubscriptionRecord[]> {
    return Array.from(this.pushSubscriptions.values()).filter(s => s.userId === userId);
  }

  async upsertPushSubscription(userId: number, endpoint: string, subscription: string): Promise<PushSubscriptionRecord> {
    const existing = Array.from(this.pushSubscriptions.values()).find(s => s.endpoint === endpoint);
    if (existing) {
      const updated = { ...existing, subscription };
      this.pushSubscriptions.set(existing.id, updated);
      return updated;
    }
    const id = this.pushSubscriptionIdCounter++;
    const record: PushSubscriptionRecord = { id, userId, endpoint, subscription, createdAt: new Date() };
    this.pushSubscriptions.set(id, record);
    return record;
  }

  async deletePushSubscriptionByEndpoint(endpoint: string): Promise<void> {
    const existing = Array.from(this.pushSubscriptions.values()).find(s => s.endpoint === endpoint);
    if (existing) {
      this.pushSubscriptions.delete(existing.id);
    }
  }
}

export const storage = new MemStorage();
