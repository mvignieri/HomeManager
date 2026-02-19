import { useState, useCallback } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Task, insertTaskSchema, TaskPriority, TaskStatus } from '@shared/schema';
import { queryClient, apiRequest } from '@/lib/queryClient';
import { useToast } from './use-toast';
import { useAppContext } from '@/context/app-context';
import { z } from 'zod';

// Extended schema for form validation
const taskFormSchema = insertTaskSchema.extend({
  dueDate: z.string().optional().nullable(),
  dueTime: z.string().optional().nullable(),
});

type TaskFormValues = z.infer<typeof taskFormSchema>;

export function useTasks(filter?: string) {
  const { toast } = useToast();
  const { currentHouse } = useAppContext();
  const [filterOptions, setFilterOptions] = useState({
    status: filter || 'all',
    priority: 'all',
  });

  // Fetch tasks with proper query key
  const {
    data: tasks = [],
    isLoading,
    error,
    refetch,
  } = useQuery<Task[]>({
    queryKey: ['/api/tasks', currentHouse?.id, filterOptions],
    queryFn: async () => {
      if (!currentHouse?.id) return [];
      const res = await fetch(`/api/tasks?houseId=${currentHouse.id}`);
      if (!res.ok) throw new Error('Failed to fetch tasks');
      return res.json();
    },
    enabled: !!currentHouse,
    // Pusher handles real-time updates, fallback polling only once per 5 minutes
    refetchInterval: 300000,
  });

  // Filter tasks based on options
  const filteredTasks = tasks.filter((task) => {
    let statusMatch = filterOptions.status === 'all' || task.status === filterOptions.status;
    let priorityMatch = filterOptions.priority === 'all' || task.priority === filterOptions.priority;
    return statusMatch && priorityMatch;
  });

  // Sort tasks by priority (high -> medium -> low)
  const sortedTasks = [...filteredTasks].sort((a, b) => {
    const priorityOrder: Record<string, number> = { high: 0, medium: 1, low: 2 };
    return priorityOrder[a.priority] - priorityOrder[b.priority];
  });

  // Create task mutation
  const createTaskMutation = useMutation({
    mutationFn: async (taskData: TaskFormValues) => {
      // Convert form values to the expected format
      const dueDateTime = 
        taskData.dueDate && taskData.dueTime 
          ? new Date(`${taskData.dueDate}T${taskData.dueTime}`) 
          : taskData.dueDate 
            ? new Date(taskData.dueDate) 
            : null;

      const task: Omit<Task, 'id' | 'createdAt' | 'completedAt'> = {
        title: taskData.title,
        description: taskData.description || null,
        priority: taskData.priority as TaskPriority || 'medium',
        status: taskData.status as TaskStatus || 'created',
        dueDate: dueDateTime,
        effortHours: taskData.effortHours || 0,
        effortMinutes: taskData.effortMinutes || 0,
        houseId: currentHouse?.id as number,
        createdById: taskData.createdById,
        assignedToId: taskData.assignedToId || null,
        completedById: null,
      };

      const res = await apiRequest('POST', '/api/tasks', task);
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: 'Task Created',
        description: 'Your task has been successfully created',
      });
      queryClient.invalidateQueries({ queryKey: ['/api/tasks'] });
    },
    onError: (error: any) => {
      toast({
        title: 'Failed to Create Task',
        description: error.message || 'An error occurred while creating the task',
        variant: 'destructive',
      });
    },
  });

  // Update task mutation
  const updateTaskMutation = useMutation({
    mutationFn: async ({ id, taskData }: { id: number; taskData: Partial<Task> }) => {
      const res = await apiRequest('PATCH', `/api/tasks/${id}`, taskData);
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: 'Task Updated',
        description: 'Your task has been successfully updated',
      });
      queryClient.invalidateQueries({ queryKey: ['/api/tasks'] });
    },
    onError: (error: any) => {
      toast({
        title: 'Failed to Update Task',
        description: error.message || 'An error occurred while updating the task',
        variant: 'destructive',
      });
    },
  });

  // Delete task mutation
  const deleteTaskMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await apiRequest('DELETE', `/api/tasks/${id}`);
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: 'Task Deleted',
        description: 'Your task has been successfully deleted',
      });
      queryClient.invalidateQueries({ queryKey: ['/api/tasks'] });
    },
    onError: (error: any) => {
      toast({
        title: 'Failed to Delete Task',
        description: error.message || 'An error occurred while deleting the task',
        variant: 'destructive',
      });
    },
  });

  // Complete task mutation
  const completeTaskMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await apiRequest('PATCH', `/api/tasks/${id}/complete`, {});
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: 'Task Completed',
        description: 'Your task has been marked as completed',
      });
      queryClient.invalidateQueries({ queryKey: ['/api/tasks'] });
    },
    onError: (error: any) => {
      toast({
        title: 'Failed to Complete Task',
        description: error.message || 'An error occurred while completing the task',
        variant: 'destructive',
      });
    },
  });

  // Assign task mutation
  const assignTaskMutation = useMutation({
    mutationFn: async ({ id, userId }: { id: number; userId: number }) => {
      const res = await apiRequest('PATCH', `/api/tasks/${id}/assign`, { assignedToId: userId });
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: 'Task Assigned',
        description: 'The task has been successfully assigned',
      });
      queryClient.invalidateQueries({ queryKey: ['/api/tasks'] });
    },
    onError: (error: any) => {
      toast({
        title: 'Failed to Assign Task',
        description: error.message || 'An error occurred while assigning the task',
        variant: 'destructive',
      });
    },
  });

  // Filter tasks by day
  const getTasksByDay = useCallback((date: Date) => {
    return sortedTasks.filter((task) => {
      if (!task.dueDate) return false;
      
      const taskDate = new Date(task.dueDate);
      return (
        taskDate.getDate() === date.getDate() &&
        taskDate.getMonth() === date.getMonth() &&
        taskDate.getFullYear() === date.getFullYear()
      );
    });
  }, [sortedTasks]);

  return {
    tasks: sortedTasks,
    isLoading,
    error,
    refetch,
    filterOptions,
    setFilterOptions,
    getTasksByDay,
    createTask: createTaskMutation.mutate,
    createTaskAsync: createTaskMutation.mutateAsync,
    updateTask: updateTaskMutation.mutate,
    updateTaskAsync: updateTaskMutation.mutateAsync,
    deleteTask: deleteTaskMutation.mutate,
    completeTask: completeTaskMutation.mutate,
    assignTask: assignTaskMutation.mutate,
    isCreating: createTaskMutation.isPending,
    isUpdating: updateTaskMutation.isPending,
    isDeleting: deleteTaskMutation.isPending,
    isCompleting: completeTaskMutation.isPending,
    isAssigning: assignTaskMutation.isPending,
  };
}
