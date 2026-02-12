import React, { useState } from 'react';
import { format, addDays, isSameDay, parseISO, isToday } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { Link } from 'wouter';
import {
  Home, Calendar, Laptop, BarChart3,
  Plus, CheckCircle, ArrowLeft, ArrowRight,
  Clock, AlertCircle, CheckSquare as CheckCircle2
} from 'lucide-react';
import Sidebar from '@/components/layout/sidebar';
import BottomNav from '@/components/layout/bottom-nav';

export default function CalendarPage() {
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [currentView, setCurrentView] = useState<'calendar' | 'day'>('calendar');
  
  // Mock tasks data (will be replaced with real data)
  const mockTasks = [
    { 
      id: 1, 
      title: 'Fix kitchen sink', 
      priority: 'high', 
      dueDate: new Date().toISOString(), 
      status: 'created',
      assignee: 'John'
    },
    { 
      id: 2, 
      title: 'Change living room light bulbs', 
      priority: 'medium', 
      dueDate: new Date().toISOString(), 
      status: 'assigned',
      assignee: null
    },
    { 
      id: 3, 
      title: 'Clean air filters', 
      dueDate: new Date(Date.now() + 86400000).toISOString(), 
      priority: 'high', 
      status: 'created',
      assignee: 'Sarah'
    },
    { 
      id: 4, 
      title: 'Restock cleaning supplies', 
      priority: 'low', 
      dueDate: new Date(Date.now() + 86400000 * 2).toISOString(), 
      status: 'created',
      assignee: null
    },
    { 
      id: 5, 
      title: 'Set up new smart thermostat', 
      priority: 'medium', 
      dueDate: new Date(Date.now() + 86400000 * 3).toISOString(), 
      status: 'assigned',
      assignee: 'John'
    }
  ];
  
  // Function to get tasks for a specific date
  const getTasksByDay = (date: Date) => {
    return mockTasks.filter(task => 
      isSameDay(parseISO(task.dueDate), date)
    );
  };
  
  // Get tasks for the selected date
  const tasksForDay = selectedDate ? getTasksByDay(selectedDate) : [];
  
  // Function to handle clicking on a date
  const handleDateClick = (date: Date | undefined) => {
    setSelectedDate(date);
    if (date) {
      setCurrentView('day');
    }
  };
  
  // Create weekday labels
  const weekStart = addDays(new Date(), -1);
  const weekDays = Array.from({ length: 7 }).map((_, i) => {
    const day = addDays(weekStart, i);
    return format(day, 'E');
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
  
  // Helper function to get status color
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-500';
      case 'assigned': return 'bg-amber-500';
      case 'created': return 'bg-blue-500';
      default: return 'bg-gray-500';
    }
  };
  
  // Helper function to navigate to previous/next day
  const navigateDay = (direction: 'prev' | 'next') => {
    if (!selectedDate) return;
    
    const newDate = new Date(selectedDate);
    if (direction === 'prev') {
      newDate.setDate(newDate.getDate() - 1);
    } else {
      newDate.setDate(newDate.getDate() + 1);
    }
    setSelectedDate(newDate);
  };

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      <Sidebar />
      <header className="bg-white border-b border-gray-200 px-4 py-3 shadow-sm md:ml-64">
        <div className="flex justify-between items-center">
          <div className="flex items-center">
            {currentView === 'day' && (
              <Button 
                variant="ghost" 
                size="icon" 
                className="mr-2"
                onClick={() => setCurrentView('calendar')}
              >
                <ArrowLeft className="h-4 w-4" />
              </Button>
            )}
            <h1 className="text-xl font-bold text-gray-900">
              {currentView === 'calendar' ? 'Calendar' : format(selectedDate!, 'MMMM d, yyyy')}
            </h1>
          </div>
          <Button size="sm" variant="outline" className="flex items-center gap-1">
            <Plus className="h-4 w-4" />
            Add Task
          </Button>
        </div>
      </header>

      <main className="flex-grow overflow-y-auto pb-24 md:pb-6 px-4 py-6 md:ml-64">
        {currentView === 'calendar' ? (
          <div className="space-y-6">
            <CalendarComponent
              mode="single"
              selected={selectedDate}
              onSelect={handleDateClick}
              className="rounded-md border shadow-sm bg-white"
            />
            
            <Card>
              <CardContent className="p-4">
                <h3 className="font-medium text-gray-700 mb-2">
                  Upcoming Tasks
                </h3>
                <div className="space-y-3">
                  {mockTasks.slice(0, 3).map(task => (
                    <div key={task.id} 
                         className="flex items-center p-3 border border-gray-100 rounded-lg">
                      <div className={`w-2 h-10 rounded mr-3 ${getStatusColor(task.status)}`}></div>
                      <div className="flex-grow">
                        <h4 className="text-sm font-medium">{task.title}</h4>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge variant={getPriorityColor(task.priority)} className="text-xs">
                            {task.priority}
                          </Badge>
                          <span className="text-xs text-gray-500">
                            {format(parseISO(task.dueDate), 'MMM d')}
                            {isToday(parseISO(task.dueDate)) && ' (Today)'}
                          </span>
                        </div>
                      </div>
                      {task.assignee && (
                        <div className="ml-2 text-xs text-gray-500 px-2 py-1 bg-gray-100 rounded">
                          {task.assignee}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <Button 
                variant="outline" 
                size="icon"
                onClick={() => navigateDay('prev')}
              >
                <ArrowLeft className="h-4 w-4" />
              </Button>
              
              <div className="flex items-center gap-2">
                <Badge variant={isToday(selectedDate!) ? 'default' : 'secondary'} className="px-2">
                  {isToday(selectedDate!) ? 'Today' : format(selectedDate!, 'EEEE')}
                </Badge>
                <span className="text-sm text-gray-500">
                  {format(selectedDate!, 'MMMM d, yyyy')}
                </span>
              </div>
              
              <Button 
                variant="outline" 
                size="icon"
                onClick={() => navigateDay('next')}
              >
                <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
            
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-medium text-gray-700">
                  Tasks for {format(selectedDate!, 'MMM d')}
                </h3>
                <Badge variant="outline" className="px-2 py-0.5">
                  {tasksForDay.length} tasks
                </Badge>
              </div>
              
              {tasksForDay.length === 0 ? (
                <div className="bg-white rounded-lg shadow-sm p-8 text-center">
                  <CheckCircle className="h-10 w-10 text-gray-400 mx-auto mb-2" />
                  <h3 className="text-lg font-medium text-gray-600">No tasks scheduled</h3>
                  <p className="text-gray-500 mt-1">Enjoy your free day!</p>
                  <Button className="mt-4" size="sm">
                    Add Task
                  </Button>
                </div>
              ) : (
                <div className="space-y-3">
                  {tasksForDay.map(task => (
                    <div key={task.id} className="bg-white rounded-lg shadow-sm p-4 flex items-start">
                      <div className={`mt-0.5 w-4 h-4 rounded-full ${getStatusColor(task.status)} flex-shrink-0`}></div>
                      <div className="ml-3 flex-grow">
                        <h4 className="text-sm font-medium">{task.title}</h4>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge variant={getPriorityColor(task.priority)} className="text-xs">
                            {task.priority}
                          </Badge>
                          {task.assignee && (
                            <span className="text-xs text-gray-500">
                              Assigned to: {task.assignee}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center ml-2">
                        <Button variant="outline" size="sm" className="text-xs flex items-center gap-1">
                          <CheckCircle className="h-3 w-3" />
                          Complete
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </main>

      <BottomNav />
    </div>
  );
}