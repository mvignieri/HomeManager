import React from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { insertTaskSchema, Task, User } from '@shared/schema';
import { useQuery } from '@tanstack/react-query';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAppContext } from '@/context/app-context';
import { useTasks } from '@/hooks/use-tasks';

// Extended schema for form validation
const taskFormSchema = insertTaskSchema.extend({
  dueDate: z.string().optional().nullable(),
  dueTime: z.string().optional().nullable(),
  endDate: z.string().optional().nullable(),
});

type TaskFormValues = z.infer<typeof taskFormSchema>;

interface TaskModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  task?: Task;
  users: User[];
  defaultDate?: string; // ISO date string YYYY-MM-DD to pre-fill dueDate
}

export default function TaskModal({ open, onOpenChange, task, users, defaultDate }: TaskModalProps) {
  const { user, currentHouse } = useAppContext();
  const { createTaskAsync, updateTaskAsync, isCreating, isUpdating } = useTasks();
  const [isMultiDay, setIsMultiDay] = React.useState(!!task?.endDate);
  const { data: allUsers = [] } = useQuery<User[]>({
    queryKey: ['/api/users'],
  });

  // Get database user ID from Firebase UID
  const dbUser = allUsers.find((u) => u.uid === user?.uid);

  const defaultValues: Partial<TaskFormValues> = {
    title: task?.title || '',
    description: task?.description || '',
    priority: task?.priority || 'medium',
    status: task?.status || 'created',
    effortHours: task?.effortHours || 0,
    effortMinutes: task?.effortMinutes || 0,
    houseId: task?.houseId || currentHouse?.id || 0,
    createdById: task?.createdById || dbUser?.id || 0,
    assignedToId: task?.assignedToId || null,
    dueDate: task?.dueDate ? new Date(task.dueDate).toISOString().substring(0, 10) : (defaultDate || null),
    dueTime: task?.dueDate ? new Date(task.dueDate).toISOString().substring(11, 16) : null,
    endDate: task?.endDate ? new Date(task.endDate).toISOString().substring(0, 10) : null,
  };

  const form = useForm<TaskFormValues>({
    resolver: zodResolver(taskFormSchema),
    defaultValues,
  });

  // Reset form when modal opens or task changes
  React.useEffect(() => {
    if (open) {
      const hasEndDate = !!task?.endDate;
      setIsMultiDay(hasEndDate);
      const resetValues: Partial<TaskFormValues> = {
        title: task?.title || '',
        description: task?.description || '',
        priority: task?.priority || 'medium',
        status: task?.status || 'created',
        effortHours: task?.effortHours || 0,
        effortMinutes: task?.effortMinutes || 0,
        houseId: task?.houseId || currentHouse?.id || 0,
        createdById: task?.createdById || dbUser?.id || 0,
        assignedToId: task?.assignedToId || null,
        dueDate: task?.dueDate ? new Date(task.dueDate).toISOString().substring(0, 10) : (defaultDate || null),
        dueTime: task?.dueDate ? new Date(task.dueDate).toISOString().substring(11, 16) : null,
        endDate: task?.endDate ? new Date(task.endDate).toISOString().substring(0, 10) : null,
      };
      form.reset(resetValues);
    }
  }, [open, task?.id]);

  const onSubmit = async (values: TaskFormValues) => {
    if (!currentHouse?.id) {
      console.error('No house selected');
      return;
    }

    if (!dbUser?.id) {
      console.error('No user found');
      return;
    }

    // Prepare task data with all fields
    const taskData = {
      ...values,
      houseId: currentHouse.id,
      createdById: dbUser.id,
    };

    try {
      if (task) {
        // For updates, we need to convert to Date since updateTask expects Partial<Task>
        const dueDateValue = values.dueDate
          ? (values.dueTime
              ? new Date(`${values.dueDate}T${values.dueTime}`)
              : new Date(values.dueDate))
          : null;

        const endDateValue = isMultiDay && values.endDate ? new Date(values.endDate) : null;

        const { dueDate: _dueDate, dueTime: _dueTime, endDate: _endDate, ...restValues } = values;
        const updateData = {
          ...restValues,
          dueDate: dueDateValue,
          endDate: endDateValue,
          houseId: currentHouse.id,
        };

        await updateTaskAsync({
          id: task.id,
          taskData: updateData,
        });
      } else {
        // For create, pass the form values directly (useTasks will handle conversion)
        await createTaskAsync({
          ...taskData,
          endDate: isMultiDay ? taskData.endDate : null,
        });
      }
      onOpenChange(false); // Only close after mutation completes
    } catch (error) {
      console.error('Failed to save task:', error);
      // Error toast will be shown by mutation's onError handler
    }
  };

  // Show loading if data not ready
  if (!dbUser || !currentHouse) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-[425px]">
          <div className="flex justify-center items-center h-32">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary"></div>
            <p className="ml-2">Loading...</p>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{task ? 'Edit Task' : 'New Task'}</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Task Name</FormLabel>
                  <FormControl>
                    <Input placeholder="Enter task name" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description (Optional)</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Enter task description" {...field} value={field.value || ''} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="dueDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Due Date</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} value={field.value || ''} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="dueTime"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Time</FormLabel>
                    <FormControl>
                      <Input type="time" {...field} value={field.value || ''} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="multi-day-toggle"
                checked={isMultiDay}
                onChange={(e) => {
                  setIsMultiDay(e.target.checked);
                  if (!e.target.checked) form.setValue('endDate', null);
                }}
                className="h-4 w-4 rounded border-gray-300"
              />
              <label htmlFor="multi-day-toggle" className="text-sm font-medium text-gray-700 cursor-pointer">
                Multi-day task
              </label>
            </div>

            {isMultiDay && (
              <FormField
                control={form.control}
                name="endDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>End Date</FormLabel>
                    <FormControl>
                      <Input
                        type="date"
                        {...field}
                        value={field.value || ''}
                        min={form.watch('dueDate') || undefined}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="effortHours"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Hours</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min={0}
                        value={field.value || 0}
                        onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="effortMinutes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Minutes</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min={0}
                        max={59}
                        value={field.value || 0}
                        onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            
            <FormField
              control={form.control}
              name="priority"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Priority</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select priority" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="low" className="text-green-600">Low</SelectItem>
                      <SelectItem value="medium" className="text-amber-600">Medium</SelectItem>
                      <SelectItem value="high" className="text-red-600">High</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="assignedToId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Assign To (Optional)</FormLabel>
                  <Select
                    onValueChange={(val) => field.onChange(val === "unassigned" ? null : parseInt(val))}
                    value={field.value ? field.value.toString() : "unassigned"}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a person" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="unassigned">Unassigned</SelectItem>
                      {users.map(user => (
                        <SelectItem key={user.id} value={user.id.toString()}>
                          {user.displayName || user.email}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isCreating || isUpdating}>
                {isCreating || isUpdating ? 'Saving...' : (task ? 'Update Task' : 'Save Task')}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
