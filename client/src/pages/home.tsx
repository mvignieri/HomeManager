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
  BellRing, MoreVertical, Plus 
} from 'lucide-react';

export default function HomePage() {
  const [currentDate] = useState(new Date());
  
  // Mock data for the dashboard (will be replaced with real data)
  const taskStats = {
    today: 3,
    assigned: 5,
    completed: 2,
    totalTasks: 10
  };
  
  const priorityTasks = [
    { id: 1, title: 'Fix kitchen sink', priority: 'high', dueDate: new Date(), assignee: 'John' },
    { id: 2, title: 'Change living room light bulbs', priority: 'medium', dueDate: new Date(), assignee: null },
    { id: 3, title: 'Clean air filters', priority: 'high', dueDate: new Date(Date.now() + 86400000), assignee: 'Sarah' }
  ];
  
  const devices = [
    { id: 1, name: 'Thermostat', type: 'thermostat', status: 'active', value: 22 },
    { id: 2, name: 'Living Room', type: 'light', status: 'inactive' }
  ];
  
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

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 px-4 py-3 shadow-sm">
        <div className="flex justify-between items-center">
          <h1 className="text-xl font-bold text-gray-900">HomeTask</h1>
          <div className="flex items-center gap-3">
            <BellRing className="h-5 w-5 text-gray-500" />
            <div className="h-8 w-8 rounded-full bg-indigo-600 flex items-center justify-center text-white font-medium">
              DU
            </div>
          </div>
        </div>
      </header>
      
      <main className="flex-grow overflow-y-auto px-4 py-6 space-y-6 pb-20">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-gray-900">Dashboard</h2>
            <p className="text-sm text-gray-500">
              {format(currentDate, 'EEEE, MMMM d, yyyy')}
            </p>
          </div>
          <Button className="flex items-center gap-1">
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
                      {Math.round((taskStats.completed / taskStats.totalTasks) * 100)}%
                    </span>
                  </div>
                  <Progress value={(taskStats.completed / taskStats.totalTasks) * 100} />
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
                {priorityTasks.map(task => (
                  <div key={task.id} className="border border-gray-100 rounded-lg p-3 shadow-sm">
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className="text-sm font-medium">{task.title}</h4>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge variant={getPriorityColor(task.priority)} className="text-xs">
                            {task.priority}
                          </Badge>
                          <span className="text-xs text-gray-500">
                            {format(task.dueDate, 'MMM d')}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center">
                        {task.assignee ? (
                          <div className="text-xs text-gray-500 px-2 py-1 bg-gray-100 rounded">
                            {task.assignee}
                          </div>
                        ) : (
                          <Button variant="outline" size="sm" className="text-xs">
                            Assign
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
                
                <Button variant="ghost" className="w-full text-sm text-gray-600">
                  View All Tasks
                </Button>
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
              <div className="grid grid-cols-2 gap-4">
                {devices.map(device => (
                  <div key={device.id} className="bg-gray-50 p-3 rounded-lg">
                    <div className="flex items-center justify-between">
                      <div>
                        {device.type === 'thermostat' ? (
                          <ThermometerSun className="h-5 w-5 text-amber-500" />
                        ) : (
                          <Lightbulb className="h-5 w-5 text-yellow-500" />
                        )}
                        <h4 className="text-sm font-medium mt-1">{device.name}</h4>
                      </div>
                      
                      {device.type === 'thermostat' ? (
                        <div className="text-right">
                          <div className="text-xl font-bold">{device.value}°C</div>
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
      
      <footer className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 px-4 py-2 flex justify-around">
        <Link href="/">
          <Button variant="ghost" className="flex flex-col items-center h-14 w-16 rounded-lg text-primary">
            <Home className="h-5 w-5" />
            <span className="text-xs mt-1">Home</span>
          </Button>
        </Link>
        <Link href="/calendar">
          <Button variant="ghost" className="flex flex-col items-center h-14 w-16 rounded-lg">
            <Calendar className="h-5 w-5" />
            <span className="text-xs mt-1">Calendar</span>
          </Button>
        </Link>
        <Link href="/tasks">
          <Button variant="ghost" className="flex flex-col items-center h-14 w-16 rounded-lg">
            <CheckCircle2 className="h-5 w-5" />
            <span className="text-xs mt-1">Tasks</span>
          </Button>
        </Link>
        <Link href="/smart-home">
          <Button variant="ghost" className="flex flex-col items-center h-14 w-16 rounded-lg">
            <Laptop className="h-5 w-5" />
            <span className="text-xs mt-1">Devices</span>
          </Button>
        </Link>
        <Link href="/analytics">
          <Button variant="ghost" className="flex flex-col items-center h-14 w-16 rounded-lg">
            <BarChart3 className="h-5 w-5" />
            <span className="text-xs mt-1">Analytics</span>
          </Button>
        </Link>
      </footer>
    </div>
  );
}
