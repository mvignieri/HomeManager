import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import Navbar from '@/components/layout/navbar';
import Sidebar from '@/components/layout/sidebar';
import BottomNav from '@/components/layout/bottom-nav';
import { useAppContext } from '@/context/app-context';
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  ResponsiveContainer, CartesianGrid, XAxis, YAxis, Tooltip, Legend
} from 'recharts';
import { CheckCircle2, ListTodo, ShoppingCart, TrendingUp, Clock, Tag, Users, Package } from 'lucide-react';

type Period = '7' | '30' | '90' | '365';

const PERIOD_LABELS: Record<Period, string> = {
  '7': '7 giorni',
  '30': '30 giorni',
  '90': '90 giorni',
  '365': '1 anno',
};

const PRIORITY_COLORS: Record<string, string> = {
  high: '#ef4444',
  medium: '#f97316',
  low: '#22c55e',
};

const STATUS_COLORS: Record<string, string> = {
  created: '#94a3b8',
  assigned: '#3b82f6',
  in_progress: '#f59e0b',
  completed: '#22c55e',
};

const STATUS_LABELS: Record<string, string> = {
  created: 'Creato',
  assigned: 'Assegnato',
  in_progress: 'In corso',
  completed: 'Completato',
};

const CATEGORY_COLORS = [
  '#6366f1', '#22c55e', '#f59e0b', '#ef4444', '#3b82f6',
  '#ec4899', '#14b8a6', '#8b5cf6', '#f97316', '#64748b',
];

function KpiCard({ icon: Icon, label, value, sub, color }: {
  icon: React.ElementType;
  label: string;
  value: string | number;
  sub?: string;
  color?: string;
}) {
  return (
    <Card>
      <CardContent className="pt-4 pb-4">
        <div className="flex items-start gap-3">
          <div className={`p-2 rounded-lg ${color || 'bg-primary/10'}`}>
            <Icon className="h-4 w-4 text-primary" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground">{label}</p>
            <p className="text-2xl font-bold leading-tight">{value}</p>
            {sub && <p className="text-xs text-muted-foreground">{sub}</p>}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function EmptyState({ label }: { label: string }) {
  return (
    <div className="flex items-center justify-center h-32 text-muted-foreground text-sm">
      {label}
    </div>
  );
}

export default function AnalyticsPage() {
  const { currentHouse } = useAppContext();
  const [period, setPeriod] = useState<Period>('30');
  const houseId = currentHouse?.id;

  const { data: tasksData, isLoading: tasksLoading } = useQuery({
    queryKey: ['/api/analytics/tasks', houseId, period],
    queryFn: () =>
      fetch(`/api/analytics/tasks?houseId=${houseId}&period=${period}`).then(r => r.json()),
    enabled: !!houseId,
  });

  const { data: shoppingData, isLoading: shoppingLoading } = useQuery({
    queryKey: ['/api/analytics/shopping', houseId, period],
    queryFn: () =>
      fetch(`/api/analytics/shopping?houseId=${houseId}&period=${period}`).then(r => r.json()),
    enabled: !!houseId,
  });

  const byPriorityData = tasksData?.byPriority
    ? Object.entries(tasksData.byPriority).map(([key, val]) => ({
        name: key === 'high' ? 'Alta' : key === 'medium' ? 'Media' : 'Bassa',
        value: val as number,
        fill: PRIORITY_COLORS[key],
      }))
    : [];

  const byStatusData = tasksData?.byStatus
    ? Object.entries(tasksData.byStatus).map(([key, val]) => ({
        name: STATUS_LABELS[key] || key,
        value: val as number,
        fill: STATUS_COLORS[key] || '#94a3b8',
      }))
    : [];

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <Navbar />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar />
        <main className="flex-1 overflow-y-auto pb-20 md:pb-0 md:ml-20 lg:ml-64">
          <div className="max-w-5xl mx-auto px-4 py-6 space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
              <h1 className="text-2xl font-bold">Analytics</h1>
              {currentHouse && (
                <span className="text-sm text-muted-foreground">{currentHouse.name}</span>
              )}
            </div>

            {/* Period selector */}
            <div className="flex gap-2 flex-wrap">
              {(Object.keys(PERIOD_LABELS) as Period[]).map(p => (
                <button
                  key={p}
                  onClick={() => setPeriod(p)}
                  className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
                    period === p
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted text-muted-foreground hover:bg-muted/80'
                  }`}
                >
                  {PERIOD_LABELS[p]}
                </button>
              ))}
            </div>

            {!houseId ? (
              <Card>
                <CardContent className="py-12 text-center text-muted-foreground">
                  Nessuna casa selezionata
                </CardContent>
              </Card>
            ) : (
              <Tabs defaultValue="tasks">
                <TabsList className="mb-4">
                  <TabsTrigger value="tasks" className="flex items-center gap-2">
                    <ListTodo className="h-4 w-4" /> Tasks
                  </TabsTrigger>
                  <TabsTrigger value="shopping" className="flex items-center gap-2">
                    <ShoppingCart className="h-4 w-4" /> Shopping
                  </TabsTrigger>
                </TabsList>

                {/* ===== TASKS TAB ===== */}
                <TabsContent value="tasks" className="space-y-6">
                  {tasksLoading ? (
                    <div className="text-center text-muted-foreground py-12">Caricamento...</div>
                  ) : !tasksData ? (
                    <div className="text-center text-muted-foreground py-12">Errore nel caricamento</div>
                  ) : (
                    <>
                      {/* KPIs */}
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        <KpiCard icon={ListTodo} label="Creati" value={tasksData.kpi.totalCreated} />
                        <KpiCard icon={CheckCircle2} label="Completati" value={tasksData.kpi.totalCompleted} />
                        <KpiCard icon={TrendingUp} label="Tasso completamento" value={`${tasksData.kpi.completionRate}%`} />
                        <KpiCard icon={Clock} label="Ore stimate" value={tasksData.kpi.totalEffortHours} />
                      </div>

                      {/* Trend chart */}
                      <Card>
                        <CardHeader className="pb-2">
                          <CardTitle className="text-base">Andamento nel tempo</CardTitle>
                        </CardHeader>
                        <CardContent>
                          {tasksData.trend.length === 0 ? (
                            <EmptyState label="Nessun dato nel periodo selezionato" />
                          ) : (
                            <ResponsiveContainer width="100%" height={220}>
                              <AreaChart data={tasksData.trend} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                                <defs>
                                  <linearGradient id="colorCreated" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                                  </linearGradient>
                                  <linearGradient id="colorCompleted" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#22c55e" stopOpacity={0.3} />
                                    <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
                                  </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                                <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                                <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                                <Tooltip />
                                <Legend />
                                <Area type="monotone" dataKey="created" name="Creati" stroke="#6366f1" fill="url(#colorCreated)" strokeWidth={2} />
                                <Area type="monotone" dataKey="completed" name="Completati" stroke="#22c55e" fill="url(#colorCompleted)" strokeWidth={2} />
                              </AreaChart>
                            </ResponsiveContainer>
                          )}
                        </CardContent>
                      </Card>

                      {/* Priority + Status */}
                      <div className="grid md:grid-cols-2 gap-4">
                        <Card>
                          <CardHeader className="pb-2">
                            <CardTitle className="text-base">Per priorità</CardTitle>
                          </CardHeader>
                          <CardContent>
                            {byPriorityData.every(d => d.value === 0) ? (
                              <EmptyState label="Nessun dato" />
                            ) : (
                              <ResponsiveContainer width="100%" height={180}>
                                <BarChart data={byPriorityData} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                                  <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                                  <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                                  <Tooltip />
                                  <Bar dataKey="value" name="Tasks" radius={[4, 4, 0, 0]}>
                                    {byPriorityData.map((entry, i) => (
                                      <Cell key={i} fill={entry.fill} />
                                    ))}
                                  </Bar>
                                </BarChart>
                              </ResponsiveContainer>
                            )}
                          </CardContent>
                        </Card>

                        <Card>
                          <CardHeader className="pb-2">
                            <CardTitle className="text-base">Per stato</CardTitle>
                          </CardHeader>
                          <CardContent>
                            {byStatusData.every(d => d.value === 0) ? (
                              <EmptyState label="Nessun dato" />
                            ) : (
                              <ResponsiveContainer width="100%" height={180}>
                                <PieChart>
                                  <Pie
                                    data={byStatusData.filter(d => d.value > 0)}
                                    dataKey="value"
                                    nameKey="name"
                                    cx="50%"
                                    cy="50%"
                                    outerRadius={70}
                                    label={({ name, percent }) => `${name} ${Math.round(percent * 100)}%`}
                                    labelLine={false}
                                  >
                                    {byStatusData.filter(d => d.value > 0).map((entry, i) => (
                                      <Cell key={i} fill={entry.fill} />
                                    ))}
                                  </Pie>
                                  <Tooltip />
                                </PieChart>
                              </ResponsiveContainer>
                            )}
                          </CardContent>
                        </Card>
                      </div>

                      {/* Top contributors */}
                      <Card>
                        <CardHeader className="pb-2">
                          <CardTitle className="text-base flex items-center gap-2">
                            <Users className="h-4 w-4" /> Top Contributori
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          {tasksData.topContributors.length === 0 ? (
                            <EmptyState label="Nessun dato nel periodo selezionato" />
                          ) : (
                            <div className="space-y-3">
                              {tasksData.topContributors.map((c: any) => (
                                <div key={c.userId} className="flex items-center gap-3">
                                  <Avatar className="h-8 w-8">
                                    <AvatarImage src={c.photoURL || undefined} />
                                    <AvatarFallback>{c.name.charAt(0).toUpperCase()}</AvatarFallback>
                                  </Avatar>
                                  <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium truncate">{c.name}</p>
                                    <div className="flex gap-3 text-xs text-muted-foreground">
                                      <span>{c.completed} completati</span>
                                      <span>{c.completionRate}% tasso</span>
                                    </div>
                                  </div>
                                  <span className="text-sm font-bold text-primary">{c.completed}</span>
                                </div>
                              ))}
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    </>
                  )}
                </TabsContent>

                {/* ===== SHOPPING TAB ===== */}
                <TabsContent value="shopping" className="space-y-6">
                  {shoppingLoading ? (
                    <div className="text-center text-muted-foreground py-12">Caricamento...</div>
                  ) : !shoppingData ? (
                    <div className="text-center text-muted-foreground py-12">Errore nel caricamento</div>
                  ) : (
                    <>
                      {/* KPIs */}
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        <KpiCard icon={ShoppingCart} label="Aggiunti" value={shoppingData.kpi.totalAdded} />
                        <KpiCard icon={CheckCircle2} label="Acquistati" value={shoppingData.kpi.totalPurchased} />
                        <KpiCard icon={TrendingUp} label="Tasso acquisto" value={`${shoppingData.kpi.purchaseRate}%`} />
                        <KpiCard icon={Tag} label="Categorie usate" value={shoppingData.kpi.categoriesUsed} />
                      </div>

                      {/* Trend chart */}
                      <Card>
                        <CardHeader className="pb-2">
                          <CardTitle className="text-base">Andamento nel tempo</CardTitle>
                        </CardHeader>
                        <CardContent>
                          {shoppingData.trend.length === 0 ? (
                            <EmptyState label="Nessun dato nel periodo selezionato" />
                          ) : (
                            <ResponsiveContainer width="100%" height={220}>
                              <AreaChart data={shoppingData.trend} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                                <defs>
                                  <linearGradient id="colorAdded" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                                  </linearGradient>
                                  <linearGradient id="colorPurchased" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#22c55e" stopOpacity={0.3} />
                                    <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
                                  </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                                <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                                <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                                <Tooltip />
                                <Legend />
                                <Area type="monotone" dataKey="added" name="Aggiunti" stroke="#6366f1" fill="url(#colorAdded)" strokeWidth={2} />
                                <Area type="monotone" dataKey="purchased" name="Acquistati" stroke="#22c55e" fill="url(#colorPurchased)" strokeWidth={2} />
                              </AreaChart>
                            </ResponsiveContainer>
                          )}
                        </CardContent>
                      </Card>

                      {/* By category */}
                      <Card>
                        <CardHeader className="pb-2">
                          <CardTitle className="text-base">Distribuzione per categoria</CardTitle>
                        </CardHeader>
                        <CardContent>
                          {shoppingData.byCategory.length === 0 ? (
                            <EmptyState label="Nessun dato nel periodo selezionato" />
                          ) : (
                            <ResponsiveContainer width="100%" height={220}>
                              <PieChart>
                                <Pie
                                  data={shoppingData.byCategory}
                                  dataKey="count"
                                  nameKey="label"
                                  cx="50%"
                                  cy="50%"
                                  outerRadius={80}
                                  label={({ label, percent }) => `${label} ${Math.round(percent * 100)}%`}
                                  labelLine={false}
                                >
                                  {shoppingData.byCategory.map((_: any, i: number) => (
                                    <Cell key={i} fill={CATEGORY_COLORS[i % CATEGORY_COLORS.length]} />
                                  ))}
                                </Pie>
                                <Tooltip formatter={(val: any, name: any) => [val, name]} />
                              </PieChart>
                            </ResponsiveContainer>
                          )}
                        </CardContent>
                      </Card>

                      {/* Top products */}
                      <Card>
                        <CardHeader className="pb-2">
                          <CardTitle className="text-base flex items-center gap-2">
                            <Package className="h-4 w-4" /> Prodotti più acquistati
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          {shoppingData.topProducts.length === 0 ? (
                            <EmptyState label="Nessun dato nel periodo selezionato" />
                          ) : (
                            <ResponsiveContainer width="100%" height={Math.min(shoppingData.topProducts.length * 36, 300)}>
                              <BarChart
                                data={shoppingData.topProducts}
                                layout="vertical"
                                margin={{ top: 0, right: 20, left: 0, bottom: 0 }}
                              >
                                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                                <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11 }} />
                                <YAxis type="category" dataKey="name" width={90} tick={{ fontSize: 11 }} />
                                <Tooltip />
                                <Bar dataKey="count" name="Volte" fill="#6366f1" radius={[0, 4, 4, 0]} />
                              </BarChart>
                            </ResponsiveContainer>
                          )}
                        </CardContent>
                      </Card>

                      {/* Top shoppers */}
                      <Card>
                        <CardHeader className="pb-2">
                          <CardTitle className="text-base flex items-center gap-2">
                            <Users className="h-4 w-4" /> Top Acquirenti
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          {shoppingData.topShoppers.length === 0 ? (
                            <EmptyState label="Nessun dato nel periodo selezionato" />
                          ) : (
                            <div className="space-y-3">
                              {shoppingData.topShoppers.map((s: any) => (
                                <div key={s.userId} className="flex items-center gap-3">
                                  <Avatar className="h-8 w-8">
                                    <AvatarImage src={s.photoURL || undefined} />
                                    <AvatarFallback>{s.name.charAt(0).toUpperCase()}</AvatarFallback>
                                  </Avatar>
                                  <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium truncate">{s.name}</p>
                                  </div>
                                  <span className="text-sm font-bold text-primary">{s.purchased} acquisti</span>
                                </div>
                              ))}
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    </>
                  )}
                </TabsContent>
              </Tabs>
            )}
          </div>
        </main>
      </div>
      <BottomNav />
    </div>
  );
}
