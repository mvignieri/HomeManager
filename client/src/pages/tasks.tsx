import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { 
  Select, 
  SelectTrigger, 
  SelectValue, 
  SelectContent, 
  SelectItem 
} from '@/components/ui/select';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Link } from 'wouter';
import { 
  Home, Calendar, Laptop, BarChart3, 
  Plus, Search, Filter, SlidersHorizontal,
  CheckCircle2, Clock, ListFilter, Tag,
  User, UserPlus, MoreVertical, Edit, Trash2
} from 'lucide-react';

export default function TasksPage() {
  // State for task management
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState('all');
  const [activePriority, setActivePriority] = useState('all');
  
  // Mock tasks data (will be replaced with real data)
  const mockTasks = [
    { 
      id: 1, 
      title: 'Fix kitchen sink', 
      priority: 'high', 
      dueDate: new Date().toISOString(), 
      status: 'created',
      assignee: 'John',
      description: 'The kitchen sink is leaking, needs immediate attention'
    },
    { 
      id: 2, 
      title: 'Change living room light bulbs', 
      priority: 'medium', 
      dueDate: new Date().toISOString(), 
      status: 'assigned',
      assignee: null,
      description: 'Replace all the bulbs in the living room ceiling light'
    },
    { 
      id: 3, 
      title: 'Clean air filters', 
      dueDate: new Date(Date.now() + 86400000).toISOString(), 
      priority: 'high', 
      status: 'created',
      assignee: 'Sarah',
      description: 'Clean all air filters in the HVAC system'
    },
    { 
      id: 4, 
      title: 'Restock cleaning supplies', 
      priority: 'low', 
      dueDate: new Date(Date.now() + 86400000 * 2).toISOString(), 
      status: 'created',
      assignee: null,
      description: 'We need more cleaning supplies: paper towels, disinfectant, etc.'
    },
    { 
      id: 5, 
      title: 'Set up new smart thermostat', 
      priority: 'medium', 
      dueDate: new Date(Date.now() + 86400000 * 3).toISOString(), 
      status: 'completed',
      assignee: 'John',
      description: 'Install and configure the new Nest thermostat in the living room'
    }
  ];
  
  // Filter tasks based on criteria
  const filteredTasks = mockTasks.filter(task => {
    // Search query filter
    if (searchQuery && !task.title.toLowerCase().includes(searchQuery.toLowerCase())) {
      return false;
    }
    
    // Status filter
    if (activeFilter !== 'all' && task.status !== activeFilter) {
      return false;
    }
    
    // Priority filter
    if (activePriority !== 'all' && task.priority !== activePriority) {
      return false;
    }
    
    return true;
  });
  
  // Helper function to get priority color
  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'destructive';
      case 'medium': return 'default';
      case 'low': return 'secondary';
      default: return 'secondary';
    }
  };
  
  // Helper function to get status badge
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed': 
        return <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">Completed</Badge>;
      case 'assigned': 
        return <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">Assigned</Badge>;
      case 'created': 
        return <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">Open</Badge>;
      default: 
        return <Badge variant="outline">Unknown</Badge>;
    }
  };
  
  // Function to toggle task completion
  const toggleTaskCompletion = (id: number) => {
    console.log(`Toggle completion for task ${id}`);
    // This would update the actual data in a real implementation
  };

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 px-4 py-3 shadow-sm">
        <div className="flex justify-between items-center">
          <h1 className="text-xl font-bold text-gray-900">Tasks</h1>
          <Button className="flex items-center gap-1">
            <Plus className="h-4 w-4" />
            New Task
          </Button>
        </div>
      </header>
      
      <div className="bg-white px-4 py-3 border-b border-gray-100">
        <div className="flex items-center gap-2">
          <div className="relative flex-grow">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input 
              placeholder="Search tasks..." 
              className="pl-9"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <Button variant="outline" size="icon">
            <SlidersHorizontal className="h-4 w-4" />
          </Button>
        </div>
        
        <div className="flex items-center mt-3 space-x-2 overflow-x-auto pb-1">
          <Button 
            variant={activeFilter === 'all' ? 'default' : 'outline'} 
            size="sm"
            onClick={() => setActiveFilter('all')}
          >
            All
          </Button>
          <Button 
            variant={activeFilter === 'created' ? 'default' : 'outline'} 
            size="sm"
            onClick={() => setActiveFilter('created')}
          >
            Open
          </Button>
          <Button 
            variant={activeFilter === 'assigned' ? 'default' : 'outline'} 
            size="sm"
            onClick={() => setActiveFilter('assigned')}
          >
            Assigned
          </Button>
          <Button 
            variant={activeFilter === 'completed' ? 'default' : 'outline'} 
            size="sm"
            onClick={() => setActiveFilter('completed')}
          >
            Completed
          </Button>
        </div>
        
        <div className="flex items-center mt-3 space-x-2 overflow-x-auto pb-1">
          <div className="flex items-center mr-1">
            <Tag className="h-4 w-4 mr-1 text-gray-400" />
            <span className="text-sm text-gray-500">Priority:</span>
          </div>
          <Button 
            variant={activePriority === 'all' ? 'default' : 'outline'} 
            size="sm"
            onClick={() => setActivePriority('all')}
            className="px-2 h-7"
          >
            All
          </Button>
          <Button 
            variant={activePriority === 'high' ? 'default' : 'outline'} 
            size="sm"
            onClick={() => setActivePriority('high')}
            className="px-2 h-7"
          >
            High
          </Button>
          <Button 
            variant={activePriority === 'medium' ? 'default' : 'outline'} 
            size="sm"
            onClick={() => setActivePriority('medium')}
            className="px-2 h-7"
          >
            Medium
          </Button>
          <Button 
            variant={activePriority === 'low' ? 'default' : 'outline'} 
            size="sm"
            onClick={() => setActivePriority('low')}
            className="px-2 h-7"
          >
            Low
          </Button>
        </div>
      </div>
      
      <main className="flex-grow overflow-y-auto pb-20 px-4 py-4 space-y-3">
        {filteredTasks.length > 0 ? (
          filteredTasks.map(task => (
            <div key={task.id} className="bg-white rounded-lg shadow-sm border border-gray-100 p-4">
              <div className="flex items-start">
                <Checkbox 
                  id={`task-${task.id}`}
                  className="mt-1 h-5 w-5"
                  checked={task.status === 'completed'}
                  onCheckedChange={() => toggleTaskCompletion(task.id)}
                />
                <div className="ml-3 flex-grow">
                  <div className="flex justify-between">
                    <h3 className={`font-medium ${task.status === 'completed' ? 'line-through text-gray-500' : 'text-gray-900'}`}>
                      {task.title}
                    </h3>
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </div>
                  <p className="text-sm text-gray-500 mt-1 line-clamp-2">{task.description}</p>
                  <div className="flex flex-wrap gap-2 mt-2">
                    <Badge variant={getPriorityColor(task.priority)} className="text-xs">
                      {task.priority}
                    </Badge>
                    {getStatusBadge(task.status)}
                    <div className="flex items-center text-xs text-gray-500">
                      <Clock className="h-3 w-3 mr-1" />
                      {new Date(task.dueDate).toLocaleDateString()}
                    </div>
                    {task.assignee && (
                      <div className="flex items-center text-xs text-gray-500">
                        <User className="h-3 w-3 mr-1" />
                        {task.assignee}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="bg-white rounded-lg shadow-sm p-8 text-center">
            <ListFilter className="h-10 w-10 text-gray-400 mx-auto mb-2" />
            <h3 className="text-lg font-medium text-gray-600">No tasks found</h3>
            <p className="text-gray-500 mt-1">Try changing your filters or create a new task</p>
            <Button className="mt-4">
              New Task
            </Button>
          </div>
        )}
      </main>
      
      <footer className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 px-4 py-2 flex justify-around">
        <Link href="/">
          <Button variant="ghost" className="flex flex-col items-center h-14 w-16 rounded-lg">
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