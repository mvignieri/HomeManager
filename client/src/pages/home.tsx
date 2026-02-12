import React, { useState } from 'react';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Link } from 'wouter';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Switch } from '@/components/ui/switch';
import {
  Home, Calendar, Laptop, BarChart3, CheckCircle2,
  Clock, AlertCircle, ThermometerSun, Lightbulb,
  MoreVertical, Plus
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import type { User } from '@shared/schema';
import TaskModal from '@/components/tasks/task-modal';
import { useAppContext } from '@/context/app-context';
import Navbar from '@/components/layout/navbar';
import BottomNav from '@/components/layout/bottom-nav';
import Sidebar from '@/components/layout/sidebar';
import { useTasks } from '@/hooks/use-tasks';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

export default function HomePage() {
  const [currentDate] = useState(new Date());
  const [taskModalOpen, setTaskModalOpen] = useState(false);
  const [assignDialogOpen, setAssignDialogOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<any>(null);
  const [selectedUserId, setSelectedUserId] = useState<string>('');
  const { currentHouse } = useAppContext();
  const { assignTask, isAssigning } = useTasks();

  // Get all users for task assignment
  const { data: allUsers = [] } = useQuery<User[]>({
    queryKey: ['/api/users'],
  });

  // Get real tasks from database
  const { data: tasks = [] } = useQuery<any[]>({
    queryKey: ['/api/tasks', currentHouse?.id],
    queryFn: async () => {
      if (!currentHouse?.id) return [];
      const res = await fetch(`/api/tasks?houseId=${currentHouse.id}`);
      if (!res.ok) throw new Error('Failed to fetch tasks');
      return res.json();
    },
    enabled: !!currentHouse,
  });

  // Get real devices from database
  const { data: devices = [] } = useQuery<any[]>({
    queryKey: ['/api/devices', currentHouse?.id],
    queryFn: async () => {
      if (!currentHouse?.id) return [];
      const res = await fetch(`/api/devices?houseId=${currentHouse.id}`);
      if (!res.ok) throw new Error('Failed to fetch devices');
      return res.json();
    },
    enabled: !!currentHouse,
  });

  // Calculate real task stats
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const taskStats = {
    today: tasks.filter(t => {
      if (!t.dueDate) return false;
      const dueDate = new Date(t.dueDate);
      dueDate.setHours(0, 0, 0, 0);
      return dueDate.getTime() === today.getTime();
    }).length,
    assigned: tasks.filter(t => t.status === 'assigned').length,
    completed: tasks.filter(t => t.status === 'completed').length,
    totalTasks: tasks.length
  };

  // Get priority tasks (high priority, not completed, sorted by due date)
  const priorityTasks = tasks
    .filter(t => t.priority === 'high' && t.status !== 'completed')
    .sort((a, b) => {
      if (!a.dueDate) return 1;
      if (!b.dueDate) return -1;
      return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
    })
    .slice(0, 3);
  
  // Helper function to get priority color
  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'destructive';
      case 'medium': return 'default';
      case 'low': return 'secondary';
      default: return 'secondary';
    }
  };
  
  // Helper function to toggle device status
  const toggleDeviceStatus = (id: number) => {
    console.log(`Toggle device ${id}`);
    // This will be implemented with real data later
  };

  // Handle task assignment
  const handleOpenAssignDialog = (task: any) => {
    setSelectedTask(task);
    setSelectedUserId('');
    setAssignDialogOpen(true);
  };

  const handleAssignTask = () => {
    if (selectedTask && selectedUserId) {
      assignTask({ id: selectedTask.id, userId: parseInt(selectedUserId) });
      setAssignDialogOpen(false);
      setSelectedTask(null);
      setSelectedUserId('');
    }
  };

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      <Navbar title="Dashboard" />
      <Sidebar />

      <main className="flex-grow overflow-y-auto px-4 py-6 space-y-6 pb-20 md:ml-64 md:pb-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-500">
              {format(currentDate, 'EEEE, MMMM d, yyyy')}
            </p>
          </div>
          <Button className="flex items-center gap-1" onClick={() => setTaskModalOpen(true)}>
            <Plus className="h-4 w-4" />
            New Task
          </Button>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Tasks Overview */}
          <Card className="shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg font-semibold">Tasks Overview</CardTitle>
              <CardDescription>Your task completion this week</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid grid-cols-3 gap-4">
                  <div className="bg-blue-50 p-4 rounded-lg text-center">
                    <Clock className="h-5 w-5 text-blue-500 mx-auto mb-1" />
                    <div className="text-2xl font-bold text-blue-600">{taskStats.today}</div>
                    <div className="text-xs text-gray-600">Due Today</div>
                  </div>
                  <div className="bg-amber-50 p-4 rounded-lg text-center">
                    <AlertCircle className="h-5 w-5 text-amber-500 mx-auto mb-1" />
                    <div className="text-2xl font-bold text-amber-600">{taskStats.assigned}</div>
                    <div className="text-xs text-gray-600">Assigned</div>
                  </div>
                  <div className="bg-green-50 p-4 rounded-lg text-center">
                    <CheckCircle2 className="h-5 w-5 text-green-500 mx-auto mb-1" />
                    <div className="text-2xl font-bold text-green-600">{taskStats.completed}</div>
                    <div className="text-xs text-gray-600">Completed</div>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Progress</span>
                    <span className="text-sm font-medium">
                      {taskStats.totalTasks > 0 ? Math.round((taskStats.completed / taskStats.totalTasks) * 100) : 0}%
                    </span>
                  </div>
                  <Progress value={taskStats.totalTasks > 0 ? (taskStats.completed / taskStats.totalTasks) * 100 : 0} />
                </div>
              </div>
            </CardContent>
          </Card>
          
          {/* Priority Tasks */}
          <Card className="shadow-sm">
            <CardHeader className="pb-2">
              <div className="flex justify-between">
                <div>
                  <CardTitle className="text-lg font-semibold">Priority Tasks</CardTitle>
                  <CardDescription>Tasks that need attention</CardDescription>
                </div>
                <Button variant="ghost" size="icon">
                  <MoreVertical className="h-5 w-5" />
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {priorityTasks.length > 0 ? (
                  <>
                    {priorityTasks.map(task => {
                      const assignedUser = allUsers.find(u => u.id === task.assignedToId);
                      return (
                        <div key={task.id} className="border border-gray-100 rounded-lg p-3 shadow-sm">
                          <div className="flex justify-between items-start">
                            <div>
                              <h4 className="text-sm font-medium">{task.title}</h4>
                              <div className="flex items-center gap-2 mt-1">
                                <Badge variant={getPriorityColor(task.priority)} className="text-xs">
                                  {task.priority}
                                </Badge>
                                {task.dueDate && (
                                  <span className="text-xs text-gray-500">
                                    {format(new Date(task.dueDate), 'MMM d')}
                                  </span>
                                )}
                              </div>
                            </div>
                            <div className="flex items-center">
                              {assignedUser ? (
                                <div className="text-xs text-gray-500 px-2 py-1 bg-gray-100 rounded">
                                  {assignedUser.displayName || assignedUser.email}
                                </div>
                              ) : (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="text-xs"
                                  onClick={() => handleOpenAssignDialog(task)}
                                >
                                  Assign
                                </Button>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}

                    <Link href="/tasks">
                      <Button variant="ghost" className="w-full text-sm text-gray-600">
                        View All Tasks
                      </Button>
                    </Link>
                  </>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    <p className="text-sm">No priority tasks</p>
                    <Button className="mt-2" size="sm" onClick={() => setTaskModalOpen(true)}>
                      Create First Task
                    </Button>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
          
          {/* Smart Home */}
          <Card className="shadow-sm">
            <CardHeader className="pb-2">
              <div className="flex justify-between">
                <div>
                  <CardTitle className="text-lg font-semibold">Smart Home</CardTitle>
                  <CardDescription>Control your smart devices</CardDescription>
                </div>
                <Link href="/smart-home">
                  <Button variant="ghost" size="sm">View All</Button>
                </Link>
              </div>
            </CardHeader>
            <CardContent>
              {devices.length > 0 ? (
                <div className="grid grid-cols-2 gap-4">
                  {devices.slice(0, 4).map(device => (
                    <div key={device.id} className="bg-gray-50 p-3 rounded-lg">
                      <div className="flex items-center justify-between">
                        <div>
                          {device.type === 'thermostat' ? (
                            <ThermometerSun className="h-5 w-5 text-amber-500" />
                          ) : device.type === 'light' ? (
                            <Lightbulb className="h-5 w-5 text-yellow-500" />
                          ) : (
                            <Laptop className="h-5 w-5 text-blue-500" />
                          )}
                          <h4 className="text-sm font-medium mt-1">{device.name}</h4>
                        </div>

                        {device.type === 'thermostat' && device.data?.temperature ? (
                          <div className="text-right">
                            <div className="text-xl font-bold">{device.data.temperature}°C</div>
                            <Badge className="text-xs" variant={device.status === 'active' ? 'default' : 'secondary'}>
                              {device.status === 'active' ? 'Active' : 'Inactive'}
                            </Badge>
                          </div>
                        ) : (
                          <Switch
                            checked={device.status === 'active'}
                            onCheckedChange={() => toggleDeviceStatus(device.id)}
                          />
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <p className="text-sm">No devices configured</p>
                </div>
              )}
            </CardContent>
          </Card>
          
          {/* Analytics Snapshot */}
          <Card className="shadow-sm">
            <CardHeader className="pb-2">
              <div className="flex justify-between">
                <div>
                  <CardTitle className="text-lg font-semibold">Analytics</CardTitle>
                  <CardDescription>Task completion statistics</CardDescription>
                </div>
                <Link href="/analytics">
                  <Button variant="ghost" size="sm">View Details</Button>
                </Link>
              </div>
            </CardHeader>
            <CardContent>
              <div className="h-[150px] bg-gray-50 rounded-lg flex items-center justify-center">
                <p className="text-gray-500">Analytics chart will appear here</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>

      <BottomNav />

      <TaskModal
        open={taskModalOpen}
        onOpenChange={setTaskModalOpen}
        task={undefined}
        users={allUsers}
      />

      <Dialog open={assignDialogOpen} onOpenChange={setAssignDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Assign Task</DialogTitle>
            <DialogDescription>
              Select a user to assign this task to: {selectedTask?.title}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <Select value={selectedUserId} onValueChange={setSelectedUserId}>
              <SelectTrigger>
                <SelectValue placeholder="Select a user" />
              </SelectTrigger>
              <SelectContent>
                {allUsers.map((user) => (
                  <SelectItem key={user.id} value={user.id.toString()}>
                    {user.displayName || user.email}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAssignDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleAssignTask} disabled={!selectedUserId || isAssigning}>
              {isAssigning ? 'Assigning...' : 'Assign'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
