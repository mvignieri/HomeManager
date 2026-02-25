import React, { useState, useMemo } from 'react';
import { format, addDays, isSameDay, isToday, parseISO, startOfDay } from 'date-fns';
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

function getEventDay(event: { start: { date?: string; dateTime?: string } }): Date | null {
  const raw = event.start.dateTime ?? event.start.date;
  if (!raw) return null;
  return startOfDay(parseISO(raw));
}

function getPriorityColor(priority: string) {
  switch (priority) {
    case 'high': return 'bg-red-500';
    case 'medium': return 'bg-amber-500';
    case 'low': return 'bg-green-500';
    default: return 'bg-gray-400';
  }
}

function getStatusColor(status: string) {
  switch (status) {
    case 'completed': return 'bg-green-500';
    case 'in_progress': return 'bg-blue-500';
    case 'assigned': return 'bg-amber-500';
    case 'created': return 'bg-slate-400';
    default: return 'bg-gray-400';
  }
}

function formatEventTime(event: { start: { date?: string; dateTime?: string }; end: { date?: string; dateTime?: string } }) {
  if (event.start.dateTime) {
    return `${format(parseISO(event.start.dateTime), 'HH:mm')} – ${format(parseISO(event.end.dateTime!), 'HH:mm')}`;
  }
  return 'All day';
}

export default function CalendarPage() {
  const { currentHouse } = useAppContext();
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [currentView, setCurrentView] = useState<'calendar' | 'day'>('calendar');
  const [taskModalOpen, setTaskModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | undefined>(undefined);
  const [defaultDateForModal, setDefaultDateForModal] = useState<string | undefined>(undefined);

  const { tasks, getTasksByDay, completeTask } = useTasks();
  const { events, isLoading: eventsLoading, isConnected, isConnecting, connect } = useGoogleCalendar();

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

  // Build sets of days that have tasks or events for calendar dots
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

  // Calendar modifiers for react-day-picker
  const modifiers = {
    hasTask: (date: Date) => taskDays.has(format(date, 'yyyy-MM-dd')),
    hasEvent: (date: Date) => eventDays.has(format(date, 'yyyy-MM-dd')),
  };

  const modifiersClassNames = {
    hasTask: 'has-task-dot',
    hasEvent: 'has-event-dot',
  };

  const handleDateClick = (date: Date | undefined) => {
    if (!date) return;
    setSelectedDate(date);
    setCurrentView('day');
  };

  const openAddTask = (date?: Date) => {
    setEditingTask(undefined);
    setDefaultDateForModal(date ? format(date, 'yyyy-MM-dd') : undefined);
    setTaskModalOpen(true);
  };

  const navigateDay = (direction: 'prev' | 'next') => {
    setSelectedDate((d) => addDays(d, direction === 'prev' ? -1 : 1));
  };

  // Events and tasks for selected day
  const tasksForDay = getTasksByDay(selectedDate);
  const eventsForDay = events.filter((ev) => {
    const d = getEventDay(ev);
    return d && isSameDay(d, selectedDate);
  });

  // Upcoming 14 days combined view
  const upcomingDays = useMemo(() => {
    const days = [];
    for (let i = 0; i < 14; i++) {
      const day = addDays(new Date(), i);
      const dayTasks = getTasksByDay(day);
      const dayStr = format(day, 'yyyy-MM-dd');
      const dayEvents = events.filter((ev) => {
        const d = getEventDay(ev);
        return d && format(d, 'yyyy-MM-dd') === dayStr;
      });
      if (dayTasks.length > 0 || dayEvents.length > 0) {
        days.push({ date: day, tasks: dayTasks, events: dayEvents });
      }
    }
    return days;
  }, [tasks, events, getTasksByDay]);

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      <Navbar title="Calendar" />
      <Sidebar />
      <header className="bg-white border-b border-gray-200 px-3 py-3 shadow-sm sm:px-4 md:ml-20 md:px-5 lg:ml-64 lg:px-6">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2">
            {currentView === 'day' && (
              <Button variant="ghost" size="icon" onClick={() => setCurrentView('calendar')}>
                <ArrowLeft className="h-4 w-4" />
              </Button>
            )}
            <p className="text-sm font-medium text-gray-600">
              {currentView === 'calendar' ? 'Monthly view' : format(selectedDate, 'MMMM d, yyyy')}
            </p>
          </div>
          <div className="flex items-center gap-2 self-start sm:self-auto">
            {isConnected ? (
              <Badge variant="outline" className="text-green-600 border-green-300 flex items-center gap-1 text-xs">
                <Wifi className="h-3 w-3" />
                Google Calendar
              </Badge>
            ) : (
              <Button
                size="sm"
                variant="outline"
                className="text-xs flex items-center gap-1"
                onClick={connect}
                disabled={isConnecting}
              >
                <CalendarIcon className="h-3 w-3" />
                {isConnecting ? 'Connecting…' : 'Connect Google Calendar'}
              </Button>
            )}
            <Button size="sm" variant="outline" className="flex items-center gap-1" onClick={() => openAddTask(currentView === 'day' ? selectedDate : undefined)}>
              <Plus className="h-4 w-4" />
              Add Task
            </Button>
          </div>
        </div>
      </header>

      {/* Calendar dot styles injected inline */}
      <style>{`
        .has-task-dot::after {
          content: '';
          display: block;
          width: 5px;
          height: 5px;
          border-radius: 50%;
          background: #f59e0b;
          margin: 1px auto 0;
        }
        .has-event-dot::before {
          content: '';
          display: block;
          width: 5px;
          height: 5px;
          border-radius: 50%;
          background: #3b82f6;
          margin: 0 auto 1px;
          position: absolute;
          bottom: 2px;
          left: 50%;
          transform: translateX(-50%);
        }
        .has-task-dot { position: relative; }
        .has-event-dot { position: relative; }
      `}</style>

      <main className="flex-grow overflow-y-auto px-3 py-5 pb-24 sm:px-4 md:ml-20 md:px-5 md:py-6 md:pb-6 lg:ml-64 lg:px-6">
        {currentView === 'calendar' ? (
          <div className="space-y-6">
            <CalendarComponent
              mode="single"
              selected={selectedDate}
              onSelect={handleDateClick}
              className="rounded-md border shadow-sm bg-white"
              modifiers={modifiers}
              modifiersClassNames={modifiersClassNames}
            />

            {/* Legend */}
            <div className="flex items-center gap-4 text-xs text-gray-500 px-1">
              <span className="flex items-center gap-1">
                <span className="inline-block w-2 h-2 rounded-full bg-amber-400" />
                App tasks
              </span>
              {isConnected && (
                <span className="flex items-center gap-1">
                  <span className="inline-block w-2 h-2 rounded-full bg-blue-500" />
                  Google Calendar events
                </span>
              )}
            </div>

            {/* Events and Tasks section */}
            <Card>
              <CardContent className="p-4">
                <h3 className="font-medium text-gray-700 mb-3">Events and Tasks</h3>
                {upcomingDays.length === 0 ? (
                  <p className="text-sm text-gray-400 text-center py-4">No upcoming events or tasks in the next 14 days</p>
                ) : (
                  <div className="space-y-4">
                    {upcomingDays.map(({ date, tasks: dayTasks, events: dayEvents }) => (
                      <div key={format(date, 'yyyy-MM-dd')}>
                        <div
                          className="text-xs font-semibold text-gray-500 mb-1 flex items-center gap-1 cursor-pointer hover:text-gray-700"
                          onClick={() => { setSelectedDate(date); setCurrentView('day'); }}
                        >
                          {isToday(date) ? 'Today' : format(date, 'EEE, MMM d')}
                        </div>
                        <div className="space-y-1.5 pl-2">
                          {dayEvents.map((ev) => (
                            <div key={ev.id} className="flex items-center gap-2 p-2 bg-blue-50 rounded text-xs">
                              <span className="inline-block w-2 h-2 rounded-full bg-blue-500 flex-shrink-0" />
                              <span className="font-medium text-blue-800 truncate">{ev.summary}</span>
                              <span className="text-blue-500 flex-shrink-0 ml-auto">{formatEventTime(ev)}</span>
                            </div>
                          ))}
                          {dayTasks.map((task) => (
                            <div key={task.id} className="flex items-center gap-2 p-2 bg-white border border-gray-100 rounded text-xs">
                              <span className={`inline-block w-2 h-2 rounded-full flex-shrink-0 ${getStatusColor(task.status)}`} />
                              <span className="font-medium text-gray-800 truncate">{task.title}</span>
                              <Badge
                                variant="outline"
                                className={`ml-auto flex-shrink-0 text-xs px-1 py-0 ${task.priority === 'high' ? 'border-red-300 text-red-600' : task.priority === 'low' ? 'border-green-300 text-green-600' : 'border-amber-300 text-amber-600'}`}
                              >
                                {task.priority}
                              </Badge>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Day navigation */}
            <div className="flex items-center justify-between">
              <Button variant="outline" size="icon" onClick={() => navigateDay('prev')}>
                <ArrowLeft className="h-4 w-4" />
              </Button>
              <div className="flex items-center gap-2">
                <Badge variant={isToday(selectedDate) ? 'default' : 'secondary'} className="px-2">
                  {isToday(selectedDate) ? 'Today' : format(selectedDate, 'EEEE')}
                </Badge>
                <span className="text-sm text-gray-500">{format(selectedDate, 'MMMM d, yyyy')}</span>
              </div>
              <Button variant="outline" size="icon" onClick={() => navigateDay('next')}>
                <ArrowRight className="h-4 w-4" />
              </Button>
            </div>

            {/* Google Calendar Events */}
            {isConnected && (
              <div className="space-y-2">
                <h3 className="font-medium text-gray-700 text-sm flex items-center gap-2">
                  <CalendarIcon className="h-4 w-4 text-blue-500" />
                  Google Calendar Events
                  {eventsLoading && <span className="text-xs text-gray-400">Loading…</span>}
                </h3>
                {eventsForDay.length === 0 ? (
                  <p className="text-xs text-gray-400 pl-6">No events</p>
                ) : (
                  <div className="space-y-2">
                    {eventsForDay.map((ev) => (
                      <div key={ev.id} className="bg-blue-50 border border-blue-100 rounded-lg p-3">
                        <div className="flex items-start justify-between">
                          <p className="text-sm font-medium text-blue-900">{ev.summary}</p>
                          <span className="text-xs text-blue-500 flex-shrink-0 ml-2">{formatEventTime(ev)}</span>
                        </div>
                        {ev.description && (
                          <p className="text-xs text-blue-700 mt-1 line-clamp-2">{ev.description}</p>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* App Tasks */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h3 className="font-medium text-gray-700 text-sm">
                  App Tasks
                </h3>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-xs">{tasksForDay.length} tasks</Badge>
                  <Button size="sm" variant="outline" className="text-xs flex items-center gap-1 h-7" onClick={() => openAddTask(selectedDate)}>
                    <Plus className="h-3 w-3" />
                    Add
                  </Button>
                </div>
              </div>

              {tasksForDay.length === 0 ? (
                <div className="bg-white rounded-lg shadow-sm p-8 text-center">
                  <CheckCircle className="h-10 w-10 text-gray-300 mx-auto mb-2" />
                  <h3 className="text-base font-medium text-gray-500">No tasks scheduled</h3>
                  <p className="text-sm text-gray-400 mt-1">Enjoy your free day!</p>
                  <Button className="mt-4" size="sm" onClick={() => openAddTask(selectedDate)}>
                    Add Task
                  </Button>
                </div>
              ) : (
                <div className="space-y-2">
                  {tasksForDay.map((task) => (
                    <div key={task.id} className="bg-white rounded-lg shadow-sm p-3 flex items-start gap-3">
                      <div className={`mt-1 w-3 h-3 rounded-full flex-shrink-0 ${getStatusColor(task.status)}`} />
                      <div className="flex-grow min-w-0">
                        <p className="text-sm font-medium text-gray-800 truncate">{task.title}</p>
                        {task.description && (
                          <p className="text-xs text-gray-500 mt-0.5 truncate">{task.description}</p>
                        )}
                        <div className="flex items-center gap-2 mt-1">
                          <span className={`inline-block w-1.5 h-1.5 rounded-full ${getPriorityColor(task.priority)}`} />
                          <span className="text-xs text-gray-400 capitalize">{task.priority}</span>
                          {task.endDate && (
                            <span className="text-xs text-gray-400">
                              → {format(new Date(task.endDate), 'MMM d')}
                            </span>
                          )}
                        </div>
                      </div>
                      {task.status !== 'completed' && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-xs flex items-center gap-1 h-7 flex-shrink-0"
                          onClick={() => completeTask(task.id)}
                        >
                          <CheckCircle className="h-3 w-3" />
                          Complete
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
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
