import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from '@/components/ui/dialog';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAppContext } from '@/context/app-context';
import { Settings as SettingsIcon, Users, Shield, UserPlus, Home, Mail } from 'lucide-react';
import type { HouseMember, User } from '@shared/schema';
import Navbar from '@/components/layout/navbar';
import Sidebar from '@/components/layout/sidebar';
import { useToast } from '@/hooks/use-toast';
import BottomNav from '@/components/layout/bottom-nav';

export default function SettingsPage() {
  const { currentHouse, user: firebaseUser, setCurrentHouse } = useAppContext();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [editingMember, setEditingMember] = useState<HouseMember | null>(null);
  const [houseName, setHouseName] = useState(currentHouse?.name || '');
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<string>('member');
  const [showInviteDialog, setShowInviteDialog] = useState(false);
  const [showHouseSettingsDialog, setShowHouseSettingsDialog] = useState(false);

  // Get current user from database
  const { data: dbUser, isLoading: isLoadingUser } = useQuery({
    queryKey: ['/api/users/me', firebaseUser?.uid],
    queryFn: async () => {
      if (!firebaseUser) return null;
      const res = await fetch(`/api/users/me?uid=${firebaseUser.uid}`);
      if (!res.ok) {
        if (res.status === 404) return null;
        throw new Error('Failed to fetch current user');
      }
      return res.json();
    },
    enabled: !!firebaseUser,
    retry: 1,
  });

  // Get house members
  const { data: members = [], isLoading: isLoadingMembers } = useQuery<HouseMember[]>({
    queryKey: [`/api/houses/${currentHouse?.id}/members`],
    queryFn: async () => {
      if (!currentHouse) return [];
      console.log('Fetching members for house:', currentHouse.id);
      const res = await fetch(`/api/houses/${currentHouse.id}/members`);
      if (!res.ok) {
        console.error('Failed to fetch members:', res.status, res.statusText);
        throw new Error('Failed to fetch house members');
      }
      const data = await res.json();
      console.log('Members fetched:', data);
      return data;
    },
    enabled: !!currentHouse,
    staleTime: 0,
    refetchOnMount: true,
  });

  // Get all users for member info
  const { data: allUsers = [] } = useQuery<User[]>({
    queryKey: ['/api/users'],
  });

  // Get pending invitations
  const { data: invitations = [] } = useQuery({
    queryKey: [`/api/houses/${currentHouse?.id}/invitations`],
    queryFn: async () => {
      if (!currentHouse) return [];
      const res = await fetch(`/api/houses/${currentHouse.id}/invitations`);
      if (!res.ok) throw new Error('Failed to fetch invitations');
      return res.json();
    },
    enabled: !!currentHouse,
  });

  const currentMember = members.find((m) => m.userId === dbUser?.id);
  const isAdmin = currentMember?.role === 'owner' || currentMember?.role === 'admin';
  const isLoading = isLoadingUser || isLoadingMembers;

  // Debug logging
  React.useEffect(() => {
    console.log('Settings Debug:', {
      firebaseUser: firebaseUser?.email,
      dbUser: dbUser,
      currentHouse: currentHouse,
      members: members,
      currentMember: currentMember,
      isAdmin: isAdmin,
      isLoading: isLoading
    });
  }, [firebaseUser, dbUser, currentHouse, members, currentMember, isAdmin, isLoading]);

  // Sync houseName when currentHouse changes
  React.useEffect(() => {
    if (currentHouse) {
      setHouseName(currentHouse.name);
    }
  }, [currentHouse]);

  const updateMemberMutation = useMutation({
    mutationFn: async ({ memberId, updates }: { memberId: number; updates: Partial<HouseMember> }) => {
      const res = await fetch(`/api/houses/${currentHouse?.id}/members/${memberId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });
      if (!res.ok) throw new Error('Failed to update member');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/houses/${currentHouse?.id}/members`] });
      setEditingMember(null);
    },
  });

  const updateHouseMutation = useMutation({
    mutationFn: async (updates: { name: string }) => {
      const res = await fetch(`/api/houses/${currentHouse?.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });
      if (!res.ok) throw new Error('Failed to update house');
      return res.json();
    },
    onSuccess: (updatedHouse) => {
      toast({
        title: 'House Updated',
        description: 'House settings have been successfully updated',
      });
      queryClient.invalidateQueries({ queryKey: ['/api/houses'] });
      setCurrentHouse(updatedHouse);
      setShowHouseSettingsDialog(false);
    },
    onError: () => {
      toast({
        title: 'Error',
        description: 'Failed to update house settings',
        variant: 'destructive',
      });
    },
  });

  const inviteMemberMutation = useMutation({
    mutationFn: async ({ email, role }: { email: string; role: string }) => {
      // Check if user already exists
      const user = allUsers.find((u) => u.email === email);

      if (user) {
        // User exists - check if already a member
        const existingMember = members.find((m) => m.userId === user.id);
        if (existingMember) {
          throw new Error('User is already a member of this house');
        }

        // Add as house member directly
        const res = await fetch(`/api/houses/${currentHouse?.id}/members`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId: user.id, role }),
        });
        if (!res.ok) throw new Error('Failed to add member');
        return { type: 'direct', data: await res.json() };
      } else {
        // User doesn't exist - create invitation
        const res = await fetch(`/api/houses/${currentHouse?.id}/invitations`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email,
            role,
            invitedById: dbUser?.id,
          }),
        });
        if (!res.ok) {
          const errorData = await res.json();
          throw new Error(errorData.message || 'Failed to send invitation');
        }
        return { type: 'invitation', data: await res.json() };
      }
    },
    onSuccess: (result) => {
      if (result.type === 'direct') {
        toast({
          title: 'Member Added',
          description: 'The user has been successfully added to your house',
        });
      } else {
        toast({
          title: 'Invitation Sent',
          description: `An invitation has been sent to ${inviteEmail}. They will be added to your house once they accept.`,
        });
        console.log('Invite link:', result.data.inviteLink);
      }
      queryClient.invalidateQueries({ queryKey: [`/api/houses/${currentHouse?.id}/members`] });
      queryClient.invalidateQueries({ queryKey: [`/api/houses/${currentHouse?.id}/invitations`] });
      setShowInviteDialog(false);
      setInviteEmail('');
      setInviteRole('member');
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to invite member',
        variant: 'destructive',
      });
    },
  });

  const revokeInvitationMutation = useMutation({
    mutationFn: async (invitationId: number) => {
      const res = await fetch(`/api/invitations/${invitationId}`, {
        method: 'DELETE',
      });
      if (!res.ok) throw new Error('Failed to revoke invitation');
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: 'Invitation Revoked',
        description: 'The invitation has been successfully revoked',
      });
      queryClient.invalidateQueries({ queryKey: [`/api/houses/${currentHouse?.id}/invitations`] });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to revoke invitation',
        variant: 'destructive',
      });
    },
  });

  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'owner':
        return <Badge variant="default" className="bg-purple-100 text-purple-800">Owner</Badge>;
      case 'admin':
        return <Badge variant="default" className="bg-blue-100 text-blue-800">Admin</Badge>;
      case 'member':
        return <Badge variant="secondary">Member</Badge>;
      default:
        return <Badge variant="outline">{role}</Badge>;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">Pending</Badge>;
      case 'accepted':
        return <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">Accepted</Badge>;
      case 'expired':
        return <Badge variant="outline" className="bg-gray-50 text-gray-700 border-gray-200">Expired</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getUserInfo = (userId: number) => {
    return allUsers.find((u) => u.id === userId);
  };

  // Show loading state while checking permissions
  if (isLoading) {
    return (
      <div className="flex flex-col h-screen bg-gray-50">
        <Navbar title="Settings" />
        <Sidebar />
        <div className="flex-1 flex items-center justify-center p-4 md:ml-64">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
        </div>
      </div>
    );
  }

  // Check if user is admin (currentHouse is guaranteed by App.tsx gate)
  if (!isAdmin) {
    return (
      <div className="flex flex-col h-screen bg-gray-50">
        <Navbar title="Settings" />
        <Sidebar />
        <div className="flex-1 flex items-center justify-center p-4 md:ml-64">
          <Card className="max-w-md">
            <CardHeader>
              <Shield className="h-12 w-12 mx-auto mb-2 text-gray-400" />
              <CardTitle className="text-center">Admin Access Required</CardTitle>
              <CardDescription className="text-center">
                You need admin permissions to access this house settings.
              </CardDescription>
            </CardHeader>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      <Navbar title="Settings" />
      <Sidebar />

      <main className="flex-1 overflow-y-auto p-4 space-y-4 pb-24 md:pb-4 md:ml-64">
        {/* House Settings Section */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Home className="h-5 w-5" />
                  House Settings
                </CardTitle>
                <CardDescription>
                  Manage basic settings for your house
                </CardDescription>
              </div>
              <Dialog open={showHouseSettingsDialog} onOpenChange={setShowHouseSettingsDialog}>
                <DialogTrigger asChild>
                  <Button size="sm" variant="outline">
                    <SettingsIcon className="h-4 w-4 mr-2" />
                    Edit Settings
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>House Settings</DialogTitle>
                    <DialogDescription>
                      Update your house information
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="houseName">House Name</Label>
                      <Input
                        id="houseName"
                        value={houseName}
                        onChange={(e) => setHouseName(e.target.value)}
                        placeholder="Enter house name"
                      />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => {
                      setShowHouseSettingsDialog(false);
                      setHouseName(currentHouse?.name || '');
                    }}>
                      Cancel
                    </Button>
                    <Button
                      onClick={() => updateHouseMutation.mutate({ name: houseName })}
                      disabled={updateHouseMutation.isPending || !houseName.trim()}
                    >
                      {updateHouseMutation.isPending ? 'Saving...' : 'Save Changes'}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center justify-between py-2 border-b">
                <span className="text-sm text-gray-600">House Name</span>
                <span className="text-sm font-medium">{currentHouse?.name}</span>
              </div>
              <div className="flex items-center justify-between py-2 border-b">
                <span className="text-sm text-gray-600">Total Members</span>
                <span className="text-sm font-medium">{members.length}</span>
              </div>
              <div className="flex items-center justify-between py-2">
                <span className="text-sm text-gray-600">Your Role</span>
                {currentMember && getRoleBadge(currentMember.role)}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* House Members Section */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  House Members
                </CardTitle>
                <CardDescription>
                  Manage roles and permissions for {currentHouse?.name}
                </CardDescription>
              </div>
              <Dialog open={showInviteDialog} onOpenChange={setShowInviteDialog}>
                <DialogTrigger asChild>
                  <Button size="sm">
                    <UserPlus className="h-4 w-4 mr-2" />
                    Add Member
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Invite Member</DialogTitle>
                    <DialogDescription>
                      Add a new member to your house. If they don't have an account, they'll receive an invitation email.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="inviteEmail">Email Address</Label>
                      <div className="flex items-center gap-2">
                        <Mail className="h-4 w-4 text-gray-400" />
                        <Input
                          id="inviteEmail"
                          type="email"
                          value={inviteEmail}
                          onChange={(e) => setInviteEmail(e.target.value)}
                          placeholder="user@example.com"
                          className="flex-1"
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="inviteRole">Role</Label>
                      <Select value={inviteRole} onValueChange={setInviteRole}>
                        <SelectTrigger id="inviteRole">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="member">Member</SelectItem>
                          <SelectItem value="admin">Admin</SelectItem>
                          {currentMember?.role === 'owner' && (
                            <SelectItem value="owner">Owner</SelectItem>
                          )}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => {
                      setShowInviteDialog(false);
                      setInviteEmail('');
                      setInviteRole('member');
                    }}>
                      Cancel
                    </Button>
                    <Button
                      onClick={() => inviteMemberMutation.mutate({ email: inviteEmail, role: inviteRole })}
                      disabled={inviteMemberMutation.isPending || !inviteEmail.trim()}
                    >
                      {inviteMemberMutation.isPending ? 'Adding...' : 'Add Member'}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {members.map((member) => {
              const userInfo = getUserInfo(member.userId);
              const permissions = member.permissions as any || {};

              return (
                <Card key={member.id} className="border">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <img
                          src={userInfo?.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(userInfo?.displayName || 'User')}`}
                          alt={userInfo?.displayName || 'User'}
                          className="w-10 h-10 rounded-full"
                        />
                        <div>
                          <h4 className="font-medium">{userInfo?.displayName || 'Unknown User'}</h4>
                          <p className="text-sm text-gray-500">{userInfo?.email}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {getRoleBadge(member.role)}
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setEditingMember(member)}
                            >
                              <SettingsIcon className="h-4 w-4" />
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="max-w-md">
                            <DialogHeader>
                              <DialogTitle>Edit Permissions</DialogTitle>
                              <DialogDescription>
                                Manage role and permissions for {userInfo?.displayName}
                              </DialogDescription>
                            </DialogHeader>

                            <div className="space-y-4">
                              <div className="space-y-2">
                                <Label>Role</Label>
                                <Select
                                  defaultValue={member.role}
                                  onValueChange={(value) => {
                                    updateMemberMutation.mutate({
                                      memberId: member.id,
                                      updates: { role: value },
                                    });
                                  }}
                                >
                                  <SelectTrigger>
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="member">Member</SelectItem>
                                    <SelectItem value="admin">Admin</SelectItem>
                                    {currentMember?.role === 'owner' && (
                                      <SelectItem value="owner">Owner</SelectItem>
                                    )}
                                  </SelectContent>
                                </Select>
                              </div>

                              <div className="space-y-3">
                                <Label>Custom Permissions</Label>

                                <div className="flex items-center justify-between">
                                  <Label htmlFor="canCreateTasks" className="text-sm font-normal">
                                    Create Tasks
                                  </Label>
                                  <Switch
                                    id="canCreateTasks"
                                    checked={permissions.canCreateTasks !== false}
                                    onCheckedChange={(checked) => {
                                      updateMemberMutation.mutate({
                                        memberId: member.id,
                                        updates: {
                                          permissions: { ...permissions, canCreateTasks: checked },
                                        },
                                      });
                                    }}
                                  />
                                </div>

                                <div className="flex items-center justify-between">
                                  <Label htmlFor="canAssignTasks" className="text-sm font-normal">
                                    Assign Tasks
                                  </Label>
                                  <Switch
                                    id="canAssignTasks"
                                    checked={permissions.canAssignTasks !== false}
                                    onCheckedChange={(checked) => {
                                      updateMemberMutation.mutate({
                                        memberId: member.id,
                                        updates: {
                                          permissions: { ...permissions, canAssignTasks: checked },
                                        },
                                      });
                                    }}
                                  />
                                </div>

                                <div className="flex items-center justify-between">
                                  <Label htmlFor="canDeleteTasks" className="text-sm font-normal">
                                    Delete Tasks
                                  </Label>
                                  <Switch
                                    id="canDeleteTasks"
                                    checked={permissions.canDeleteTasks === true}
                                    onCheckedChange={(checked) => {
                                      updateMemberMutation.mutate({
                                        memberId: member.id,
                                        updates: {
                                          permissions: { ...permissions, canDeleteTasks: checked },
                                        },
                                      });
                                    }}
                                  />
                                </div>

                                <div className="flex items-center justify-between">
                                  <Label htmlFor="canManageDevices" className="text-sm font-normal">
                                    Manage Devices
                                  </Label>
                                  <Switch
                                    id="canManageDevices"
                                    checked={permissions.canManageDevices === true}
                                    onCheckedChange={(checked) => {
                                      updateMemberMutation.mutate({
                                        memberId: member.id,
                                        updates: {
                                          permissions: { ...permissions, canManageDevices: checked },
                                        },
                                      });
                                    }}
                                  />
                                </div>

                                <div className="flex items-center justify-between">
                                  <Label htmlFor="canManageUsers" className="text-sm font-normal">
                                    Manage Users
                                  </Label>
                                  <Switch
                                    id="canManageUsers"
                                    checked={permissions.canManageUsers === true}
                                    onCheckedChange={(checked) => {
                                      updateMemberMutation.mutate({
                                        memberId: member.id,
                                        updates: {
                                          permissions: { ...permissions, canManageUsers: checked },
                                        },
                                      });
                                    }}
                                  />
                                </div>
                              </div>
                            </div>

                            <DialogFooter>
                              <Button variant="outline" onClick={() => setEditingMember(null)}>
                                Close
                              </Button>
                            </DialogFooter>
                          </DialogContent>
                        </Dialog>
                      </div>
                    </div>

                    <div className="mt-3 flex flex-wrap gap-2 text-xs text-gray-600">
                      {permissions.canCreateTasks !== false && (
                        <Badge variant="outline" className="text-xs">Create Tasks</Badge>
                      )}
                      {permissions.canAssignTasks !== false && (
                        <Badge variant="outline" className="text-xs">Assign Tasks</Badge>
                      )}
                      {permissions.canDeleteTasks && (
                        <Badge variant="outline" className="text-xs">Delete Tasks</Badge>
                      )}
                      {permissions.canManageDevices && (
                        <Badge variant="outline" className="text-xs">Manage Devices</Badge>
                      )}
                      {permissions.canManageUsers && (
                        <Badge variant="outline" className="text-xs">Manage Users</Badge>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </CardContent>
        </Card>

        {/* Pending Invitations Section */}
        {invitations.filter((inv: any) => inv.status === 'pending').length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Mail className="h-5 w-5" />
                Pending Invitations
              </CardTitle>
              <CardDescription>
                Invitations sent that haven't been accepted yet
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {invitations
                .filter((inv: any) => inv.status === 'pending')
                .map((invitation: any) => (
                  <Card key={invitation.id} className="border">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center">
                              <Mail className="h-5 w-5 text-gray-500" />
                            </div>
                            <div>
                              <h4 className="font-medium">{invitation.email}</h4>
                              <p className="text-sm text-gray-500">
                                Invited {new Date(invitation.createdAt).toLocaleDateString()}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 mt-2">
                            {getRoleBadge(invitation.role)}
                            {getStatusBadge(invitation.status)}
                          </div>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => revokeInvitationMutation.mutate(invitation.id)}
                          disabled={revokeInvitationMutation.isPending}
                        >
                          {revokeInvitationMutation.isPending ? 'Revoking...' : 'Revoke'}
                        </Button>
                      </div>
                      <div className="mt-3 text-xs text-gray-500">
                        Expires: {new Date(invitation.expiresAt).toLocaleDateString()}
                      </div>
                    </CardContent>
                  </Card>
                ))}
            </CardContent>
          </Card>
        )}
      </main>

      <BottomNav />
    </div>
  );
}
