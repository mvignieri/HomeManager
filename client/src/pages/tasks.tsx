import React, { useMemo, useState } from 'react';
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
  Plus,
  Search,
  MoreVertical,
  Edit,
  Trash2,
  Calendar as CalendarIcon,
  Clock,
  CircleDashed,
  UserCheck,
  Timer,
  CheckCircle2,
  Sparkles,
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

const COLUMNS = [
  {
    id: 'created',
    title: 'Inbox',
    subtitle: 'Nuovi task',
    icon: CircleDashed,
    badgeClass: 'bg-slate-100 text-slate-700 border-slate-200',
    panelClass: 'from-slate-200/70 via-white/70 to-slate-100/50',
    ringClass: 'ring-slate-200',
  },
  {
    id: 'assigned',
    title: 'Assegnati',
    subtitle: 'Pronti a partire',
    icon: UserCheck,
    badgeClass: 'bg-sky-100 text-sky-700 border-sky-200',
    panelClass: 'from-sky-200/60 via-white/70 to-sky-100/40',
    ringClass: 'ring-sky-300/70',
  },
  {
    id: 'in_progress',
    title: 'In Corso',
    subtitle: 'Attivi ora',
    icon: Timer,
    badgeClass: 'bg-amber-100 text-amber-700 border-amber-200',
    panelClass: 'from-amber-200/60 via-white/70 to-amber-100/40',
    ringClass: 'ring-amber-300/70',
  },
  {
    id: 'completed',
    title: 'Completati',
    subtitle: 'Fatti',
    icon: CheckCircle2,
    badgeClass: 'bg-emerald-100 text-emerald-700 border-emerald-200',
    panelClass: 'from-emerald-200/60 via-white/70 to-emerald-100/40',
    ringClass: 'ring-emerald-300/70',
  },
] as const;

type TaskStatus = (typeof COLUMNS)[number]['id'];

interface TaskCardProps {
  task: Task;
  users: UserModel[];
  onEdit: (task: Task) => void;
  onDelete: (taskId: number) => void;
  onQuickStatusChange: (taskId: number, status: TaskStatus) => void;
  isDragging?: boolean;
}

function TaskCard({ task, users, onEdit, onDelete, onQuickStatusChange, isDragging }: TaskCardProps) {
  const { attributes, listeners, setNodeRef, transform, isDragging: isDraggingFromHook } = useDraggable({
    id: task.id.toString(),
    data: { task },
  });

  const style = transform
    ? {
        transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
      }
    : undefined;

  const assignedUser = task.assignedToId ? users.find((u) => u.id === task.assignedToId) : null;

  const priorityStyles: Record<string, string> = {
    high: 'border-red-400/70 bg-red-50 text-red-700',
    medium: 'border-amber-400/70 bg-amber-50 text-amber-700',
    low: 'border-emerald-400/70 bg-emerald-50 text-emerald-700',
  };

  const isComplete = task.status === 'completed';

  return (
    <Card
      ref={setNodeRef}
      style={style}
      className={`glass-surface interactive-lift mb-3 cursor-grab active:cursor-grabbing rounded-2xl border p-0 ${
        isDragging || isDraggingFromHook ? 'opacity-70 shadow-xl' : ''
      }`}
      {...listeners}
      {...attributes}
    >
      <CardContent className="p-4">
        <div className="space-y-3">
          <div className="flex items-start justify-between gap-2">
            <div className="space-y-1">
              <h3 className={`text-sm font-semibold leading-tight ${isComplete ? 'text-slate-500 line-through' : 'text-slate-800'}`}>
                {task.title}
              </h3>
              <div className="flex items-center gap-2">
                <span className={`status-pill border ${priorityStyles[task.priority] || priorityStyles.medium}`}>
                  {task.priority}
                </span>
                <span className="status-pill border border-slate-200 bg-white text-slate-500">{task.status.replace('_', ' ')}</span>
              </div>
            </div>

            <DropdownMenu>
              <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                <Button variant="ghost" size="icon" className="h-7 w-7" onPointerDown={(e) => e.stopPropagation()}>
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onEdit(task); }}>
                  <Edit className="mr-2 h-4 w-4" />
                  Modifica
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onDelete(task.id); }} className="text-red-600">
                  <Trash2 className="mr-2 h-4 w-4" />
                  Elimina
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {task.description && <p className="line-clamp-2 text-xs text-slate-500">{task.description}</p>}

          <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
            {task.dueDate && (
              <div className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white px-2 py-1">
                <CalendarIcon className="h-3 w-3" />
                {new Date(task.dueDate).toLocaleDateString('it-IT', { day: '2-digit', month: 'short' })}
              </div>
            )}
            {((task.effortHours ?? 0) > 0 || (task.effortMinutes ?? 0) > 0) && (
              <div className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white px-2 py-1">
                <Clock className="h-3 w-3" />
                {task.effortHours ?? 0}h {task.effortMinutes ?? 0}m
              </div>
            )}
          </div>

          <div className="task-status-rail" onPointerDown={(e) => e.stopPropagation()}>
            {COLUMNS.map((statusOption) => {
              const Icon = statusOption.icon;
              const active = task.status === statusOption.id;

              return (
                <button
                  key={`${task.id}-${statusOption.id}`}
                  type="button"
                  data-active={active}
                  onClick={(e) => {
                    e.stopPropagation();
                    onQuickStatusChange(task.id, statusOption.id);
                  }}
                  title={`Sposta in ${statusOption.title}`}
                >
                  <Icon className="h-4 w-4" />
                </button>
              );
            })}
          </div>

          {assignedUser && (
            <div className="flex items-center gap-2 border-t border-slate-200 pt-2">
              <img
                src={assignedUser.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(assignedUser.displayName || 'User')}`}
                alt={assignedUser.displayName || 'User'}
                className="h-7 w-7 rounded-full border border-slate-200"
              />
              <span className="text-xs text-slate-600">{assignedUser.displayName || assignedUser.email}</span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

interface ColumnProps {
  column: (typeof COLUMNS)[number];
  tasks: Task[];
  users: UserModel[];
  onEdit: (task: Task) => void;
  onDelete: (taskId: number) => void;
  onQuickStatusChange: (taskId: number, status: TaskStatus) => void;
}

function Column({ column, tasks, users, onEdit, onDelete, onQuickStatusChange }: ColumnProps) {
  const { setNodeRef, isOver } = useDroppable({
    id: column.id,
  });

  const Icon = column.icon;

  return (
    <div className="w-full min-w-[88vw] snap-start sm:min-w-[360px] md:min-w-[250px] md:flex-1 md:snap-none lg:min-w-[290px]">
      <div className="glass-surface rounded-2xl border p-2">
        <div className={`rounded-xl border border-white/60 bg-gradient-to-br ${column.panelClass} p-3`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-white/70 bg-white/70">
                <Icon className="h-4 w-4 text-slate-700" />
              </span>
              <div>
                <h2 className="text-sm font-semibold text-slate-800">{column.title}</h2>
                <p className="text-[11px] text-slate-500">{column.subtitle}</p>
              </div>
            </div>
            <Badge className={`${column.badgeClass} border text-xs`}>{tasks.length}</Badge>
          </div>
        </div>

        <div
          ref={setNodeRef}
          className={`mt-2 min-h-[260px] rounded-xl border border-dashed bg-white/40 p-2 transition-all md:min-h-[calc(100vh-340px)] md:max-h-[calc(100vh-340px)] md:overflow-y-auto lg:min-h-[calc(100vh-330px)] lg:max-h-[calc(100vh-330px)] ${
            isOver ? `bg-white ring-2 ${column.ringClass}` : 'border-slate-200/70'
          }`}
        >
          {tasks.length === 0 ? (
            <div className="flex h-full min-h-[220px] items-center justify-center rounded-lg border border-slate-200/70 bg-slate-50/60 text-center text-sm text-slate-400">
              {isOver ? 'Rilascia qui il task' : 'Nessun task in questa fase'}
            </div>
          ) : (
            tasks.map((task) => (
              <TaskCard
                key={task.id}
                task={task}
                users={users}
                onEdit={onEdit}
                onDelete={onDelete}
                onQuickStatusChange={onQuickStatusChange}
              />
            ))
          )}
        </div>
      </div>
    </div>
  );
}

export default function TasksPage() {
  const { currentHouse } = useAppContext();
  const { tasks, isLoading, deleteTask } = useTasks();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState('');
  const [taskModalOpen, setTaskModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | undefined>(undefined);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [taskToDelete, setTaskToDelete] = useState<number | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);

  const { data: allUsers = [] } = useQuery<UserModel[]>({
    queryKey: ['/api/users'],
  });

  const updateTaskStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: number; status: TaskStatus }) => {
      const res = await apiRequest('PATCH', `/api/tasks/${id}`, { status });
      return res.json();
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/tasks'] });
    },
  });

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  const filteredTasks = useMemo(
    () =>
      tasks.filter((task) => {
        if (searchQuery && !task.title.toLowerCase().includes(searchQuery.toLowerCase())) {
          return false;
        }
        return true;
      }),
    [tasks, searchQuery]
  );

  const tasksByStatus = useMemo(
    () =>
      COLUMNS.reduce((acc, column) => {
        acc[column.id] = filteredTasks.filter((task) => task.status === column.id);
        return acc;
      }, {} as Record<TaskStatus, Task[]>),
    [filteredTasks]
  );

  const stats = useMemo(() => {
    const total = tasks.length;
    const completed = tasks.filter((task) => task.status === 'completed').length;
    const progress = total > 0 ? Math.round((completed / total) * 100) : 0;
    const urgent = tasks.filter((task) => {
      if (!task.dueDate || task.status === 'completed') return false;
      const dueDate = new Date(task.dueDate).getTime();
      const now = Date.now();
      const twoDays = 2 * 24 * 60 * 60 * 1000;
      return dueDate > now && dueDate <= now + twoDays;
    }).length;

    return { total, completed, progress, urgent };
  }, [tasks]);

  const moveTaskStatus = (taskId: number, newStatus: TaskStatus) => {
    const task = tasks.find((t) => t.id === taskId);
    if (!task || task.status === newStatus) return;

    queryClient.setQueriesData({ queryKey: ['/api/tasks'] }, (old: unknown) => {
      if (!Array.isArray(old)) return old;
      return old.map((t: Task) => (t.id === taskId ? { ...t, status: newStatus } : t));
    });

    updateTaskStatusMutation.mutate({
      id: taskId,
      status: newStatus,
    });
  };

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);

    if (!over) return;

    const taskId = parseInt(active.id as string, 10);
    let newStatus = over.id as TaskStatus;

    const isValidColumn = COLUMNS.some((col) => col.id === newStatus);

    if (!isValidColumn) {
      const droppedOnTaskId = parseInt(over.id as string, 10);
      const droppedOnTask = tasks.find((t) => t.id === droppedOnTaskId);
      if (!droppedOnTask) return;
      newStatus = droppedOnTask.status as TaskStatus;
    }

    moveTaskStatus(taskId, newStatus);
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
      deleteTask(taskToDelete);
      setDeleteDialogOpen(false);
      setTaskToDelete(null);
    }
  };

  const activeTask = activeId ? tasks.find((t) => t.id.toString() === activeId) : null;

  if (isLoading) {
    return (
      <div className="flex min-h-screen flex-col">
        <Navbar title="Tasks" />
        <div className="flex flex-1 items-center justify-center">
          <div className="h-12 w-12 animate-spin rounded-full border-b-2 border-t-2 border-primary" />
        </div>
      </div>
    );
  }

  return (
    <div className="relative flex min-h-screen flex-col">
      <Navbar title="Task Flow" />
      <Sidebar />

      <div className="md:ml-20 lg:ml-64">
        <section className="px-3 pb-3 pt-4 sm:px-4 md:px-5 lg:px-6">
          <div className="glass-surface rounded-3xl border p-4 md:p-5">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="inline-flex items-center gap-1 rounded-full border border-cyan-100 bg-cyan-50 px-2.5 py-1 text-[11px] font-semibold text-cyan-700">
                  <Sparkles className="h-3.5 w-3.5" />
                  Board dinamica
                </p>
                <h2 className="mt-2 text-xl font-bold text-slate-800 md:text-2xl">Gestisci e sposta i ticket in tempo reale</h2>
                <p className="text-sm text-slate-500">Drag & drop, cambio stato rapido e ricerca istantanea.</p>
              </div>

              <Button
                onClick={() => {
                  setEditingTask(undefined);
                  setTaskModalOpen(true);
                }}
                className="h-11 rounded-xl bg-primary px-5 text-sm font-semibold shadow-lg shadow-sky-500/30"
              >
                <Plus className="mr-2 h-4 w-4" />
                Nuovo Task
              </Button>
            </div>

            <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
              <div className="rounded-2xl border border-slate-200 bg-white/70 p-3">
                <p className="text-xs text-slate-500">Task totali</p>
                <p className="text-xl font-bold text-slate-800">{stats.total}</p>
              </div>
              <div className="rounded-2xl border border-emerald-200 bg-emerald-50/70 p-3">
                <p className="text-xs text-emerald-700">Completati</p>
                <p className="text-xl font-bold text-emerald-800">{stats.completed}</p>
              </div>
              <div className="rounded-2xl border border-amber-200 bg-amber-50/70 p-3">
                <p className="text-xs text-amber-700">In scadenza (48h)</p>
                <p className="text-xl font-bold text-amber-800">{stats.urgent}</p>
              </div>
            </div>

            <div className="mt-3">
              <div className="mb-2 flex items-center justify-between text-xs text-slate-500">
                <span>Progresso completamento</span>
                <span>{stats.progress}%</span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-slate-200">
                <div className="h-full rounded-full bg-gradient-to-r from-cyan-500 to-emerald-500 transition-all duration-700" style={{ width: `${stats.progress}%` }} />
              </div>
            </div>
          </div>
        </section>

        <section className="px-3 pb-24 sm:px-4 md:px-5 md:pb-6 lg:px-6">
          <div className="glass-surface mb-4 rounded-2xl border p-2.5 md:p-3">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input
                placeholder="Cerca task per titolo..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-11 rounded-xl border-slate-200 bg-white/80 pl-9"
              />
            </div>
          </div>

          <div className="glass-surface overflow-hidden rounded-2xl border p-2 md:p-3">
            <DndContext
              sensors={sensors}
              collisionDetection={closestCorners}
              onDragStart={handleDragStart}
              onDragEnd={handleDragEnd}
            >
              <div className="flex snap-x snap-mandatory gap-3 overflow-x-auto pb-2 md:h-[calc(100vh-280px)] md:snap-none md:pr-1 lg:gap-4 lg:h-[calc(100vh-270px)]">
                {COLUMNS.map((column) => (
                  <Column
                    key={column.id}
                    column={column}
                    tasks={tasksByStatus[column.id] || []}
                    users={allUsers}
                    onEdit={handleEditTask}
                    onDelete={handleDeleteTask}
                    onQuickStatusChange={moveTaskStatus}
                  />
                ))}
              </div>
              <DragOverlay>
                {activeTask ? (
                  <div className="rotate-2 scale-105">
                    <TaskCard
                      task={activeTask}
                      users={allUsers}
                      onEdit={handleEditTask}
                      onDelete={handleDeleteTask}
                      onQuickStatusChange={moveTaskStatus}
                      isDragging
                    />
                  </div>
                ) : null}
              </DragOverlay>
            </DndContext>
          </div>
        </section>
      </div>

      <TaskModal
        open={taskModalOpen}
        onOpenChange={(open) => {
          setTaskModalOpen(open);
          if (!open) setEditingTask(undefined);
        }}
        task={editingTask}
        users={allUsers}
      />

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminare questo task?</AlertDialogTitle>
            <AlertDialogDescription>
              Questa azione non pu\u00f2 essere annullata.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annulla</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-red-600 hover:bg-red-700">
              Elimina
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <BottomNav />
    </div>
  );
}
