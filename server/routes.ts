import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { WebSocketServer, WebSocket } from "ws";
import { 
  insertUserSchema, 
  insertHouseSchema, 
  insertHouseMemberSchema, 
  insertTaskSchema, 
  insertDeviceSchema,
  TaskStatus,
  TaskPriority,
  DeviceStatus,
  DeviceType,
  HouseRole
} from "@shared/schema";
import { z } from "zod";

// Connected WebSocket clients by userId
const clients: Map<number, WebSocket[]> = new Map();

// Broadcast to all users in a house
const broadcastToHouse = (houseId: number, message: any) => {
  // Get all house members
  storage.getHouseMembers(houseId).then(members => {
    members.forEach(member => {
      const userClients = clients.get(member.userId);
      if (userClients) {
        userClients.forEach(client => {
          if (client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify(message));
          }
        });
      }
    });
  }).catch(err => {
    console.error('Error broadcasting to house:', err);
  });
};

export async function registerRoutes(app: Express): Promise<Server> {
  // Create HTTP server
  const httpServer = createServer(app);

  // Initialize WebSocket server
  const wss = new WebSocketServer({ server: httpServer, path: '/ws' });

  // WebSocket connection handler
  wss.on('connection', (ws) => {
    let userId: number | null = null;

    ws.on('message', async (message) => {
      try {
        const data = JSON.parse(message.toString());
        
        if (data.type === 'auth') {
          // Authenticate user
          const user = await storage.getUserByUid(data.userId);
          if (user) {
            userId = user.id;
            
            // Add client to map
            if (!clients.has(userId)) {
              clients.set(userId, []);
            }
            clients.get(userId)?.push(ws);
            
            // Send confirmation
            ws.send(JSON.stringify({ type: 'auth_success', userId }));
          } else {
            ws.send(JSON.stringify({ type: 'auth_error', message: 'User not found' }));
          }
        }
      } catch (error) {
        console.error('WebSocket message error:', error);
      }
    });

    ws.on('close', () => {
      // Remove client from map when connection closes
      if (userId) {
        const userClients = clients.get(userId);
        if (userClients) {
          const index = userClients.indexOf(ws);
          if (index !== -1) {
            userClients.splice(index, 1);
          }
          if (userClients.length === 0) {
            clients.delete(userId);
          }
        }
      }
    });
  });

  /*
   * User Routes
   */
  
  // Check if user exists and create if not
  app.post('/api/user/check', async (req, res) => {
    try {
      const userData = req.body;
      const existingUser = await storage.getUserByUid(userData.uid);
      
      if (existingUser) {
        return res.status(200).json(existingUser);
      }
      
      // Create new user
      const newUser = await storage.createUser({
        uid: userData.uid,
        email: userData.email,
        displayName: userData.displayName || null,
        photoURL: userData.photoURL || null,
      });
      
      // Create a default house for new users
      const house = await storage.createHouse({
        name: "Main House",
        createdById: newUser.id,
      });
      
      // Add user as house owner
      await storage.addHouseMember({
        houseId: house.id,
        userId: newUser.id,
        role: "owner",
      });
      
      // Create some default devices for the house
      await storage.createDevice({
        name: "Living Room Light",
        type: "light",
        status: "inactive",
        data: null,
        houseId: house.id,
      });
      
      await storage.createDevice({
        name: "Kitchen Light",
        type: "light",
        status: "inactive",
        data: null,
        houseId: house.id,
      });
      
      await storage.createDevice({
        name: "Thermostat",
        type: "thermostat",
        status: "active",
        data: { temperature: 22, boilerActive: false },
        houseId: house.id,
      });
      
      await storage.createDevice({
        name: "TV",
        type: "tv",
        status: "inactive",
        data: null,
        houseId: house.id,
      });
      
      res.status(201).json(newUser);
    } catch (error) {
      console.error('Error checking user:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  });
  
  // Get all users
  app.get('/api/users', async (req, res) => {
    try {
      const users = await storage.getAllUsers();
      res.json(users);
    } catch (error) {
      console.error('Error getting users:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  });
  
  /*
   * House Routes
   */
  
  // Get houses for current user
  app.get('/api/houses', async (req, res) => {
    try {
      // In a real app, we would get the user from the session
      // For demo purposes, return all houses
      const houses = await storage.getAllHouses();
      res.json(houses);
    } catch (error) {
      console.error('Error getting houses:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  });
  
  // Create house
  app.post('/api/houses', async (req, res) => {
    try {
      const houseData = insertHouseSchema.parse(req.body);
      const house = await storage.createHouse(houseData);
      
      // Add creator as owner
      await storage.addHouseMember({
        houseId: house.id,
        userId: houseData.createdById,
        role: "owner",
      });
      
      res.status(201).json(house);
    } catch (error) {
      console.error('Error creating house:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  });
  
  // Get house members
  app.get('/api/houses/:id/members', async (req, res) => {
    try {
      const houseId = parseInt(req.params.id);
      const members = await storage.getHouseMembers(houseId);
      res.json(members);
    } catch (error) {
      console.error('Error getting house members:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  });
  
  // Add house member
  app.post('/api/houses/:id/members', async (req, res) => {
    try {
      const houseId = parseInt(req.params.id);
      const memberData = insertHouseMemberSchema.parse({
        ...req.body,
        houseId,
      });
      
      const member = await storage.addHouseMember(memberData);
      res.status(201).json(member);
    } catch (error) {
      console.error('Error adding house member:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  });
  
  /*
   * Task Routes
   */
  
  // Get tasks
  app.get('/api/tasks', async (req, res) => {
    try {
      const houseId = req.query.houseId ? parseInt(req.query.houseId as string) : undefined;
      const tasks = houseId 
        ? await storage.getTasksByHouse(houseId)
        : await storage.getAllTasks();
      
      res.json(tasks);
    } catch (error) {
      console.error('Error getting tasks:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  });
  
  // Create task
  app.post('/api/tasks', async (req, res) => {
    try {
      // Validate task data
      const taskData = insertTaskSchema.parse(req.body);
      
      // Create task
      const task = await storage.createTask(taskData);
      
      // Send WebSocket notification
      broadcastToHouse(task.houseId, {
        type: 'task_update',
        action: 'created',
        task,
      });
      
      res.status(201).json(task);
    } catch (error) {
      console.error('Error creating task:', error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: 'Invalid task data', errors: error.errors });
      }
      res.status(500).json({ message: 'Internal server error' });
    }
  });
  
  // Update task
  app.patch('/api/tasks/:id', async (req, res) => {
    try {
      const taskId = parseInt(req.params.id);
      const task = await storage.getTask(taskId);
      
      if (!task) {
        return res.status(404).json({ message: 'Task not found' });
      }
      
      // Update task
      const updatedTask = await storage.updateTask(taskId, req.body);
      
      // Send WebSocket notification
      broadcastToHouse(updatedTask.houseId, {
        type: 'task_update',
        action: 'updated',
        task: updatedTask,
      });
      
      res.json(updatedTask);
    } catch (error) {
      console.error('Error updating task:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  });
  
  // Complete task
  app.patch('/api/tasks/:id/complete', async (req, res) => {
    try {
      const taskId = parseInt(req.params.id);
      const task = await storage.getTask(taskId);
      
      if (!task) {
        return res.status(404).json({ message: 'Task not found' });
      }
      
      // Update task status to completed
      const updatedTask = await storage.updateTask(taskId, {
        status: 'completed',
        completedById: task.assignedToId || task.createdById,
        completedAt: new Date(),
      });
      
      // Send WebSocket notification
      broadcastToHouse(updatedTask.houseId, {
        type: 'task_update',
        action: 'completed',
        task: updatedTask,
      });
      
      res.json(updatedTask);
    } catch (error) {
      console.error('Error completing task:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  });
  
  // Assign task
  app.patch('/api/tasks/:id/assign', async (req, res) => {
    try {
      const taskId = parseInt(req.params.id);
      const { assignedToId } = req.body;
      
      const task = await storage.getTask(taskId);
      
      if (!task) {
        return res.status(404).json({ message: 'Task not found' });
      }
      
      // Update task
      const updatedTask = await storage.updateTask(taskId, {
        assignedToId,
        status: 'assigned',
      });
      
      // Get assigned user
      const assignedUser = assignedToId ? await storage.getUser(assignedToId) : null;
      
      // Send WebSocket notification
      broadcastToHouse(updatedTask.houseId, {
        type: 'task_update',
        action: 'assigned',
        task: updatedTask,
        assignedTo: assignedUser?.uid,
      });
      
      res.json(updatedTask);
    } catch (error) {
      console.error('Error assigning task:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  });
  
  // Delete task
  app.delete('/api/tasks/:id', async (req, res) => {
    try {
      const taskId = parseInt(req.params.id);
      const task = await storage.getTask(taskId);
      
      if (!task) {
        return res.status(404).json({ message: 'Task not found' });
      }
      
      // Delete task
      await storage.deleteTask(taskId);
      
      // Send WebSocket notification
      broadcastToHouse(task.houseId, {
        type: 'task_update',
        action: 'deleted',
        taskId,
      });
      
      res.json({ success: true });
    } catch (error) {
      console.error('Error deleting task:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  });
  
  /*
   * Device Routes
   */
  
  // Get devices
  app.get('/api/devices', async (req, res) => {
    try {
      const houseId = req.query.houseId ? parseInt(req.query.houseId as string) : undefined;
      const devices = houseId 
        ? await storage.getDevicesByHouse(houseId)
        : await storage.getAllDevices();
      
      res.json(devices);
    } catch (error) {
      console.error('Error getting devices:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  });
  
  // Update device status
  app.patch('/api/devices/:id/status', async (req, res) => {
    try {
      const deviceId = parseInt(req.params.id);
      const { status } = req.body;
      
      if (!Object.values(DeviceStatus.enum).includes(status)) {
        return res.status(400).json({ message: 'Invalid status' });
      }
      
      const device = await storage.getDevice(deviceId);
      
      if (!device) {
        return res.status(404).json({ message: 'Device not found' });
      }
      
      // Update device
      const updatedDevice = await storage.updateDevice(deviceId, { status });
      
      // Send WebSocket notification
      broadcastToHouse(updatedDevice.houseId, {
        type: 'device_update',
        action: 'status_changed',
        device: updatedDevice,
      });
      
      res.json(updatedDevice);
    } catch (error) {
      console.error('Error updating device status:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  });
  
  // Update thermostat temperature
  app.patch('/api/devices/:id/temperature', async (req, res) => {
    try {
      const deviceId = parseInt(req.params.id);
      const { temperature } = req.body;
      
      const device = await storage.getDevice(deviceId);
      
      if (!device) {
        return res.status(404).json({ message: 'Device not found' });
      }
      
      if (device.type !== 'thermostat') {
        return res.status(400).json({ message: 'Device is not a thermostat' });
      }
      
      // Get current data
      const currentData = device.data || {};
      
      // Update device data with new temperature
      const updatedDevice = await storage.updateDevice(deviceId, {
        data: {
          ...currentData,
          temperature,
          // Update boiler status based on temperature
          boilerActive: temperature > 20,
        }
      });
      
      // Send WebSocket notification
      broadcastToHouse(updatedDevice.houseId, {
        type: 'device_update',
        action: 'temperature_changed',
        device: updatedDevice,
      });
      
      res.json(updatedDevice);
    } catch (error) {
      console.error('Error updating thermostat temperature:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  });
  
  /*
   * Analytics Routes
   */
  
  app.get('/api/analytics', async (req, res) => {
    try {
      const houseId = req.query.houseId !== 'all' ? parseInt(req.query.houseId as string) : undefined;
      const period = (req.query.period as string) || 'week';
      
      // Get tasks
      const tasks = houseId 
        ? await storage.getTasksByHouse(houseId)
        : await storage.getAllTasks();
      
      // Calculate completion rate
      const completedTasks = tasks.filter(task => task.status === 'completed');
      const completionRate = tasks.length > 0 
        ? Math.round((completedTasks.length / tasks.length) * 100)
        : 0;
      
      // Count tasks by priority
      const tasksByPriority = {
        high: tasks.filter(task => task.priority === 'high').length,
        medium: tasks.filter(task => task.priority === 'medium').length,
        low: tasks.filter(task => task.priority === 'low').length,
      };
      
      // Count tasks by status
      const tasksByStatus = {
        created: tasks.filter(task => task.status === 'created').length,
        assigned: tasks.filter(task => task.status === 'assigned').length,
        completed: tasks.filter(task => task.status === 'completed').length,
      };
      
      // Generate task distribution data
      const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
      const taskDistribution = Array.from({ length: 7 }, (_, i) => {
        const date = days[i];
        return {
          date,
          created: Math.floor(Math.random() * 10), // Mock data
          completed: Math.floor(Math.random() * 8), // Mock data
        };
      });
      
      // Get top contributors
      // In a real app, we would calculate this from task data
      const users = await storage.getAllUsers();
      const topContributors = users
        .slice(0, 3)
        .map((user, index) => ({
          userId: user.id,
          name: user.displayName || user.email.split('@')[0],
          photoURL: user.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.displayName || 'User')}`,
          taskCount: 42 - index * 7, // Mock data
          completionRate: 75 - index * 15, // Mock data
        }));
      
      res.json({
        completionRate,
        tasksByPriority,
        tasksByStatus,
        taskDistribution,
        topContributors,
      });
    } catch (error) {
      console.error('Error getting analytics:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  return httpServer;
}
