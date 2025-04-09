import React, { useState } from 'react';
import { format } from 'date-fns';
import Navbar from '@/components/layout/navbar';
import BottomNav from '@/components/layout/bottom-nav';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useTasks } from '@/hooks/use-tasks';
import { useSmartHome } from '@/hooks/use-smart-home';
import TaskCard from '@/components/tasks/task-card';
import { Switch } from '@/components/ui/switch';
import { useQuery } from '@tanstack/react-query';
import { User } from '@shared/schema';

export default function HomePage() {
  const { tasks } = useTasks();
  const { devices, toggleDeviceStatus, temperature, boilerActive } = useSmartHome();
  const [currentDate] = useState(new Date());
  
  // Get house members
  const { data: users = [] } = useQuery<User[]>({
    queryKey: ['/api/users'],
  });
  
  // Dashboard stats
  const tasksToday = tasks.filter(task => {
    if (!task.dueDate) return false;
    const dueDate = new Date(task.dueDate);
    return (
      dueDate.getDate() === currentDate.getDate() &&
      dueDate.getMonth() === currentDate.getMonth() &&
      dueDate.getFullYear() === currentDate.getFullYear()
    );
  });
  
  const tasksAssigned = tasks.filter(task => task.status === 'assigned');
  const tasksCompleted = tasks.filter(task => task.status === 'completed');
  
  // Priority tasks (high and medium priority, sorted by priority)
  const priorityTasks = tasks
    .filter(task => task.priority === 'high' || task.priority === 'medium')
    .sort((a, b) => {
      const priorityOrder: Record<string, number> = { high: 0, medium: 1, low: 2 };
      return priorityOrder[a.priority] - priorityOrder[b.priority];
    })
    .slice(0, 3); // Take top 3

  return (
    <div className="flex flex-col h-screen">
      <Navbar />
      
      <main className="flex-grow overflow-y-auto pb-20">
        <section className="p-4 space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-gray-800">Dashboard</h2>
            <span className="text-sm text-gray-500">
              {format(currentDate, 'EEEE, MMMM d')}
            </span>
          </div>
          
          <Card className="bg-white rounded-xl shadow-sm border border-gray-100">
            <CardContent className="p-4">
              <h3 className="font-medium text-gray-700 mb-4">Today's Overview</h3>
              <div className="grid grid-cols-3 gap-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-primary">{tasksToday.length}</div>
                  <div className="text-xs text-gray-500">Tasks Today</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-500">{tasksAssigned.length}</div>
                  <div className="text-xs text-gray-500">Assigned to You</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-500">{tasksCompleted.length}</div>
                  <div className="text-xs text-gray-500">Completed</div>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <div className="space-y-4">
            <h3 className="font-medium text-gray-700">Priority Tasks</h3>
            
            {priorityTasks.length === 0 ? (
              <div className="bg-white rounded-lg shadow-sm p-8 text-center">
                <span className="material-icons text-gray-400 text-4xl mb-2">task_alt</span>
                <h3 className="text-lg font-medium text-gray-600">No priority tasks</h3>
                <p className="text-gray-500 mt-1">You're all caught up!</p>
              </div>
            ) : (
              priorityTasks.map(task => (
                <TaskCard key={task.id} task={task} users={users} showCheckbox={false} />
              ))
            )}
          </div>
          
          <Card className="bg-white rounded-xl shadow-sm border border-gray-100">
            <CardContent className="p-4">
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-medium text-gray-700">Smart Home</h3>
                <Button variant="link" className="text-sm text-primary font-medium p-0">
                  View All
                </Button>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-gray-50 p-3 rounded-lg">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="material-icons text-amber-500">thermostat</span>
                      <h4 className="text-sm font-medium mt-1">Thermostat</h4>
                    </div>
                    <div className="text-right">
                      <div className="text-xl font-bold">{temperature}°C</div>
                      <Badge variant={boilerActive ? "success" : "secondary"} className="text-xs px-2 py-0.5">
                        {boilerActive ? 'Boiler Active' : 'Boiler Off'}
                      </Badge>
                    </div>
                  </div>
                </div>
                
                {devices.filter(d => d.type === 'light').slice(0, 1).map(device => (
                  <div key={device.id} className="bg-gray-50 p-3 rounded-lg">
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="material-icons text-primary">lightbulb</span>
                        <h4 className="text-sm font-medium mt-1">{device.name}</h4>
                      </div>
                      <Switch 
                        checked={device.status === 'active'} 
                        onCheckedChange={() => toggleDeviceStatus(device.id, device.status as any)}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </section>
      </main>
      
      <BottomNav />
    </div>
  );
}
