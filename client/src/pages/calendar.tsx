import React, { useState } from 'react';
import { format, addDays, isSameDay } from 'date-fns';
import Navbar from '@/components/layout/navbar';
import BottomNav from '@/components/layout/bottom-nav';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { useTasks } from '@/hooks/use-tasks';
import TaskModal from '@/components/tasks/task-modal';
import { useQuery } from '@tanstack/react-query';
import { User } from '@shared/schema';

export default function CalendarPage() {
  const { tasks, getTasksByDay, completeTask } = useTasks();
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [showAllTasks, setShowAllTasks] = useState(true);
  
  // Get house members
  const { data: users = [] } = useQuery<User[]>({
    queryKey: ['/api/users'],
  });
  
  // Generate calendar days for horizontal scrolling
  const calendarDays = Array.from({ length: 7 }, (_, i) => {
    const date = addDays(new Date(), i);
    return {
      date,
      day: format(date, 'd'),
      name: format(date, 'EEE'),
      isToday: isSameDay(date, new Date()),
    };
  });
  
  // Get tasks for the selected day
  const tasksForSelectedDay = getTasksByDay(selectedDate);
  
  // Format the selected date
  const formattedSelectedDate = format(selectedDate, 'MMMM d, yyyy');
  
  const handleDateClick = (date: Date) => {
    setSelectedDate(date);
  };
  
  const handleTaskCheck = (id: number, checked: boolean) => {
    if (checked) {
      completeTask(id);
    }
  };
  
  return (
    <div className="flex flex-col h-screen">
      <Navbar title="Calendar" />
      
      <main className="flex-grow overflow-y-auto pb-20">
        <section className="p-4 space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-gray-800">Task Calendar</h2>
            <Button 
              className="bg-primary text-white rounded-full w-12 h-12 flex items-center justify-center shadow-lg"
              onClick={() => setIsModalOpen(true)}
            >
              <span className="material-icons">add</span>
            </Button>
          </div>
          
          <div className="bg-white rounded-xl shadow-sm overflow-x-auto">
            <div className="flex p-2 space-x-2 min-w-full">
              {calendarDays.map((day) => (
                <Button
                  key={day.day}
                  className={`flex-shrink-0 w-16 text-center py-2 px-1 rounded-lg ${
                    isSameDay(day.date, selectedDate)
                      ? 'bg-primary text-white'
                      : day.isToday
                        ? 'bg-primary/10 text-primary'
                        : ''
                  }`}
                  variant="ghost"
                  onClick={() => handleDateClick(day.date)}
                >
                  <div className="text-xs font-medium">{day.name}</div>
                  <div className="text-lg font-bold">{day.day}</div>
                </Button>
              ))}
            </div>
          </div>
          
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-medium text-gray-700">{formattedSelectedDate}</h3>
              <div className="flex space-x-2">
                <Button 
                  className={`bg-gray-100 rounded-md px-3 py-1 text-sm font-medium ${showAllTasks ? 'text-primary' : 'text-gray-600'} hover:bg-gray-200`}
                  variant="ghost"
                  onClick={() => setShowAllTasks(true)}
                >
                  All
                </Button>
                <Button 
                  className={`bg-gray-100 rounded-md px-3 py-1 text-sm font-medium ${!showAllTasks ? 'text-primary' : 'text-gray-600'} hover:bg-gray-200`}
                  variant="ghost"
                  onClick={() => setShowAllTasks(false)}
                >
                  My Tasks
                </Button>
              </div>
            </div>
            
            {/* Task list for the selected day */}
            <div className="space-y-3">
              {tasksForSelectedDay.length === 0 ? (
                <div className="bg-white rounded-lg shadow-sm p-8 text-center">
                  <span className="material-icons text-gray-400 text-4xl mb-2">event_available</span>
                  <h3 className="text-lg font-medium text-gray-600">No tasks for this day</h3>
                  <p className="text-gray-500 mt-1">Create a new task to get started</p>
                  <Button 
                    className="mt-4 bg-primary text-white"
                    onClick={() => setIsModalOpen(true)}
                  >
                    Add Task
                  </Button>
                </div>
              ) : (
                tasksForSelectedDay.map(task => (
                  <div key={task.id} className={`bg-white rounded-lg shadow-sm p-4 task-priority-${task.priority}`}>
                    <div className="flex items-center">
                      <Checkbox 
                        className="w-5 h-5 rounded-full"
                        checked={task.status === 'completed'}
                        onCheckedChange={(checked) => handleTaskCheck(task.id, checked as boolean)}
                      />
                      <div className="ml-3 flex-grow">
                        <h4 className={`font-medium text-gray-800 ${task.status === 'completed' ? 'line-through' : ''}`}>
                          {task.title}
                        </h4>
                        <div className="flex items-center mt-1 space-x-2">
                          {task.dueDate && (
                            <div className="flex items-center text-xs text-gray-500">
                              <span className="material-icons text-xs mr-1">schedule</span>
                              {format(new Date(task.dueDate), 'h:mm a')}
                            </div>
                          )}
                          <div className="flex items-center text-xs text-gray-500">
                            <span className="material-icons text-xs mr-1">timelapse</span>
                            {task.effortHours > 0 && `${task.effortHours}h `}
                            {task.effortMinutes > 0 && `${task.effortMinutes}m`}
                            {task.effortHours === 0 && task.effortMinutes === 0 && '—'}
                          </div>
                          <span className={`px-2 py-0.5 rounded-full text-xs ${
                            task.priority === 'high' 
                              ? 'bg-red-100 text-red-800' 
                              : task.priority === 'medium'
                                ? 'bg-amber-100 text-amber-800'
                                : 'bg-green-100 text-green-800'
                          }`}>
                            {task.priority.charAt(0).toUpperCase() + task.priority.slice(1)}
                          </span>
                        </div>
                      </div>
                      {task.assignedToId && users.some(u => u.id === task.assignedToId) && (
                        <img 
                          src={users.find(u => u.id === task.assignedToId)?.photoURL || `https://ui-avatars.com/api/?name=User`} 
                          alt={`Assigned to ${users.find(u => u.id === task.assignedToId)?.displayName || 'User'}`} 
                          className="w-6 h-6 rounded-full ml-2"
                        />
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </section>
      </main>
      
      <BottomNav />
      
      <TaskModal 
        open={isModalOpen}
        onOpenChange={setIsModalOpen}
        users={users}
      />
    </div>
  );
}
