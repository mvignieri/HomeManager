import { 
  users, type User, type InsertUser,
  houses, type House, type InsertHouse,
  houseMembers, type HouseMember, type InsertHouseMember,
  tasks, type Task, type InsertTask,
  devices, type Device, type InsertDevice,
  TaskStatus, TaskPriority, DeviceStatus, DeviceType, HouseRole
} from "@shared/schema";

// modify the interface with any CRUD methods
// you might need

export interface IStorage {
  // User methods
  getUser(id: number): Promise<User | undefined>;
  getUserByUid(uid: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  getAllUsers(): Promise<User[]>;
  createUser(user: InsertUser): Promise<User>;
  
  // House methods
  getHouse(id: number): Promise<House | undefined>;
  getAllHouses(): Promise<House[]>;
  getHousesByUser(userId: number): Promise<House[]>;
  createHouse(house: InsertHouse): Promise<House>;
  
  // House member methods
  getHouseMember(id: number): Promise<HouseMember | undefined>;
  getHouseMembers(houseId: number): Promise<HouseMember[]>;
  addHouseMember(member: InsertHouseMember): Promise<HouseMember>;
  
  // Task methods
  getTask(id: number): Promise<Task | undefined>;
  getAllTasks(): Promise<Task[]>;
  getTasksByHouse(houseId: number): Promise<Task[]>;
  getTasksByUser(userId: number): Promise<Task[]>;
  createTask(task: InsertTask): Promise<Task>;
  updateTask(id: number, updates: Partial<Task>): Promise<Task>;
  deleteTask(id: number): Promise<void>;
  
  // Device methods
  getDevice(id: number): Promise<Device | undefined>;
  getAllDevices(): Promise<Device[]>;
  getDevicesByHouse(houseId: number): Promise<Device[]>;
  createDevice(device: InsertDevice): Promise<Device>;
  updateDevice(id: number, updates: Partial<Device>): Promise<Device>;
  deleteDevice(id: number): Promise<void>;
}

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private houses: Map<number, House>;
  private houseMembers: Map<number, HouseMember>;
  private tasks: Map<number, Task>;
  private devices: Map<number, Device>;
  
  private userIdCounter: number;
  private houseIdCounter: number;
  private houseMemberIdCounter: number;
  private taskIdCounter: number;
  private deviceIdCounter: number;

  constructor() {
    this.users = new Map();
    this.houses = new Map();
    this.houseMembers = new Map();
    this.tasks = new Map();
    this.devices = new Map();
    
    this.userIdCounter = 1;
    this.houseIdCounter = 1;
    this.houseMemberIdCounter = 1;
    this.taskIdCounter = 1;
    this.deviceIdCounter = 1;
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
    const user: User = { ...insertUser, id, createdAt: now };
    this.users.set(id, user);
    return user;
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
}

export const storage = new MemStorage();
