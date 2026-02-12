import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  DndContext,
  DragOverlay,
  closestCorners,
  PointerSensor,
  useSensor,
  useSensors,
  DragStartEvent,
  DragEndEvent,
  useDroppable,
  useDraggable,
} from '@dnd-kit/core';
import {
  Plus, Search, MoreVertical, Edit, Trash2,
  Calendar as CalendarIcon, Clock
} from 'lucide-react';
import { useTasks } from '@/hooks/use-tasks';
import { useAppContext } from '@/context/app-context';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { Task, User as UserModel } from '@shared/schema';
import { apiRequest } from '@/lib/queryClient';
import TaskModal from '@/components/tasks/task-modal';
import Navbar from '@/components/layout/navbar';
import Sidebar from '@/components/layout/sidebar';
import BottomNav from '@/components/layout/bottom-nav';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

// Task statuses configuration
const COLUMNS = [
  { id: 'created', title: 'To Do', color: 'bg-gray-100' },
  { id: 'assigned', title: 'Assigned', color: 'bg-blue-100' },
  { id: 'in_progress', title: 'In Progress', color: 'bg-amber-100' },
  { id: 'completed', title: 'Done', color: 'bg-green-100' },
];

interface TaskCardProps {
  task: Task;
  users: UserModel[];
  onEdit: (task: Task) => void;
  onDelete: (taskId: number) => void;
  isDragging?: boolean;
}

function TaskCard({ task, users, onEdit, onDelete, isDragging }: TaskCardProps) {
  const { attributes, listeners, setNodeRef, transform, isDragging: isDraggingFromHook } = useDraggable({
    id: task.id.toString(),
    data: { task },
  });

  const style = transform ? {
    transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
  } : undefined;

  const assignedUser = task.assignedToId ? users.find(u => u.id === task.assignedToId) : null;

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'border-l-4 border-l-red-500';
      case 'medium': return 'border-l-4 border-l-yellow-500';
      case 'low': return 'border-l-4 border-l-green-500';
      default: return 'border-l-4 border-l-gray-300';
    }
  };

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case 'high':
        return <Badge variant="destructive" className="text-xs">High</Badge>;
      case 'medium':
        return <Badge variant="default" className="text-xs bg-yellow-500">Medium</Badge>;
      case 'low':
        return <Badge variant="secondary" className="text-xs">Low</Badge>;
      default:
        return null;
    }
  };

  return (
    <Card
      ref={setNodeRef}
      style={style}
      className={`mb-3 cursor-grab active:cursor-grabbing hover:shadow-md transition-shadow ${getPriorityColor(task.priority)} ${isDragging || isDraggingFromHook ? 'opacity-50' : ''}`}
      {...listeners}
      {...attributes}
    >
      <CardContent className="p-4">
        <div className="space-y-3">
          {/* Header */}
          <div className="flex items-start justify-between gap-2">
            <h3 className="font-semibold text-sm line-clamp-2 flex-1">{task.title}</h3>
            <DropdownMenu>
              <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                <Button variant="ghost" size="icon" className="h-6 w-6" onPointerDown={(e) => e.stopPropagation()}>
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onEdit(task); }}>
                  <Edit className="h-4 w-4 mr-2" />
                  Edit
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={(e) => { e.stopPropagation(); onDelete(task.id); }}
                  className="text-red-600"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* Description */}
          {task.description && (
            <p className="text-xs text-gray-600 line-clamp-2">{task.description}</p>
          )}

          {/* Priority and Metadata */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 flex-wrap">
              {getPriorityBadge(task.priority)}
              {task.dueDate && (
                <div className="flex items-center gap-1 text-xs text-gray-500">
                  <CalendarIcon className="h-3 w-3" />
                  {new Date(task.dueDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                </div>
              )}
              {(task.effortHours > 0 || task.effortMinutes > 0) && (
                <div className="flex items-center gap-1 text-xs text-gray-500">
                  <Clock className="h-3 w-3" />
                  {task.effortHours}h {task.effortMinutes}m
                </div>
              )}
            </div>
          </div>

          {/* Assigned user */}
          {assignedUser && (
            <div className="flex items-center gap-2 pt-2 border-t">
              <img
                src={assignedUser.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(assignedUser.displayName || 'User')}`}
                alt={assignedUser.displayName || 'User'}
                className="w-6 h-6 rounded-full"
              />
              <span className="text-xs text-gray-600">{assignedUser.displayName || assignedUser.email}</span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

interface ColumnProps {
  column: typeof COLUMNS[0];
  tasks: Task[];
  users: UserModel[];
  onEdit: (task: Task) => void;
  onDelete: (taskId: number) => void;
}

function Column({ column, tasks, users, onEdit, onDelete }: ColumnProps) {
  const { setNodeRef, isOver } = useDroppable({
    id: column.id,
  });

  return (
    <div className="w-full md:flex-1 md:min-w-[280px] md:max-w-[350px]">
      <div className={`${column.color} rounded-t-lg p-3`}>
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-sm">{column.title}</h2>
          <Badge variant="secondary" className="text-xs">
            {tasks.length}
          </Badge>
        </div>
      </div>
      <div
        ref={setNodeRef}
        className={`bg-gray-50 rounded-b-lg p-3 min-h-[200px] md:min-h-[calc(100vh-300px)] md:max-h-[calc(100vh-300px)] overflow-y-auto transition-colors ${
          isOver ? 'bg-blue-50 ring-2 ring-blue-300' : ''
        }`}
      >
        {tasks.length === 0 ? (
          <div className="text-center py-8 text-gray-400 text-sm">
            {isOver ? 'Drop here' : 'No tasks'}
          </div>
        ) : (
          tasks.map(task => (
            <TaskCard
              key={task.id}
              task={task}
              users={users}
              onEdit={onEdit}
              onDelete={onDelete}
            />
          ))
        )}
      </div>
    </div>
  );
}

export default function TasksPage() {
  const { currentHouse } = useAppContext();
  const { tasks, isLoading, deleteTask, updateTask } = useTasks();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState('');
  const [taskModalOpen, setTaskModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | undefined>(undefined);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [taskToDelete, setTaskToDelete] = useState<number | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);

  // Get all users
  const { data: allUsers = [] } = useQuery<UserModel[]>({
    queryKey: ['/api/users'],
  });

  // Silent update mutation for drag and drop
  const updateTaskStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: number; status: string }) => {
      const res = await apiRequest('PATCH', `/api/tasks/${id}`, { status });
      return res.json();
    },
    onSettled: () => {
      // Refetch to ensure data consistency
      queryClient.invalidateQueries({ queryKey: ['/api/tasks'] });
    },
  });

  // Setup sensors for drag and drop
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  // Filter tasks by search
  const filteredTasks = tasks.filter((task) => {
    if (searchQuery && !task.title.toLowerCase().includes(searchQuery.toLowerCase())) {
      return false;
    }
    return true;
  });

  // Group tasks by status
  const tasksByStatus = COLUMNS.reduce((acc, column) => {
    acc[column.id] = filteredTasks.filter(task => task.status === column.id);
    return acc;
  }, {} as Record<string, Task[]>);

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);

    if (!over) return;

    const taskId = parseInt(active.id as string);
    let newStatus = over.id as string;

    // Check if we dropped on a column
    const isValidColumn = COLUMNS.some(col => col.id === newStatus);

    // If we dropped on a task card instead of a column, find the column that contains that task
    if (!isValidColumn) {
      const droppedOnTaskId = parseInt(over.id as string);
      const droppedOnTask = tasks.find(t => t.id === droppedOnTaskId);
      if (droppedOnTask) {
        newStatus = droppedOnTask.status;
      } else {
        return; // Invalid drop target
      }
    }

    const task = tasks.find(t => t.id === taskId);
    if (task && task.status !== newStatus) {
      console.log(`Moving task ${taskId} from ${task.status} to ${newStatus}`);

      // Optimistically update the UI immediately after drag ends
      queryClient.setQueriesData({ queryKey: ['/api/tasks'] }, (old: any) => {
        if (!old) return old;
        return old.map((t: Task) =>
          t.id === taskId ? { ...t, status: newStatus } : t
        );
      });

      // Then update the server in the background
      updateTaskStatusMutation.mutate({
        id: taskId,
        status: newStatus,
      });
    }
  };

  const handleEditTask = (task: Task) => {
    setEditingTask(task);
    setTaskModalOpen(true);
  };

  const handleDeleteTask = (taskId: number) => {
    setTaskToDelete(taskId);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = () => {
    if (taskToDelete) {
      deleteTask.mutate(taskToDelete);
      setDeleteDialogOpen(false);
      setTaskToDelete(null);
    }
  };

  const activeTask = activeId ? tasks.find(t => t.id.toString() === activeId) : null;

  if (isLoading) {
    return (
      <div className="flex flex-col h-screen bg-gray-50">
        <Navbar title="Tasks" />
        <div className="flex-1 flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      <Navbar title="Tasks" />
      <Sidebar />

      {/* Header */}
      <div className="bg-white border-b px-4 py-3 md:ml-64">
        <div className="flex items-center justify-between gap-2 md:gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search tasks..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <Button
            onClick={() => { setEditingTask(undefined); setTaskModalOpen(true); }}
            className="shrink-0"
            size="default"
          >
            <Plus className="h-4 w-4 md:mr-2" />
            <span className="hidden md:inline">New Task</span>
          </Button>
        </div>
      </div>

      {/* Kanban Board */}
      <div className="flex-1 overflow-y-auto p-4 pb-24 md:pb-4 md:ml-64 md:overflow-x-auto md:overflow-y-hidden">
        <DndContext
          sensors={sensors}
          collisionDetection={closestCorners}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        >
          <div className="flex flex-col md:flex-row gap-4 md:h-full">
            {COLUMNS.map(column => (
              <Column
                key={column.id}
                column={column}
                tasks={tasksByStatus[column.id] || []}
                users={allUsers}
                onEdit={handleEditTask}
                onDelete={handleDeleteTask}
              />
            ))}
          </div>
          <DragOverlay>
            {activeTask ? (
              <div className="rotate-3 scale-105">
                <TaskCard
                  task={activeTask}
                  users={allUsers}
                  onEdit={handleEditTask}
                  onDelete={handleDeleteTask}
                  isDragging
                />
              </div>
            ) : null}
          </DragOverlay>
        </DndContext>
      </div>

      {/* Task Modal */}
      <TaskModal
        open={taskModalOpen}
        onClose={() => {
          setTaskModalOpen(false);
          setEditingTask(undefined);
        }}
        task={editingTask}
      />

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Task</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this task? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-red-600 hover:bg-red-700">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Bottom Navigation */}
      <BottomNav />
    </div>
  );
}
