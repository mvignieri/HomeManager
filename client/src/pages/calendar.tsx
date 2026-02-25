import React, { useState, useMemo } from 'react';
import { format, addDays, isSameDay, isToday, parseISO, startOfDay, startOfMonth, endOfMonth } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import {
  Plus, ArrowLeft, ArrowRight, CheckCircle, Calendar as CalendarIcon, Wifi,
} from 'lucide-react';
import Navbar from '@/components/layout/navbar';
import Sidebar from '@/components/layout/sidebar';
import BottomNav from '@/components/layout/bottom-nav';
import TaskModal from '@/components/tasks/task-modal';
import { useTasks } from '@/hooks/use-tasks';
import { useGoogleCalendar } from '@/hooks/use-google-calendar';
import { useQuery } from '@tanstack/react-query';
import { User, Task } from '@shared/schema';
import { useAppContext } from '@/context/app-context';

function getEventDay(ev: { start: { date?: string; dateTime?: string } }): Date | null {
  const raw = ev.start.dateTime ?? ev.start.date;
  if (!raw) return null;
  return startOfDay(parseISO(raw));
}

function formatEventTime(ev: { start: { date?: string; dateTime?: string }; end: { date?: string; dateTime?: string } }) {
  if (ev.start.dateTime) {
    return `${format(parseISO(ev.start.dateTime), 'HH:mm')} – ${format(parseISO(ev.end.dateTime!), 'HH:mm')}`;
  }
  return 'All day';
}

function getStatusColor(status: string) {
  switch (status) {
    case 'completed':   return 'bg-green-500';
    case 'in_progress': return 'bg-blue-500';
    case 'assigned':    return 'bg-amber-500';
    default:            return 'bg-slate-400';
  }
}

function getPriorityColor(priority: string) {
  switch (priority) {
    case 'high':   return 'text-red-600 border-red-200';
    case 'low':    return 'text-green-600 border-green-200';
    default:       return 'text-amber-600 border-amber-200';
  }
}

export default function CalendarPage() {
  const { currentHouse, user } = useAppContext();

  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  // Controlled month so the calendar follows when navigating days with arrows
  const [calendarMonth, setCalendarMonth] = useState<Date>(new Date());

  const [taskModalOpen, setTaskModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | undefined>(undefined);
  const [defaultDateForModal, setDefaultDateForModal] = useState<string | undefined>(undefined);

  const { tasks, getTasksByDay, completeTask } = useTasks();
  const { events, isLoading: eventsLoading, isConnected, isConnecting, needsReconnect, reconnect } =
    useGoogleCalendar(user?.email ?? undefined);

  const { data: houseMembers = [] } = useQuery<User[]>({
    queryKey: ['/api/houses', currentHouse?.id, 'members'],
    queryFn: async () => {
      if (!currentHouse?.id) return [];
      const res = await fetch(`/api/houses/${currentHouse.id}/members`);
      if (!res.ok) return [];
      const members = await res.json();
      return members.map((m: any) => m.user || m).filter(Boolean);
    },
    enabled: !!currentHouse?.id,
  });

  // ── Dot modifiers ──────────────────────────────────────────────────────────
  const taskDays = useMemo(() => {
    const days = new Set<string>();
    tasks.forEach((task) => {
      if (!task.dueDate) return;
      const start = startOfDay(new Date(task.dueDate));
      const end = task.endDate ? startOfDay(new Date(task.endDate)) : start;
      let cur = start;
      while (cur <= end) {
        days.add(format(cur, 'yyyy-MM-dd'));
        cur = addDays(cur, 1);
      }
    });
    return days;
  }, [tasks]);

  const eventDays = useMemo(() => {
    const days = new Set<string>();
    events.forEach((ev) => {
      const d = getEventDay(ev);
      if (d) days.add(format(d, 'yyyy-MM-dd'));
    });
    return days;
  }, [events]);

  const modifiers = {
    hasTask:  (date: Date) => taskDays.has(format(date, 'yyyy-MM-dd')),
    hasEvent: (date: Date) => eventDays.has(format(date, 'yyyy-MM-dd')),
  };
  const modifiersClassNames = {
    hasTask:  'has-task-dot',
    hasEvent: 'has-event-dot',
  };

  // ── Day selection & navigation ─────────────────────────────────────────────
  const handleDateSelect = (date: Date | undefined) => {
    if (!date) return;
    setSelectedDate(date);
    // Keep calendar on the same month the user is viewing
  };

  const navigateDay = (dir: 'prev' | 'next') => {
    setSelectedDate((d) => {
      const next = addDays(d, dir === 'prev' ? -1 : 1);
      // If month changed, scroll the calendar to show the new month
      if (next.getMonth() !== d.getMonth() || next.getFullYear() !== d.getFullYear()) {
        setCalendarMonth(next);
      }
      return next;
    });
  };

  // ── Events / tasks for selected day ───────────────────────────────────────
  const tasksForDay  = getTasksByDay(selectedDate);
  const eventsForDay = events.filter((ev) => {
    const d = getEventDay(ev);
    return d && isSameDay(d, selectedDate);
  });

  const monthTaskCount = useMemo(() => {
    const monthStart = startOfMonth(calendarMonth);
    const monthEnd = endOfMonth(calendarMonth);

    return tasks.filter((task) => {
      if (!task.dueDate) return false;
      const start = startOfDay(new Date(task.dueDate));
      const end = task.endDate ? startOfDay(new Date(task.endDate)) : start;
      return start <= monthEnd && end >= monthStart;
    }).length;
  }, [tasks, calendarMonth]);

  // ── Modal helpers ──────────────────────────────────────────────────────────
  const openAddTask = (date?: Date) => {
    setEditingTask(undefined);
    setDefaultDateForModal(date ? format(date, 'yyyy-MM-dd') : undefined);
    setTaskModalOpen(true);
  };

  return (
    <div className="relative flex min-h-screen flex-col">
      <Navbar title="Calendar" />
      <Sidebar />

      {/* Header */}
      <header className="px-3 pb-3 pt-4 sm:px-4 md:ml-20 md:px-5 lg:ml-64 lg:px-6">
        <div className="glass-surface rounded-3xl border p-3.5 sm:p-4 md:p-5">
          <div className="flex flex-col gap-3 sm:gap-3.5 md:flex-row md:items-start md:justify-between">
            <div>
              <p className="inline-flex items-center gap-1 rounded-full border border-cyan-100 bg-cyan-50 px-2.5 py-1 text-[11px] font-semibold text-cyan-700">
                <CalendarIcon className="h-3.5 w-3.5" />
                Agenda mensile
              </p>
              <h2 className="mt-2 text-lg font-bold text-slate-800 sm:text-xl md:text-2xl">
                {format(calendarMonth, 'MMMM yyyy')}
              </h2>
              <p className="text-xs text-slate-500 sm:text-sm">
                Vista rapida di task ed eventi sul giorno selezionato.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2 sm:justify-end">
              {isConnected ? (
                <Badge variant="outline" className="border-emerald-300 bg-emerald-50 text-emerald-700">
                  <Wifi className="mr-1 h-3.5 w-3.5" />
                  Google connesso
                </Badge>
              ) : isConnecting ? (
                <Badge variant="outline" className="border-slate-300 bg-slate-50 text-slate-500">
                  <CalendarIcon className="mr-1 h-3.5 w-3.5 animate-pulse" />
                  Connessione...
                </Badge>
              ) : needsReconnect ? (
                <Button size="sm" variant="outline" className="h-9 border-amber-300 bg-amber-50 text-amber-700 hover:bg-amber-100" onClick={reconnect}>
                  <CalendarIcon className="mr-1.5 h-3.5 w-3.5" />
                  Ricollega Google
                </Button>
              ) : null}

              <Button size="sm" className="h-9 w-full rounded-xl bg-primary px-4 text-white sm:w-auto" onClick={() => openAddTask(selectedDate)}>
                <Plus className="mr-1.5 h-4 w-4" />
                Nuovo Task
              </Button>
            </div>
          </div>

          <div className="mt-3.5 grid grid-cols-2 gap-2 sm:mt-4 sm:gap-2.5 md:grid-cols-3">
            <div className="rounded-2xl border border-slate-200 bg-white/70 p-3">
              <p className="text-[11px] text-slate-500 sm:text-xs">Task nel mese</p>
              <p className="text-lg font-bold text-slate-800 sm:text-xl">{monthTaskCount}</p>
            </div>
            <div className="rounded-2xl border border-amber-200 bg-amber-50/70 p-3">
              <p className="text-[11px] text-amber-700 sm:text-xs">Task nel giorno</p>
              <p className="text-lg font-bold text-amber-800 sm:text-xl">{tasksForDay.length}</p>
            </div>
            <div className="col-span-2 rounded-2xl border border-sky-200 bg-sky-50/70 p-3 md:col-span-1">
              <p className="text-[11px] text-sky-700 sm:text-xs">Eventi nel giorno</p>
              <p className="text-lg font-bold text-sky-800 sm:text-xl">{isConnected ? eventsForDay.length : 0}</p>
            </div>
          </div>
        </div>
      </header>

      {/* Dot styles */}
      <style>{`
        .has-task-dot, .has-event-dot { position: relative; }
        .has-task-dot::after {
          content: '';
          position: absolute;
          bottom: 2px;
          left: 50%;
          transform: translateX(-50%);
          width: 4px; height: 4px;
          border-radius: 50%;
          background: #f59e0b;
        }
        .has-event-dot::before {
          content: '';
          position: absolute;
          bottom: 2px;
          left: calc(50% - 5px);
          width: 4px; height: 4px;
          border-radius: 50%;
          background: #3b82f6;
        }
        .has-task-dot.has-event-dot::after  { left: calc(50% + 1px); }
        .has-task-dot.has-event-dot::before { left: calc(50% - 5px); }
      `}</style>

      <main className="flex-grow space-y-4 overflow-y-auto px-3 py-1 pb-24 sm:px-4 md:ml-20 md:px-5 md:py-2 md:pb-6 lg:ml-64 lg:px-6">

        {/* ── Calendar – always visible ──────────────────────────────────── */}
        <CalendarComponent
          mode="single"
          selected={selectedDate}
          onSelect={handleDateSelect}
          month={calendarMonth}
          onMonthChange={setCalendarMonth}
          className="glass-surface w-full rounded-2xl border p-1 shadow-none"
          modifiers={modifiers}
          modifiersClassNames={modifiersClassNames}
        />

        {/* Legend */}
        <div className="flex items-center gap-4 text-xs text-gray-500 px-1">
          <span className="flex items-center gap-1">
            <span className="inline-block w-2 h-2 rounded-full bg-amber-400" />
            Tasks
          </span>
          {isConnected && (
            <span className="flex items-center gap-1">
              <span className="inline-block w-2 h-2 rounded-full bg-blue-500" />
              Google Calendar
            </span>
          )}
        </div>

        {/* ── Selected day detail ────────────────────────────────────────── */}
        <Card className="glass-surface rounded-2xl border shadow-none">
          <CardContent className="p-4 space-y-4">

            {/* Day navigation */}
            <div className="flex items-center justify-between">
              <Button variant="outline" size="icon" onClick={() => navigateDay('prev')}>
                <ArrowLeft className="h-4 w-4" />
              </Button>
              <div className="flex items-center gap-2">
                <Badge variant={isToday(selectedDate) ? 'default' : 'secondary'}>
                  {isToday(selectedDate) ? 'Today' : format(selectedDate, 'EEEE')}
                </Badge>
                <span className="text-sm text-gray-600">{format(selectedDate, 'MMMM d, yyyy')}</span>
              </div>
              <Button variant="outline" size="icon" onClick={() => navigateDay('next')}>
                <ArrowRight className="h-4 w-4" />
              </Button>
            </div>

            {/* Google Calendar events for selected day */}
            {isConnected && (
              <div className="space-y-2">
                <h3 className="text-sm font-medium text-gray-600 flex items-center gap-2">
                  <CalendarIcon className="h-4 w-4 text-blue-500" />
                  Google Calendar
                  {eventsLoading && <span className="text-xs text-gray-400">Loading…</span>}
                </h3>
                {eventsForDay.length === 0 ? (
                  <p className="text-xs text-gray-400 pl-6">No events</p>
                ) : (
                  <div className="space-y-1.5 pl-1">
                    {eventsForDay.map((ev) => (
                      <div
                        key={ev.id}
                        className="flex items-start gap-2 rounded-xl border border-white/70 bg-white/70 p-2.5 text-sm"
                        style={{ backgroundColor: ev.calendarColor ? `${ev.calendarColor}18` : '#eff6ff', borderLeft: `3px solid ${ev.calendarColor ?? '#3b82f6'}` }}
                      >
                        <div className="flex-grow min-w-0">
                          <p className="font-medium text-gray-800 truncate">{ev.summary}</p>
                          {ev.description && (
                            <p className="text-xs text-gray-500 mt-0.5 line-clamp-1">{ev.description}</p>
                          )}
                        </div>
                        <span className="text-xs text-gray-500 flex-shrink-0">{formatEventTime(ev)}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* App tasks for selected day */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-medium text-gray-600">
                  Tasks
                  <Badge variant="outline" className="ml-2 text-xs">{tasksForDay.length}</Badge>
                </h3>
                <Button size="sm" variant="outline" className="h-7 text-xs flex items-center gap-1" onClick={() => openAddTask(selectedDate)}>
                  <Plus className="h-3 w-3" />
                  Add
                </Button>
              </div>

              {tasksForDay.length === 0 ? (
                <div className="text-center py-6">
                  <CheckCircle className="h-8 w-8 text-gray-300 mx-auto mb-2" />
                  <p className="text-sm text-gray-400">No tasks for this day</p>
                  <Button className="mt-3" size="sm" variant="outline" onClick={() => openAddTask(selectedDate)}>
                    Add Task
                  </Button>
                </div>
              ) : (
                <div className="space-y-1.5">
                  {tasksForDay.map((task) => (
                    <div key={task.id} className="flex items-center gap-3 rounded-xl border border-white/70 bg-white/75 p-2.5">
                      <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${getStatusColor(task.status)}`} />
                      <div className="flex-grow min-w-0">
                        <p className="text-sm font-medium text-gray-800 truncate">{task.title}</p>
                        {task.endDate && (
                          <p className="text-xs text-gray-400">→ {format(new Date(task.endDate), 'MMM d')}</p>
                        )}
                      </div>
                      <Badge variant="outline" className={`text-xs flex-shrink-0 ${getPriorityColor(task.priority)}`}>
                        {task.priority}
                      </Badge>
                      {task.status !== 'completed' && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 px-2 text-xs text-gray-500 flex-shrink-0"
                          onClick={() => completeTask(task.id)}
                        >
                          <CheckCircle className="h-3.5 w-3.5" />
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

          </CardContent>
        </Card>
      </main>

      <BottomNav />

      <TaskModal
        open={taskModalOpen}
        onOpenChange={setTaskModalOpen}
        task={editingTask}
        users={houseMembers}
        defaultDate={defaultDateForModal}
      />
    </div>
  );
}
