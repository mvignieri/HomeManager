import React from 'react';
import Navbar from '@/components/layout/navbar';
import BottomNav from '@/components/layout/bottom-nav';
import TaskList from '@/components/tasks/task-list';
import { useQuery } from '@tanstack/react-query';
import { User } from '@shared/schema';

export default function TasksPage() {
  // Get house members
  const { data: users = [], isLoading } = useQuery<User[]>({
    queryKey: ['/api/users'],
  });
  
  if (isLoading) {
    return (
      <div className="flex flex-col h-screen">
        <Navbar title="Tasks" />
        <main className="flex-grow flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
        </main>
        <BottomNav />
      </div>
    );
  }
  
  return (
    <div className="flex flex-col h-screen">
      <Navbar title="Task Management" />
      
      <main className="flex-grow overflow-y-auto pb-20">
        <section className="p-4">
          <TaskList users={users} />
        </section>
      </main>
      
      <BottomNav />
    </div>
  );
}
