import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useAppContext } from '@/context/app-context';
import Navbar from '@/components/layout/navbar';
import Sidebar from '@/components/layout/sidebar';
import { User } from 'lucide-react';
import BottomNav from '@/components/layout/bottom-nav';

export default function ProfilePage() {
  const { user } = useAppContext();

  if (!user) {
    return (
      <div className="flex flex-col h-screen bg-gray-50">
        <Navbar title="Profile" />
        <Sidebar />
        <div className="flex-1 flex items-center justify-center p-4 md:ml-64">
          <p className="text-gray-500">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      <Navbar title="Profile" />
      <Sidebar />

      <main className="flex-1 overflow-y-auto p-4 space-y-4 pb-24 md:pb-4 md:ml-64">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-4">
              <img
                src={user.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.displayName || 'User')}`}
                alt="User profile"
                className="w-20 h-20 rounded-full"
              />
              <div>
                <CardTitle>{user.displayName || 'User'}</CardTitle>
                <CardDescription>{user.email}</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center justify-between py-2 border-b">
                <span className="text-sm text-gray-600">Display Name</span>
                <span className="text-sm font-medium">{user.displayName || 'Not set'}</span>
              </div>
              <div className="flex items-center justify-between py-2 border-b">
                <span className="text-sm text-gray-600">Email</span>
                <span className="text-sm font-medium">{user.email}</span>
              </div>
              <div className="flex items-center justify-between py-2">
                <span className="text-sm text-gray-600">User ID</span>
                <span className="text-sm font-medium text-gray-400">{user.uid.slice(0, 8)}...</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Account Information</CardTitle>
            <CardDescription>Your account details and settings</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-500">
              Profile management features coming soon...
            </p>
          </CardContent>
        </Card>
      </main>

      <BottomNav />
    </div>
  );
}
