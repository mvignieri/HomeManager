import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAppContext } from '@/context/app-context';
import { Mail, CheckCircle, XCircle, Home as HomeIcon } from 'lucide-react';
import Navbar from '@/components/layout/navbar';
import Sidebar from '@/components/layout/sidebar';
import { useToast } from '@/hooks/use-toast';
import { useLocation } from 'wouter';
import BottomNav from '@/components/layout/bottom-nav';

export default function InvitationsPage() {
  const { user: firebaseUser } = useAppContext();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [, setLocation] = useLocation();

  // Get current user from database
  const { data: dbUser } = useQuery({
    queryKey: ['/api/users/me', firebaseUser?.uid],
    queryFn: async () => {
      if (!firebaseUser) return null;
      const res = await fetch('/api/users');
      if (!res.ok) throw new Error('Failed to fetch users');
      const users = await res.json();
      return users.find((u: any) => u.uid === firebaseUser.uid);
    },
    enabled: !!firebaseUser,
  });

  // Get all houses to fetch invitations from
  const { data: allHouses = [] } = useQuery({
    queryKey: ['/api/houses'],
    enabled: !!dbUser,
  });

  // Get all invitations for this user
  const { data: invitations = [], isLoading } = useQuery({
    queryKey: ['/api/invitations/all', dbUser?.email],
    queryFn: async () => {
      if (!dbUser) return [];

      // Fetch invitations from all houses
      const allInvites = await Promise.all(
        allHouses.map(async (house: any) => {
          try {
            const res = await fetch(`/api/houses/${house.id}/invitations`);
            if (!res.ok) return [];
            const invites = await res.json();
            return invites.map((inv: any) => ({ ...inv, houseName: house.name }));
          } catch {
            return [];
          }
        })
      );

      const flat = allInvites.flat();
      return flat.filter((inv: any) => inv.email === dbUser.email);
    },
    enabled: !!dbUser && allHouses.length > 0,
  });

  const acceptInvitationMutation = useMutation({
    mutationFn: async (invitation: any) => {
      const res = await fetch(`/api/invitations/${invitation.token}/accept`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: dbUser?.id }),
      });
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || 'Failed to accept invitation');
      }
      return res.json();
    },
    onSuccess: (data, invitation) => {
      toast({
        title: 'Invitation Accepted',
        description: `You've successfully joined ${invitation.houseName}!`,
      });
      queryClient.invalidateQueries({ queryKey: ['/api/invitations/all'] });
      queryClient.invalidateQueries({ queryKey: ['/api/houses'] });
      // Redirect to home after a short delay
      setTimeout(() => {
        setLocation('/');
      }, 1500);
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to accept invitation',
        variant: 'destructive',
      });
    },
  });

  const declineInvitationMutation = useMutation({
    mutationFn: async (invitationId: number) => {
      const res = await fetch(`/api/invitations/${invitationId}`, {
        method: 'DELETE',
      });
      if (!res.ok) throw new Error('Failed to decline invitation');
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: 'Invitation Declined',
        description: 'The invitation has been declined',
      });
      queryClient.invalidateQueries({ queryKey: ['/api/invitations/all'] });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to decline invitation',
        variant: 'destructive',
      });
    },
  });

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

  const pendingInvitations = invitations.filter((inv: any) => inv.status === 'pending');
  const otherInvitations = invitations.filter((inv: any) => inv.status !== 'pending');

  if (isLoading) {
    return (
      <div className="flex flex-col h-screen bg-gray-50">
        <Navbar title="My Invitations" />
        <Sidebar />
        <div className="flex-1 flex items-center justify-center md:ml-64">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      <Navbar title="My Invitations" />
      <Sidebar />

      <main className="flex-1 overflow-y-auto p-4 space-y-4 pb-24 md:pb-4 md:ml-64">
        {/* Pending Invitations */}
        {pendingInvitations.length > 0 ? (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Mail className="h-5 w-5" />
                Pending Invitations
              </CardTitle>
              <CardDescription>
                You have {pendingInvitations.length} pending invitation{pendingInvitations.length !== 1 ? 's' : ''}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {pendingInvitations.map((invitation: any) => (
                <Card key={invitation.id} className="border">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-3">
                          <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                            <HomeIcon className="h-6 w-6 text-primary" />
                          </div>
                          <div>
                            <h4 className="font-semibold text-lg">{invitation.houseName}</h4>
                            <p className="text-sm text-gray-500">
                              Invited {new Date(invitation.createdAt).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 mb-3">
                          <span className="text-sm text-gray-600">Role:</span>
                          {getRoleBadge(invitation.role)}
                        </div>
                        <div className="text-xs text-gray-500">
                          Expires: {new Date(invitation.expiresAt).toLocaleDateString()}
                        </div>
                      </div>
                      <div className="flex flex-col gap-2">
                        <Button
                          size="sm"
                          onClick={() => acceptInvitationMutation.mutate(invitation)}
                          disabled={acceptInvitationMutation.isPending}
                        >
                          <CheckCircle className="h-4 w-4 mr-2" />
                          Accept
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => declineInvitationMutation.mutate(invitation.id)}
                          disabled={declineInvitationMutation.isPending}
                        >
                          <XCircle className="h-4 w-4 mr-2" />
                          Decline
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent className="py-12">
              <div className="text-center">
                <Mail className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                <h3 className="text-lg font-semibold mb-2">No Pending Invitations</h3>
                <p className="text-sm text-gray-500">
                  You don't have any pending invitations at the moment.
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* History */}
        {otherInvitations.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Invitation History</CardTitle>
              <CardDescription>
                Previously accepted or expired invitations
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {otherInvitations.map((invitation: any) => (
                <Card key={invitation.id} className="border bg-gray-50">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-medium">{invitation.houseName}</h4>
                        <p className="text-sm text-gray-500">
                          {new Date(invitation.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        {getRoleBadge(invitation.role)}
                        {getStatusBadge(invitation.status)}
                      </div>
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
