import React from 'react';
import { Task, User } from '@shared/schema';
import { Checkbox } from '@/components/ui/checkbox';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuSeparator, 
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';
import { useTasks } from '@/hooks/use-tasks';

interface TaskCardProps {
  task: Task;
  users?: User[];
  showCheckbox?: boolean;
  onEdit?: (task: Task) => void;
  onDelete?: (id: number) => void;
  onComplete?: (id: number) => void;
  onAssign?: (id: number, userId: number) => void;
}

export default function TaskCard({ 
  task, 
  users, 
  showCheckbox = true,
  onEdit,
  onDelete,
  onComplete,
  onAssign
}: TaskCardProps) {
  const { completeTask } = useTasks();
  
  const priorityClasses: Record<string, string> = {
    high: 'bg-red-100 text-red-800',
    medium: 'bg-amber-100 text-amber-800',
    low: 'bg-green-100 text-green-800',
  };
  
  const statusClasses: Record<string, string> = {
    created: 'bg-gray-100 text-gray-800',
    assigned: 'bg-blue-100 text-blue-800',
    in_progress: 'bg-amber-100 text-amber-800',
    completed: 'bg-green-100 text-green-800',
  };
  
  const taskBorderClasses: Record<string, string> = {
    high: 'task-priority-high border-l-4 border-l-red-500',
    medium: 'task-priority-medium border-l-4 border-l-amber-500',
    low: 'task-priority-low border-l-4 border-l-green-500',
  };
  
  const handleCheckboxChange = (checked: boolean) => {
    if (checked && task.id) {
      completeTask(task.id);
    }
  };
  
  const formatTime = (date: Date | null) => {
    if (!date) return 'Any time';
    
    return new Date(date).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  };
  
  const formatDueDate = (date: Date | null) => {
    if (!date) return 'No due date';
    
    const today = new Date();
    const dueDate = new Date(date);
    
    // Check if it's today
    if (
      dueDate.getDate() === today.getDate() &&
      dueDate.getMonth() === today.getMonth() &&
      dueDate.getFullYear() === today.getFullYear()
    ) {
      return 'Today';
    }
    
    // Check if it's tomorrow
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    if (
      dueDate.getDate() === tomorrow.getDate() &&
      dueDate.getMonth() === tomorrow.getMonth() &&
      dueDate.getFullYear() === tomorrow.getFullYear()
    ) {
      return 'Tomorrow';
    }
    
    // Otherwise, return formatted date
    return dueDate.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    });
  };
  
  return (
    <div className={`bg-white rounded-lg shadow-sm p-4 ${taskBorderClasses[task.priority]}`}>
      <div className="flex justify-between items-start">
        <div>
          <div className="flex items-center">
            {showCheckbox && (
              <Checkbox 
                checked={task.status === 'completed'} 
                onCheckedChange={handleCheckboxChange}
                className="w-5 h-5 rounded-full"
              />
            )}
            <h4 className={`font-medium text-gray-800 ml-3 ${task.status === 'completed' ? 'line-through' : ''}`}>
              {task.title}
            </h4>
          </div>
          <div className="flex items-center mt-2 space-x-2 ml-8">
            <span className={`px-2 py-1 rounded-full text-xs ${priorityClasses[task.priority]}`}>
              {task.priority.charAt(0).toUpperCase() + task.priority.slice(1)} Priority
            </span>
            <span className={`px-2 py-1 rounded-full text-xs ${statusClasses[task.status]}`}>
              {task.status.charAt(0).toUpperCase() + task.status.slice(1)}
            </span>
            {task.dueDate && (
              <div className="flex items-center text-xs text-gray-500">
                <span className="material-icons text-xs mr-1">schedule</span>
                {formatDueDate(task.dueDate)}, {formatTime(task.dueDate)}
              </div>
            )}
          </div>
        </div>
        <div className="flex items-center space-x-2">
          {task.assignedToId && users && (
            <img 
              src={users.find(u => u.id === task.assignedToId)?.photoURL || `https://ui-avatars.com/api/?name=User`} 
              alt={`Assigned to ${users.find(u => u.id === task.assignedToId)?.displayName || 'User'}`} 
              className="w-6 h-6 rounded-full"
            />
          )}
          <DropdownMenu>
            <DropdownMenuTrigger className="p-1 rounded-full hover:bg-gray-100">
              <span className="material-icons text-gray-400">more_vert</span>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {task.status !== 'completed' && (
                <>
                  <DropdownMenuItem onClick={() => onComplete && onComplete(task.id)}>
                    <span className="material-icons text-green-500 text-sm mr-2">check_circle</span>
                    Mark as Completed
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                </>
              )}
              {task.status !== 'assigned' && users && users.length > 0 && (
                <DropdownMenu>
                  <DropdownMenuTrigger className="w-full px-2 py-1.5 text-left text-sm flex items-center">
                    <span className="material-icons text-blue-500 text-sm mr-2">person_add</span>
                    Assign to
                  </DropdownMenuTrigger>
                  <DropdownMenuContent>
                    {users.map(user => (
                      <DropdownMenuItem 
                        key={user.id} 
                        onClick={() => onAssign && onAssign(task.id, user.id)}
                      >
                        <div className="flex items-center">
                          <img 
                            src={user.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.displayName || 'User')}`} 
                            alt={user.displayName || 'User'} 
                            className="w-5 h-5 rounded-full mr-2" 
                          />
                          {user.displayName}
                        </div>
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
              <DropdownMenuItem onClick={() => onEdit && onEdit(task)}>
                <span className="material-icons text-blue-500 text-sm mr-2">edit</span>
                Edit
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem 
                className="text-red-500"
                onClick={() => onDelete && onDelete(task.id)}
              >
                <span className="material-icons text-red-500 text-sm mr-2">delete</span>
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </div>
  );
}
