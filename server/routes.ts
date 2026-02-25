import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./pg-storage.js";
import { WebSocketServer, WebSocket } from "ws";
import {
  insertUserSchema,
  insertHouseSchema,
  insertHouseMemberSchema,
  insertTaskSchema,
  insertShoppingListItemSchema,
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
import { sendWebPush } from "./webpush.js";

// Helper: send push to all subscriptions for a user, auto-cleaning stale ones
async function notifyUser(userId: number, title: string, body: string, data?: Record<string, string>) {
  const subs = await storage.getPushSubscriptionsByUser(userId);
  for (const sub of subs) {
    const result = await sendWebPush(sub.subscription, title, body, data);
    if (result.shouldDelete) {
      await storage.deletePushSubscriptionByEndpoint(sub.endpoint);
    }
  }
}

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

  // Save Web Push subscription for user
  app.post('/api/users/push-subscription', async (req, res) => {
    try {
      const { subscription, userId } = req.body;

      if (!subscription || !userId) {
        return res.status(400).json({ message: 'subscription and userId are required' });
      }

      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }

      await storage.upsertPushSubscription(userId, subscription.endpoint, JSON.stringify(subscription));

      console.log(`Push subscription saved for user ${user.email}`);
      res.json({ success: true, message: 'Push subscription saved' });
    } catch (error) {
      console.error('Error saving push subscription:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  // Delete Web Push subscription by endpoint (called on logout)
  app.delete('/api/users/push-subscription', async (req, res) => {
    try {
      const { endpoint } = req.body;
      if (!endpoint) {
        return res.status(400).json({ message: 'endpoint is required' });
      }
      await storage.deletePushSubscriptionByEndpoint(endpoint);
      res.json({ success: true });
    } catch (error) {
      console.error('Error deleting push subscription:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  /*
   * House Routes
   */
  
  // Get houses for current user
  app.get('/api/houses', async (req, res) => {
    try {
      const { uid } = req.query;

      if (!uid || typeof uid !== 'string') {
        return res.status(400).json({ message: 'UID is required' });
      }

      // Get user by Firebase UID
      const user = await storage.getUserByUid(uid);

      if (!user) {
        // User not found - return empty array
        return res.json([]);
      }

      // Get only houses where user is a member
      const houses = await storage.getHousesByUser(user.id);
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

      // Check if user already has a house with the same name
      const userHouses = await storage.getHousesByUser(houseData.createdById);
      const duplicateName = userHouses.find(
        (h) => h.name.toLowerCase() === houseData.name.toLowerCase()
      );

      if (duplicateName) {
        return res.status(400).json({
          message: 'You already have a house with this name. Please choose a different name.',
        });
      }

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

  // Delete house
  app.delete('/api/houses/:id', async (req, res) => {
    try {
      const houseId = parseInt(req.params.id);
      await storage.deleteHouse(houseId);
      res.json({ message: 'House deleted successfully' });
    } catch (error) {
      console.error('Error deleting house:', error);
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
          // Create in-app notification
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

          await notifyUser(invitedUser.id, 'New House Invitation', `${inviter.displayName || inviter.email} has invited you to join ${house.name}`, { type: 'house_invitation', invitationId: invitation.id.toString(), token: invitation.token });
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

  // Get invitations by email
  app.get('/api/invitations/by-email/:email', async (req, res) => {
    try {
      const { email } = req.params;

      if (!email) {
        return res.status(400).json({ message: 'Email is required' });
      }

      // Get all invitations for this email
      const invitations = await storage.getInvitationsByEmail(email);

      // Filter for pending invitations and include house information
      const pendingInvitations = await Promise.all(
        invitations
          .filter(inv => inv.status === 'pending' && new Date() <= new Date(inv.expiresAt))
          .map(async (inv) => {
            const house = await storage.getHouse(inv.houseId);
            return {
              ...inv,
              house,
            };
          })
      );

      res.json(pendingInvitations);
    } catch (error) {
      console.error('Error getting invitations by email:', error);
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
      const houseId = parseInt(req.params.houseId);
      const requestingUserId = req.query.requestingUserId ? parseInt(req.query.requestingUserId as string) : undefined;

      // Get the current member data before updating
      const memberToUpdate = await storage.getHouseMember(memberId);
      if (!memberToUpdate) {
        return res.status(404).json({ message: 'Member not found' });
      }

      // If trying to change role, verify permissions
      if (req.body.role && req.body.role !== memberToUpdate.role && requestingUserId) {
        const members = await storage.getHouseMembers(houseId);
        const requestingMember = members.find(m => m.userId === requestingUserId);

        if (!requestingMember) {
          return res.status(403).json({ message: 'You are not a member of this house' });
        }

        // Only admin can change the role of another admin
        if (memberToUpdate.role === 'admin' && requestingMember.role !== 'admin') {
          return res.status(403).json({
            message: 'Only admins can change the role of other admins'
          });
        }

        // Admin cannot be changed to a different role by an owner
        if (memberToUpdate.role === 'admin' && requestingMember.role === 'owner') {
          return res.status(403).json({
            message: 'Owners cannot change the role of admins'
          });
        }
      }

      const member = await storage.updateHouseMember(memberId, req.body);

      if (!member) {
        return res.status(404).json({ message: 'Member not found after update' });
      }

      res.json(member);
    } catch (error) {
      console.error('Error updating house member:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  // Remove house member
  app.delete('/api/houses/:houseId/members/:memberId', async (req, res) => {
    try {
      const memberId = parseInt(req.params.memberId);
      const requestingUserId = req.query.requestingUserId ? parseInt(req.query.requestingUserId as string) : undefined;

      // Get the member being removed
      const memberToRemove = await storage.getHouseMember(memberId);
      if (!memberToRemove) {
        return res.status(404).json({ message: 'Member not found' });
      }

      // If the member being removed is an admin, verify the requesting user is also an admin
      if (memberToRemove.role === 'admin' && requestingUserId) {
        const houseId = parseInt(req.params.houseId);
        const members = await storage.getHouseMembers(houseId);
        const requestingMember = members.find(m => m.userId === requestingUserId);

        if (!requestingMember || requestingMember.role !== 'admin') {
          return res.status(403).json({
            message: 'Only admins can remove other admins'
          });
        }
      }

      const removedUserId = memberToRemove.userId;
      const houseId = parseInt(req.params.houseId);

      await storage.removeHouseMember(memberId);

      // Unassign all tasks in this house that were assigned to the removed user
      // and are still in 'assigned' or 'in_progress' status
      const houseTasks = await storage.getTasksByHouse(houseId);
      const tasksToUnassign = houseTasks.filter(
        (t) => t.assignedToId === removedUserId && (t.status === 'assigned' || t.status === 'in_progress')
      );
      for (const task of tasksToUnassign) {
        await storage.updateTask(task.id, { assignedToId: null, status: 'created' });
      }

      res.json({ message: 'Member removed successfully' });
    } catch (error) {
      console.error('Error removing house member:', error);
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
      // If created with an assignee, start directly in 'assigned' status
      if (taskData.assignedToId && (!taskData.status || taskData.status === 'created')) {
        (taskData as any).status = 'assigned';
      }
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
      console.log('Updating task:', taskId, 'with data:', JSON.stringify(req.body, null, 2));

      const task = await storage.getTask(taskId);

      if (!task) {
        console.log('Task not found:', taskId);
        return res.status(404).json({ message: 'Task not found' });
      }

      console.log('Current task:', JSON.stringify(task, null, 2));

      // Convert date strings to Date objects for all date fields
      const updates = { ...req.body };

      // List of date fields that might be in the update
      const dateFields = ['dueDate', 'completedAt', 'createdAt'];

      for (const field of dateFields) {
        if (updates[field]) {
          if (typeof updates[field] === 'string') {
            console.log(`Converting ${field} from string to Date:`, updates[field]);
            updates[field] = new Date(updates[field]);
          } else if (!(updates[field] instanceof Date)) {
            // If it's not a string and not a Date, log it and remove it
            console.warn(`Unexpected type for ${field}:`, typeof updates[field], updates[field]);
            delete updates[field];
          }
        }
      }

      console.log('Updates after date conversion:', JSON.stringify(updates, null, 2));

      // Update task
      const updatedTask = await storage.updateTask(taskId, updates);

      console.log('Updated task:', JSON.stringify(updatedTask, null, 2));

      // Send WebSocket notification
      broadcastToHouse(updatedTask.houseId, {
        type: 'task_update',
        action: 'updated',
        task: updatedTask,
      });

      res.json(updatedTask);
    } catch (error) {
      console.error('Error updating task:', error);
      console.error('Error stack:', error instanceof Error ? error.stack : 'No stack trace');
      res.status(500).json({ message: 'Internal server error', error: error instanceof Error ? error.message : 'Unknown error' });
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

        await notifyUser(assignedUser.id, 'New Task Assigned', `You have been assigned the task: ${updatedTask.title}`, { taskId: updatedTask.id.toString(), type: 'task_assigned' });
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
   * Shopping List Routes
   */

  // Get shopping list items by house
  app.get('/api/shopping-items', async (req, res) => {
    try {
      const houseId = req.query.houseId ? parseInt(req.query.houseId as string, 10) : undefined;
      if (!houseId) {
        return res.status(400).json({ message: 'houseId is required' });
      }

      const items = await storage.getShoppingListItemsByHouse(houseId);
      res.json(items);
    } catch (error) {
      console.error('Error getting shopping list items:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  // Create shopping list item
  app.post('/api/shopping-items', async (req, res) => {
    try {
      const itemData = insertShoppingListItemSchema.parse(req.body);
      const item = await storage.createShoppingListItem(itemData);

      broadcastToHouse(item.houseId, {
        type: 'shopping_list_update',
        action: 'created',
        item,
      });

      res.status(201).json(item);
    } catch (error) {
      console.error('Error creating shopping list item:', error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: 'Invalid shopping item data', errors: error.errors });
      }
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  // Update shopping list item
  app.patch('/api/shopping-items/:id', async (req, res) => {
    try {
      const itemId = parseInt(req.params.id, 10);
      const existingItem = await storage.getShoppingListItem(itemId);
      if (!existingItem) {
        return res.status(404).json({ message: 'Shopping list item not found' });
      }

      const payload = { ...req.body };
      if (typeof payload.isPurchased === 'boolean') {
        payload.purchasedAt = payload.isPurchased ? new Date() : null;
        payload.purchasedById = payload.isPurchased ? payload.purchasedById || existingItem.addedById : null;
      }

      const updatedItem = await storage.updateShoppingListItem(itemId, payload);

      broadcastToHouse(updatedItem.houseId, {
        type: 'shopping_list_update',
        action: 'updated',
        item: updatedItem,
      });

      res.json(updatedItem);
    } catch (error) {
      console.error('Error updating shopping list item:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  // Delete shopping list item
  app.delete('/api/shopping-items/:id', async (req, res) => {
    try {
      const itemId = parseInt(req.params.id, 10);
      const existingItem = await storage.getShoppingListItem(itemId);
      if (!existingItem) {
        return res.status(404).json({ message: 'Shopping list item not found' });
      }

      await storage.deleteShoppingListItem(itemId);

      broadcastToHouse(existingItem.houseId, {
        type: 'shopping_list_update',
        action: 'deleted',
        itemId,
      });

      res.json({ success: true });
    } catch (error) {
      console.error('Error deleting shopping list item:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  // Notify house members when user confirms shopping list changes
  app.post('/api/shopping-items/commit', async (req, res) => {
    try {
      const { houseId, editorUserId, summary } = req.body as {
        houseId?: number;
        editorUserId?: number;
        summary?: string;
      };

      if (!houseId || !editorUserId) {
        return res.status(400).json({ message: 'houseId and editorUserId are required' });
      }

      const house = await storage.getHouse(houseId);
      const editor = await storage.getUser(editorUserId);
      if (!house || !editor) {
        return res.status(404).json({ message: 'House or editor user not found' });
      }

      const members = await storage.getHouseMembers(houseId);
      const recipients = members.filter((member) => member.userId !== editorUserId);
      const notificationMessage = summary?.trim().length
        ? summary.trim()
        : `${editor.displayName || editor.email} updated the shared shopping list`;

      for (const member of recipients) {
        const memberUser = await storage.getUser(member.userId);
        if (!memberUser) continue;

        await storage.createNotification({
          userId: member.userId,
          houseId,
          title: 'Shopping List Updated',
          message: notificationMessage,
          type: 'shopping_list_updated',
          data: {
            houseId,
            editorUserId,
            editorName: editor.displayName || editor.email,
          },
          read: false,
        });

        await notifyUser(memberUser.id, 'Shopping List Updated', notificationMessage, { type: 'shopping_list_updated', houseId: houseId.toString(), editorUserId: editorUserId.toString() });
      }

      broadcastToHouse(houseId, {
        type: 'shopping_list_update',
        action: 'committed',
        houseId,
        editorUserId,
      });

      res.json({
        success: true,
        notifiedUsers: recipients.length,
      });
    } catch (error) {
      console.error('Error committing shopping list changes:', error);
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
