import { useEffect, useState } from 'react';
import { format, isSameDay, parseISO, startOfDay } from 'date-fns';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Calendar, CheckCircle, Sunrise, Sun, Moon } from 'lucide-react';
import { useTasks } from '@/hooks/use-tasks';
import { useAppContext } from '@/context/app-context';
import { GoogleCalendarEvent } from '@/hooks/use-google-calendar';

const BRIEFING_DATE_KEY = 'daily_briefing_date';

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return { text: 'Good morning', Icon: Sunrise };
  if (hour < 18) return { text: 'Good afternoon', Icon: Sun };
  return { text: 'Good evening', Icon: Moon };
}

function getEventDay(ev: GoogleCalendarEvent): Date | null {
  const raw = ev.start.dateTime ?? ev.start.date;
  if (!raw) return null;
  return startOfDay(parseISO(raw));
}

function formatEventTime(ev: GoogleCalendarEvent) {
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

interface DailyBriefingModalProps {
  userName?: string | null;
}

export default function DailyBriefingModal({ userName }: DailyBriefingModalProps) {
  const [open, setOpen] = useState(false);
  const today = new Date();

  const { getTasksByDay } = useTasks();
  const { events, isConnected } = useAppContext().googleCalendar;

  const todayTasks = getTasksByDay(today);
  const todayEvents = events.filter((ev) => {
    const d = getEventDay(ev);
    return d && isSameDay(d, today);
  });

  // Open modal on first access of the day
  useEffect(() => {
    const todayStr = format(today, 'yyyy-MM-dd');
    const lastShown = localStorage.getItem(BRIEFING_DATE_KEY);
    if (lastShown !== todayStr) {
      // Small delay so the rest of the app renders first
      const id = setTimeout(() => setOpen(true), 800);
      return () => clearTimeout(id);
    }
  }, []);

  const handleClose = () => {
    localStorage.setItem(BRIEFING_DATE_KEY, format(today, 'yyyy-MM-dd'));
    setOpen(false);
  };

  const { text: greetingText, Icon: GreetingIcon } = getGreeting();
  const displayName = userName?.split(' ')[0] || 'there';

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) handleClose(); }}>
      <DialogContent className="max-w-md max-h-[80vh] flex flex-col gap-0 p-0 overflow-hidden">
        <DialogHeader className="px-5 pt-5 pb-3 shrink-0">
          <DialogTitle className="flex items-center gap-2 text-lg">
            <GreetingIcon className="h-5 w-5 text-amber-500" />
            {greetingText}, {displayName}!
          </DialogTitle>
          <p className="text-sm text-gray-500 mt-0.5">
            Here's your overview for {format(today, 'EEEE, MMMM d')}
          </p>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-5 pb-5 space-y-5">

          {/* Google Calendar events */}
          {isConnected && (
            <div className="space-y-2">
              <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                <Calendar className="h-4 w-4 text-blue-500" />
                Calendar events
                <Badge variant="outline" className="text-xs ml-1">{todayEvents.length}</Badge>
              </h3>
              {todayEvents.length === 0 ? (
                <p className="text-xs text-gray-400 pl-6">No events today</p>
              ) : (
                <div className="space-y-1.5">
                  {todayEvents.map((ev) => (
                    <div
                      key={ev.id}
                      className="flex items-start gap-2 rounded-lg p-2.5 text-sm"
                      style={{
                        backgroundColor: ev.calendarColor ? `${ev.calendarColor}18` : '#eff6ff',
                        borderLeft: `3px solid ${ev.calendarColor ?? '#3b82f6'}`,
                      }}
                    >
                      <div className="flex-grow min-w-0">
                        <p className="font-medium text-gray-800 truncate">{ev.summary}</p>
                      </div>
                      <span className="text-xs text-gray-500 flex-shrink-0">{formatEventTime(ev)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Tasks */}
          <div className="space-y-2">
            <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-amber-500" />
              Tasks
              <Badge variant="outline" className="text-xs ml-1">{todayTasks.length}</Badge>
            </h3>
            {todayTasks.length === 0 ? (
              <p className="text-xs text-gray-400 pl-6">No tasks due today</p>
            ) : (
              <div className="space-y-1.5">
                {todayTasks.map((task) => (
                  <div
                    key={task.id}
                    className="flex items-center gap-2.5 rounded-lg border bg-white p-2.5"
                  >
                    <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${getStatusColor(task.status)}`} />
                    <p className="text-sm text-gray-800 truncate flex-grow">{task.title}</p>
                    <Badge
                      variant="outline"
                      className={`text-xs flex-shrink-0 ${
                        task.priority === 'high'
                          ? 'text-red-600 border-red-200'
                          : task.priority === 'low'
                          ? 'text-green-600 border-green-200'
                          : 'text-amber-600 border-amber-200'
                      }`}
                    >
                      {task.priority}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Empty state */}
          {!isConnected && todayTasks.length === 0 && (
            <p className="text-sm text-gray-400 text-center py-4">
              You have a free day today!
            </p>
          )}
        </div>

        <div className="px-5 pb-5 pt-2 shrink-0 border-t border-gray-100">
          <Button className="w-full" onClick={handleClose}>
            Let's get started
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
