import React, { useState } from 'react';
import Navbar from '@/components/layout/navbar';
import BottomNav from '@/components/layout/bottom-nav';
import { Card, CardContent } from '@/components/ui/card';
import { 
  Select, 
  SelectTrigger, 
  SelectValue, 
  SelectContent, 
  SelectItem 
} from '@/components/ui/select';
import TaskDistributionChart from '@/components/charts/task-distribution-chart';
import { useAnalytics } from '@/hooks/use-analytics';
import { Progress } from '@/components/ui/progress';

export default function AnalyticsPage() {
  const { 
    data, 
    isLoading,
    selectedHouse,
    setSelectedHouse,
    timePeriod,
    setTimePeriod,
    houses
  } = useAnalytics();
  
  if (isLoading) {
    return (
      <div className="flex flex-col h-screen">
        <Navbar title="Analytics" />
        <main className="flex-grow flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
        </main>
        <BottomNav />
      </div>
    );
  }
  
  const sampleTaskDistribution = [
    { date: 'Mon', created: 5, completed: 3 },
    { date: 'Tue', created: 4, completed: 4 },
    { date: 'Wed', created: 7, completed: 5 },
    { date: 'Thu', created: 3, completed: 2 },
    { date: 'Fri', created: 6, completed: 4 },
    { date: 'Sat', created: 2, completed: 1 },
    { date: 'Sun', created: 1, completed: 1 },
  ];
  
  const sampleTopContributors = [
    { userId: 1, name: 'John Doe', photoURL: 'https://ui-avatars.com/api/?name=John+Doe', taskCount: 42, completionRate: 75 },
    { userId: 2, name: 'Sarah Johnson', photoURL: 'https://ui-avatars.com/api/?name=Sarah+Johnson', taskCount: 35, completionRate: 60 },
    { userId: 3, name: 'Michael Brown', photoURL: 'https://ui-avatars.com/api/?name=Michael+Brown', taskCount: 28, completionRate: 45 },
  ];
  
  return (
    <div className="flex flex-col h-screen">
      <Navbar title="Analytics" />
      
      <main className="flex-grow overflow-y-auto pb-20">
        <section className="p-4 space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-gray-800">Analytics</h2>
            <Select 
              value={selectedHouse === 'all' ? 'all' : selectedHouse.toString()}
              onValueChange={(value) => setSelectedHouse(value === 'all' ? 'all' : parseInt(value))}
            >
              <SelectTrigger className="text-sm bg-white border border-gray-200 rounded-md p-2 shadow-sm w-[180px]">
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
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card className="bg-white rounded-xl shadow-sm border border-gray-100">
              <CardContent className="p-4">
                <h3 className="font-medium text-gray-700 mb-3">Task Completion</h3>
                <div className="h-40 flex items-center justify-center bg-gray-50 rounded-lg">
                  <div className="text-center">
                    <div className="text-4xl font-bold text-primary">
                      {data?.completionRate || 78}%
                    </div>
                    <div className="text-sm text-gray-500">Completion Rate</div>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card className="bg-white rounded-xl shadow-sm border border-gray-100">
              <CardContent className="p-4">
                <h3 className="font-medium text-gray-700 mb-3">Tasks by Priority</h3>
                <div className="h-40 flex items-center justify-center bg-gray-50 rounded-lg">
                  <div className="flex space-x-4">
                    <div className="text-center">
                      <div className="w-4 h-16 bg-red-400 rounded-t-full mx-auto" 
                        style={{ height: `${((data?.tasksByPriority.high || 8) / 12) * 64}px` }}></div>
                      <div className="mt-2 text-xs text-gray-500">High</div>
                      <div className="font-medium text-sm">{data?.tasksByPriority.high || 8}</div>
                    </div>
                    <div className="text-center">
                      <div className="w-4 h-24 bg-amber-400 rounded-t-full mx-auto"
                        style={{ height: `${((data?.tasksByPriority.medium || 12) / 12) * 64}px` }}></div>
                      <div className="mt-2 text-xs text-gray-500">Med</div>
                      <div className="font-medium text-sm">{data?.tasksByPriority.medium || 12}</div>
                    </div>
                    <div className="text-center">
                      <div className="w-4 h-10 bg-green-400 rounded-t-full mx-auto"
                        style={{ height: `${((data?.tasksByPriority.low || 5) / 12) * 64}px` }}></div>
                      <div className="mt-2 text-xs text-gray-500">Low</div>
                      <div className="font-medium text-sm">{data?.tasksByPriority.low || 5}</div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
          
          <Card className="bg-white rounded-xl shadow-sm border border-gray-100">
            <CardContent className="p-4">
              <TaskDistributionChart 
                data={data?.taskDistribution || sampleTaskDistribution}
                period={timePeriod}
                onPeriodChange={setTimePeriod}
              />
            </CardContent>
          </Card>
          
          <Card className="bg-white rounded-xl shadow-sm border border-gray-100">
            <CardContent className="p-4">
              <h3 className="font-medium text-gray-700 mb-4">Top Contributors</h3>
              <div className="space-y-4">
                {(data?.topContributors || sampleTopContributors).map(user => (
                  <div key={user.userId} className="flex items-center">
                    <img 
                      src={user.photoURL} 
                      alt={user.name} 
                      className="w-10 h-10 rounded-full"
                    />
                    <div className="ml-3 flex-grow">
                      <div className="flex justify-between">
                        <h4 className="font-medium text-gray-800">{user.name}</h4>
                        <span className="font-medium text-gray-900">{user.taskCount} tasks</span>
                      </div>
                      <Progress className="h-2 mt-1" value={user.completionRate} />
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </section>
      </main>
      
      <BottomNav />
    </div>
  );
}
