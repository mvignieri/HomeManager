import React, { useState } from 'react';
import { Task, User } from '@shared/schema';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useTasks } from '@/hooks/use-tasks';
import TaskCard from './task-card';
import TaskModal from './task-modal';

interface TaskListProps {
  initialFilter?: string;
  users: User[];
}

export default function TaskList({ initialFilter, users }: TaskListProps) {
  const { tasks, filterOptions, setFilterOptions } = useTasks(initialFilter);
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | undefined>(undefined);
  
  // Filter by search term
  const filteredTasks = tasks.filter(task => 
    task.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (task.description && task.description.toLowerCase().includes(searchTerm.toLowerCase()))
  );
  
  const handleEditTask = (task: Task) => {
    setEditingTask(task);
    setIsModalOpen(true);
  };
  
  const handleCreateTask = () => {
    setEditingTask(undefined);
    setIsModalOpen(true);
  };
  
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-gray-800">Task Management</h2>
        <Button 
          className="bg-primary text-white rounded-full w-12 h-12 flex items-center justify-center shadow-lg"
          onClick={handleCreateTask}
        >
          <span className="material-icons">add</span>
        </Button>
      </div>
      
      <div className="bg-white rounded-xl shadow-sm p-4 border border-gray-100">
        <div className="relative">
          <span className="absolute inset-y-0 left-0 flex items-center pl-3">
            <span className="material-icons text-gray-400">search</span>
          </span>
          <Input 
            type="text" 
            placeholder="Search tasks..." 
            className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        
        <div className="mt-4 flex space-x-2 overflow-x-auto pb-2">
          <Button 
            className={`px-3 py-1 ${filterOptions.status === 'all' ? 'bg-primary text-white' : 'bg-gray-100 text-gray-700'} rounded-md text-sm whitespace-nowrap`}
            onClick={() => setFilterOptions({ ...filterOptions, status: 'all' })}
          >
            All Tasks
          </Button>
          <Button 
            className={`px-3 py-1 ${filterOptions.status === 'created' ? 'bg-primary text-white' : 'bg-gray-100 text-gray-700'} rounded-md text-sm whitespace-nowrap`}
            onClick={() => setFilterOptions({ ...filterOptions, status: 'created' })}
          >
            Created
          </Button>
          <Button 
            className={`px-3 py-1 ${filterOptions.status === 'assigned' ? 'bg-primary text-white' : 'bg-gray-100 text-gray-700'} rounded-md text-sm whitespace-nowrap`}
            onClick={() => setFilterOptions({ ...filterOptions, status: 'assigned' })}
          >
            Assigned
          </Button>
          <Button 
            className={`px-3 py-1 ${filterOptions.status === 'completed' ? 'bg-primary text-white' : 'bg-gray-100 text-gray-700'} rounded-md text-sm whitespace-nowrap`}
            onClick={() => setFilterOptions({ ...filterOptions, status: 'completed' })}
          >
            Completed
          </Button>
          <Button 
            className={`px-3 py-1 ${filterOptions.priority === 'high' ? 'bg-primary text-white' : 'bg-gray-100 text-gray-700'} rounded-md text-sm whitespace-nowrap`}
            onClick={() => setFilterOptions({ ...filterOptions, priority: filterOptions.priority === 'high' ? 'all' : 'high' })}
          >
            High Priority
          </Button>
          <Button 
            className={`px-3 py-1 ${filterOptions.priority === 'medium' ? 'bg-primary text-white' : 'bg-gray-100 text-gray-700'} rounded-md text-sm whitespace-nowrap`}
            onClick={() => setFilterOptions({ ...filterOptions, priority: filterOptions.priority === 'medium' ? 'all' : 'medium' })}
          >
            Medium Priority
          </Button>
          <Button 
            className={`px-3 py-1 ${filterOptions.priority === 'low' ? 'bg-primary text-white' : 'bg-gray-100 text-gray-700'} rounded-md text-sm whitespace-nowrap`}
            onClick={() => setFilterOptions({ ...filterOptions, priority: filterOptions.priority === 'low' ? 'all' : 'low' })}
          >
            Low Priority
          </Button>
        </div>
      </div>
      
      <div className="space-y-3">
        {filteredTasks.length === 0 ? (
          <div className="bg-white rounded-lg shadow-sm p-8 text-center">
            <span className="material-icons text-gray-400 text-4xl mb-2">task_alt</span>
            <h3 className="text-lg font-medium text-gray-600">No tasks found</h3>
            <p className="text-gray-500 mt-1">Try adjusting your filters or create a new task</p>
            <Button 
              className="mt-4 bg-primary text-white"
              onClick={handleCreateTask}
            >
              Create New Task
            </Button>
          </div>
        ) : (
          filteredTasks.map(task => (
            <TaskCard 
              key={task.id} 
              task={task} 
              users={users}
              onEdit={handleEditTask}
            />
          ))
        )}
      </div>
      
      {isModalOpen && (
        <TaskModal 
          open={isModalOpen}
          onOpenChange={setIsModalOpen}
          task={editingTask}
          users={users}
        />
      )}
    </div>
  );
}
