import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem
} from '@/components/ui/select';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Link } from 'wouter';
import {
  Home, Calendar, Laptop, BarChart3,
  PieChart, AreaChart, UserCheck, Clock,
  ArrowUpRight, ArrowDownRight, Minus,
  Filter, CheckSquare as CheckCircle2
} from 'lucide-react';
import Navbar from '@/components/layout/navbar';
import Sidebar from '@/components/layout/sidebar';
import BottomNav from '@/components/layout/bottom-nav';

export default function AnalyticsPage() {
  // Mock analytics data
  const [selectedHouse, setSelectedHouse] = useState<string>('all');
  const [timePeriod, setTimePeriod] = useState<'week' | 'month' | 'year'>('week');
  
  const houses = [
    { id: 1, name: 'Main House' },
    { id: 2, name: 'Beach House' },
    { id: 3, name: 'Mountain Cabin' }
  ];
  
  const taskCompletionRate = 78;
  
  const tasksByPriority = {
    high: 8,
    medium: 12,
    low: 5
  };
  
  const tasksByStatus = {
    created: 15,
    assigned: 10,
    completed: 25
  };
  
  const taskDistribution = [
    { date: 'Mon', created: 5, completed: 3 },
    { date: 'Tue', created: 4, completed: 4 },
    { date: 'Wed', created: 7, completed: 5 },
    { date: 'Thu', created: 3, completed: 2 },
    { date: 'Fri', created: 6, completed: 4 },
    { date: 'Sat', created: 2, completed: 1 },
    { date: 'Sun', created: 1, completed: 1 },
  ];
  
  const topContributors = [
    { userId: 1, name: 'John Doe', photoURL: 'https://ui-avatars.com/api/?name=John+Doe', taskCount: 42, completionRate: 75 },
    { userId: 2, name: 'Sarah Johnson', photoURL: 'https://ui-avatars.com/api/?name=Sarah+Johnson', taskCount: 35, completionRate: 60 },
    { userId: 3, name: 'Michael Brown', photoURL: 'https://ui-avatars.com/api/?name=Michael+Brown', taskCount: 28, completionRate: 45 },
  ];
  
  const totalCreated = taskDistribution.reduce((sum, day) => sum + day.created, 0);
  const totalCompleted = taskDistribution.reduce((sum, day) => sum + day.completed, 0);
  const trendPercentage = Math.round((totalCompleted / totalCreated) * 100);
  const trendPositive = trendPercentage >= 50;

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      <Navbar title="Analytics" />
      <Sidebar />
      <header className="bg-white border-b border-gray-200 px-3 py-3 shadow-sm sm:px-4 md:ml-20 md:px-5 lg:ml-64 lg:px-6">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm font-medium text-gray-600">Filtra i dati della casa</p>
          <Select 
            value={selectedHouse}
            onValueChange={setSelectedHouse}
          >
            <SelectTrigger className="w-full sm:w-[180px] md:w-[160px] lg:w-[180px]">
              <SelectValue placeholder="Select house" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Properties</SelectItem>
              {houses.map(house => (
                <SelectItem key={house.id} value={house.id.toString()}>
                  {house.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </header>

      <main className="flex-grow overflow-y-auto px-3 py-5 pb-24 space-y-5 sm:px-4 md:ml-20 md:px-5 md:py-6 md:pb-6 md:space-y-6 lg:ml-64 lg:px-6">
        {/* Top Stats Cards */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Card className="shadow-sm">
            <CardContent className="p-4">
              <div className="flex flex-col items-center justify-center h-32">
                <div className="relative h-24 w-24 rounded-full flex items-center justify-center mb-2"
                     style={{
                       background: `conic-gradient(#3b82f6 ${taskCompletionRate}%, #e5e7eb ${taskCompletionRate}% 100%)`
                     }}>
                  <div className="absolute h-20 w-20 rounded-full bg-white flex items-center justify-center">
                    <span className="text-2xl font-bold">{taskCompletionRate}%</span>
                  </div>
                </div>
                <span className="text-sm text-gray-500">Task Completion</span>
              </div>
            </CardContent>
          </Card>
          
          <Card className="shadow-sm">
            <CardContent className="p-4">
              <div className="h-32 flex flex-col justify-between">
                <div className="text-sm text-gray-500 mb-2">Weekly Trend</div>
                <div className="flex items-center">
                  <span className="text-2xl font-bold">{trendPercentage}%</span>
                  <div className={`ml-2 ${trendPositive ? 'text-green-500' : 'text-red-500'} flex items-center`}>
                    {trendPositive ? (
                      <ArrowUpRight className="h-4 w-4 mr-1" />
                    ) : (
                      <ArrowDownRight className="h-4 w-4 mr-1" />
                    )}
                    <span className="text-xs">{trendPositive ? 'Positive' : 'Negative'}</span>
                  </div>
                </div>
                <div className="flex items-end mt-2">
                  <div className="flex space-x-1 flex-grow">
                    {taskDistribution.map((day, i) => (
                      <div key={i} className="flex flex-col items-center flex-1">
                        <div className="relative h-12 w-full">
                          <div className="absolute bottom-0 inset-x-0 bg-blue-100 rounded-sm"
                               style={{ height: `${(day.created / 10) * 100}%` }}></div>
                          <div className="absolute bottom-0 inset-x-0 bg-blue-500 rounded-sm"
                               style={{ height: `${(day.completed / 10) * 100}%` }}></div>
                        </div>
                        <span className="text-xs text-gray-500 mt-1">{day.date.charAt(0)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
        
        {/* Task by Priority Chart */}
        <Card className="shadow-sm">
          <CardHeader className="pb-2">
            <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
              <div>
                <CardTitle className="text-lg font-semibold">Task Distribution</CardTitle>
                <CardDescription>Analysis by priority and status</CardDescription>
              </div>
              <Tabs defaultValue="priority" className="w-full md:w-[220px] lg:w-[250px]">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="priority">By Priority</TabsTrigger>
                  <TabsTrigger value="status">By Status</TabsTrigger>
                </TabsList>
                <TabsContent value="priority">
                  <div className="h-[200px] mt-4 flex items-end justify-center space-x-6">
                    <div className="text-center">
                      <div className="w-16 bg-red-400 rounded-t-md mx-auto" 
                        style={{ height: `${(tasksByPriority.high / (tasksByPriority.high + tasksByPriority.medium + tasksByPriority.low)) * 150}px` }}>
                      </div>
                      <div className="mt-2 text-sm text-gray-600">High</div>
                      <div className="font-medium text-sm">{tasksByPriority.high}</div>
                    </div>
                    <div className="text-center">
                      <div className="w-16 bg-amber-400 rounded-t-md mx-auto"
                        style={{ height: `${(tasksByPriority.medium / (tasksByPriority.high + tasksByPriority.medium + tasksByPriority.low)) * 150}px` }}>
                      </div>
                      <div className="mt-2 text-sm text-gray-600">Medium</div>
                      <div className="font-medium text-sm">{tasksByPriority.medium}</div>
                    </div>
                    <div className="text-center">
                      <div className="w-16 bg-green-400 rounded-t-md mx-auto"
                        style={{ height: `${(tasksByPriority.low / (tasksByPriority.high + tasksByPriority.medium + tasksByPriority.low)) * 150}px` }}>
                      </div>
                      <div className="mt-2 text-sm text-gray-600">Low</div>
                      <div className="font-medium text-sm">{tasksByPriority.low}</div>
                    </div>
                  </div>
                </TabsContent>
                <TabsContent value="status">
                  <div className="h-[200px] mt-4 flex items-end justify-center space-x-6">
                    <div className="text-center">
                      <div className="w-16 bg-blue-400 rounded-t-md mx-auto" 
                        style={{ height: `${(tasksByStatus.created / (tasksByStatus.created + tasksByStatus.assigned + tasksByStatus.completed)) * 150}px` }}>
                      </div>
                      <div className="mt-2 text-sm text-gray-600">Created</div>
                      <div className="font-medium text-sm">{tasksByStatus.created}</div>
                    </div>
                    <div className="text-center">
                      <div className="w-16 bg-amber-400 rounded-t-md mx-auto"
                        style={{ height: `${(tasksByStatus.assigned / (tasksByStatus.created + tasksByStatus.assigned + tasksByStatus.completed)) * 150}px` }}>
                      </div>
                      <div className="mt-2 text-sm text-gray-600">Assigned</div>
                      <div className="font-medium text-sm">{tasksByStatus.assigned}</div>
                    </div>
                    <div className="text-center">
                      <div className="w-16 bg-green-400 rounded-t-md mx-auto"
                        style={{ height: `${(tasksByStatus.completed / (tasksByStatus.created + tasksByStatus.assigned + tasksByStatus.completed)) * 150}px` }}>
                      </div>
                      <div className="mt-2 text-sm text-gray-600">Completed</div>
                      <div className="font-medium text-sm">{tasksByStatus.completed}</div>
                    </div>
                  </div>
                </TabsContent>
              </Tabs>
            </div>
          </CardHeader>
        </Card>
        
        {/* Task Distribution */}
        <Card className="shadow-sm">
          <CardHeader className="pb-2">
            <div className="flex justify-between">
              <div>
                <CardTitle className="text-lg font-semibold">Task Creation vs Completion</CardTitle>
                <CardDescription>Tasks over time</CardDescription>
              </div>
              <Select 
                value={timePeriod}
                onValueChange={(value) => setTimePeriod(value as 'week' | 'month' | 'year')}
              >
                <SelectTrigger className="w-[120px]">
                  <SelectValue placeholder="Select period" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="week">Week</SelectItem>
                  <SelectItem value="month">Month</SelectItem>
                  <SelectItem value="year">Year</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardHeader>
          <CardContent>
            <div className="h-[250px] relative">
              {/* Chart Legend */}
              <div className="flex items-center justify-end space-x-4 mb-4">
                <div className="flex items-center">
                  <div className="w-3 h-3 bg-blue-200 mr-2"></div>
                  <span className="text-xs text-gray-500">Created</span>
                </div>
                <div className="flex items-center">
                  <div className="w-3 h-3 bg-blue-500 mr-2"></div>
                  <span className="text-xs text-gray-500">Completed</span>
                </div>
              </div>
              
              {/* Simple chart visualization */}
              <div className="flex items-end h-[200px]">
                {taskDistribution.map((day, index) => (
                  <div key={index} className="flex-1 flex flex-col items-center">
                    <div className="relative h-full w-full flex flex-col justify-end items-center">
                      <div className="relative w-10 bg-blue-200 mb-1"
                           style={{ height: `${(day.created / 10) * 100}%` }}>
                        <div className="absolute top-0 left-0 right-0 text-xs text-center -mt-5">
                          {day.created}
                        </div>
                      </div>
                      <div className="relative w-5 bg-blue-500"
                           style={{ height: `${(day.completed / 10) * 100}%` }}>
                      </div>
                    </div>
                    <div className="text-xs text-gray-500 mt-2">{day.date}</div>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
        
        {/* Top Contributors */}
        <Card className="shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg font-semibold">Top Contributors</CardTitle>
            <CardDescription>Users who completed the most tasks</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {topContributors.map(user => (
                <div key={user.userId} className="flex items-center">
                  <img 
                    src={user.photoURL} 
                    alt={user.name} 
                    className="w-10 h-10 rounded-full"
                  />
                  <div className="ml-3 flex-grow">
                    <div className="flex justify-between">
                      <h4 className="font-medium text-gray-800">{user.name}</h4>
                      <span className="text-sm text-gray-600">{user.taskCount} tasks</span>
                    </div>
                    <div className="flex items-center mt-1">
                      <Progress className="h-2 flex-grow" value={user.completionRate} />
                      <span className="ml-2 text-xs font-medium">{user.completionRate}%</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </main>

      <BottomNav />
    </div>
  );
}
