import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./pg-storage.js";
import { WebSocketServer, WebSocket } from "ws";
import {
  insertUserSchema,
  insertHouseSchema,
  insertHouseMemberSchema,
  insertTaskSchema,
  insertDeviceSchema,
  insertNotificationSchema,
  TaskStatus,
  TaskPriority,
  DeviceStatus,
  DeviceType,
  HouseRole
} from "../shared/schema.js";
import { z } from "zod";
import { sendInvitationEmail } from "./email.js";
import { sendNotificationToUser } from "./firebase-admin.js";

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

      // Don't create a default house anymore
      // User will be prompted to create one or will accept an invitation
      console.log(`New user created: ${userData.email}`);

      res.status(201).json(newUser);
    } catch (error) {
      console.error('Error checking user:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  });
  
  // Get current user by UID
  app.get('/api/users/me', async (req, res) => {
    try {
      const { uid } = req.query;

      if (!uid || typeof uid !== 'string') {
        return res.status(400).json({ message: 'UID is required' });
      }

      const user = await storage.getUserByUid(uid);

      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }

      res.json(user);
    } catch (error) {
      console.error('Error getting current user:', error);
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

  // Save FCM token for user
  app.post('/api/users/fcm-token', async (req, res) => {
    try {
      const { token, userId } = req.body;

      if (!token || !userId) {
        return res.status(400).json({ message: 'Token and userId are required' });
      }

      // Update user's FCM token in database
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }

      // Update FCM token
      await storage.updateUser(userId, { fcmToken: token });

      console.log(`FCM token saved for user ${user.email}`);
      res.json({ success: true, message: 'FCM token saved' });
    } catch (error) {
      console.error('Error saving FCM token:', error);
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

  // Update house
  app.patch('/api/houses/:id', async (req, res) => {
    try {
      const houseId = parseInt(req.params.id);
      const house = await storage.updateHouse(houseId, req.body);

      if (!house) {
        return res.status(404).json({ message: 'House not found' });
      }

      res.json(house);
    } catch (error) {
      console.error('Error updating house:', error);
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

      // Check if user is already a member
      const existingMembers = await storage.getHouseMembers(houseId);
      const isAlreadyMember = existingMembers.some(m => m.userId === memberData.userId);

      if (isAlreadyMember) {
        return res.status(400).json({ message: 'User is already a member of this house' });
      }

      const member = await storage.addHouseMember(memberData);
      res.status(201).json(member);
    } catch (error) {
      console.error('Error adding house member:', error);

      // Handle database unique constraint violation
      if (error && typeof error === 'object' && 'code' in error && error.code === '23505') {
        return res.status(400).json({ message: 'User is already a member of this house' });
      }

      res.status(500).json({ message: 'Internal server error' });
    }
  });

  // Create house invitation
  app.post('/api/houses/:id/invitations', async (req, res) => {
    try {
      const houseId = parseInt(req.params.id);
      const { email, role, invitedById } = req.body;

      // Check if user already exists
      const existingUser = await storage.getUserByEmail(email);
      if (existingUser) {
        // Check if already a member
        const members = await storage.getHouseMembers(houseId);
        const existingMember = members.find(m => m.userId === existingUser.id);
        if (existingMember) {
          return res.status(400).json({ message: 'User is already a member of this house' });
        }
      }

      // Check for existing pending invitation
      const existingInvitations = await storage.getInvitationsByEmail(email);
      const pendingInvitation = existingInvitations.find(
        inv => inv.houseId === houseId && inv.status === 'pending'
      );
      if (pendingInvitation) {
        return res.status(400).json({ message: 'An invitation has already been sent to this email' });
      }

      // Generate unique token
      const token = Math.random().toString(36).substring(2) + Date.now().toString(36);

      // Set expiration to 7 days from now
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 7);

      // Create invitation
      const invitation = await storage.createInvitation({
        houseId,
        email,
        role: role || 'member',
        invitedById,
        token,
        status: 'pending',
        expiresAt,
      });

      // Get house and inviter info for email
      const house = await storage.getHouse(houseId);
      const inviter = await storage.getUser(invitedById);

      if (!house || !inviter) {
        throw new Error('House or inviter not found');
      }

      // Send invitation email
      const inviteLink = `${req.protocol}://${req.get('host')}/accept-invite?token=${token}`;

      try {
        await sendInvitationEmail({
          email,
          houseName: house.name,
          inviterName: inviter.displayName || inviter.email,
          role: invitation.role,
          inviteLink,
        });
        console.log(`Invitation email sent to ${email}`);
      } catch (emailError) {
        console.error('Failed to send invitation email:', emailError);
        // Continue anyway - the invitation is created
      }

      // Create notification if user already exists
      const invitedUser = await storage.getUserByEmail(email);
      if (invitedUser) {
        try {
          await storage.createNotification({
            userId: invitedUser.id,
            houseId,
            title: 'New House Invitation',
            message: `${inviter.displayName || inviter.email} has invited you to join ${house.name}`,
            type: 'house_invitation',
            data: { invitationId: invitation.id, token: invitation.token },
            read: false,
          });
          console.log(`Notification created for existing user: ${email}`);
        } catch (notifError) {
          console.error('Failed to create notification:', notifError);
        }
      }

      res.status(201).json({
        ...invitation,
        inviteLink, // Include link in response for development
      });
    } catch (error) {
      console.error('Error creating invitation:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  // Get house invitations
  app.get('/api/houses/:id/invitations', async (req, res) => {
    try {
      const houseId = parseInt(req.params.id);
      const invitations = await storage.getInvitationsByHouse(houseId);
      res.json(invitations);
    } catch (error) {
      console.error('Error getting invitations:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  // Get invitation by token
  app.get('/api/invitations/:token', async (req, res) => {
    try {
      const { token } = req.params;
      const invitation = await storage.getInvitationByToken(token);

      if (!invitation) {
        return res.status(404).json({ message: 'Invitation not found' });
      }

      // Check if invitation is expired
      if (new Date() > new Date(invitation.expiresAt)) {
        await storage.updateInvitation(invitation.id, { status: 'expired' });
        return res.status(400).json({ message: 'Invitation has expired' });
      }

      // Check if invitation is not pending
      if (invitation.status !== 'pending') {
        return res.status(400).json({ message: `Invitation is ${invitation.status}` });
      }

      // Get house info
      const house = await storage.getHouse(invitation.houseId);
      if (!house) {
        return res.status(404).json({ message: 'House not found' });
      }

      res.json({
        invitation,
        house,
      });
    } catch (error) {
      console.error('Error getting invitation:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  // Accept invitation
  app.post('/api/invitations/:token/accept', async (req, res) => {
    try {
      const { token } = req.params;
      const { userId } = req.body; // User ID from Firebase after registration/login

      const invitation = await storage.getInvitationByToken(token);

      if (!invitation) {
        return res.status(404).json({ message: 'Invitation not found' });
      }

      // Check if invitation is expired
      if (new Date() > new Date(invitation.expiresAt)) {
        await storage.updateInvitation(invitation.id, { status: 'expired' });
        return res.status(400).json({ message: 'Invitation has expired' });
      }

      // Check if invitation is not pending
      if (invitation.status !== 'pending') {
        return res.status(400).json({ message: `Invitation is ${invitation.status}` });
      }

      // Get user from database
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }

      // Verify email matches
      if (user.email !== invitation.email) {
        return res.status(400).json({
          message: 'This invitation was sent to a different email address'
        });
      }

      // Check if user is already a member
      const members = await storage.getHouseMembers(invitation.houseId);
      const existingMember = members.find(m => m.userId === user.id);
      if (existingMember) {
        // Mark invitation as accepted anyway
        await storage.updateInvitation(invitation.id, { status: 'accepted' });
        return res.status(400).json({ message: 'You are already a member of this house' });
      }

      // Add user as house member
      const member = await storage.addHouseMember({
        houseId: invitation.houseId,
        userId: user.id,
        role: invitation.role,
      });

      // Mark invitation as accepted
      await storage.updateInvitation(invitation.id, { status: 'accepted' });

      // Get house info
      const house = await storage.getHouse(invitation.houseId);

      res.json({
        member,
        house,
        message: 'Successfully joined the house',
      });
    } catch (error) {
      console.error('Error accepting invitation:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  // Delete/revoke invitation
  app.delete('/api/invitations/:id', async (req, res) => {
    try {
      const invitationId = parseInt(req.params.id);
      const invitation = await storage.getInvitation(invitationId);

      if (!invitation) {
        return res.status(404).json({ message: 'Invitation not found' });
      }

      await storage.deleteInvitation(invitationId);
      res.json({ success: true, message: 'Invitation deleted' });
    } catch (error) {
      console.error('Error deleting invitation:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  // Update house member
  app.patch('/api/houses/:houseId/members/:memberId', async (req, res) => {
    try {
      const memberId = parseInt(req.params.memberId);
      const member = await storage.updateHouseMember(memberId, req.body);

      if (!member) {
        return res.status(404).json({ message: 'Member not found' });
      }

      res.json(member);
    } catch (error) {
      console.error('Error updating house member:', error);
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

      // Create notification for assigned user
      if (assignedUser) {
        await storage.createNotification({
          userId: assignedUser.id,
          houseId: updatedTask.houseId,
          title: 'New Task Assigned',
          message: `You have been assigned the task: ${updatedTask.title}`,
          type: 'task_assigned',
          data: { taskId: updatedTask.id },
          read: false,
        });

        // Send push notification via Firebase Cloud Messaging
        if (assignedUser.fcmToken) {
          try {
            await sendNotificationToUser(
              assignedUser.fcmToken,
              'New Task Assigned',
              `You have been assigned the task: ${updatedTask.title}`,
              {
                taskId: updatedTask.id.toString(),
                type: 'task_assigned',
              }
            );
            console.log(`Push notification sent to ${assignedUser.email}`);
          } catch (fcmError) {
            console.error('Error sending push notification:', fcmError);
            // Continue anyway - the in-app notification was created
          }
        } else {
          console.log(`No FCM token for user ${assignedUser.email}`);
        }
      }

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

  // Create device
  app.post('/api/devices', async (req, res) => {
    try {
      const deviceData = insertDeviceSchema.parse(req.body);
      const device = await storage.createDevice(deviceData);
      res.status(201).json(device);
    } catch (error) {
      console.error('Error creating device:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  });

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
   * Notification Routes
   */

  // Get notifications for user
  app.get('/api/notifications', async (req, res) => {
    try {
      const userId = req.query.userId ? parseInt(req.query.userId as string) : undefined;
      const houseId = req.query.houseId ? parseInt(req.query.houseId as string) : undefined;

      if (!userId) {
        return res.status(400).json({ message: 'userId is required' });
      }

      const notifications = await storage.getNotifications(userId, houseId);
      res.json(notifications);
    } catch (error) {
      console.error('Error getting notifications:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  // Mark notification as read
  app.patch('/api/notifications/:id/read', async (req, res) => {
    try {
      const notificationId = parseInt(req.params.id);
      const notification = await storage.markNotificationAsRead(notificationId);

      if (!notification) {
        return res.status(404).json({ message: 'Notification not found' });
      }

      res.json(notification);
    } catch (error) {
      console.error('Error marking notification as read:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  // Delete notification
  app.delete('/api/notifications/:id', async (req, res) => {
    try {
      const notificationId = parseInt(req.params.id);
      await storage.deleteNotification(notificationId);
      res.json({ success: true });
    } catch (error) {
      console.error('Error deleting notification:', error);
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
