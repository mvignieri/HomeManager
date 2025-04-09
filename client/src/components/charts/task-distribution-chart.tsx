import React from 'react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer 
} from 'recharts';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';

interface TaskDistribution {
  date: string;
  created: number;
  completed: number;
}

interface TaskDistributionChartProps {
  data: TaskDistribution[];
  period: 'week' | 'month' | 'year';
  onPeriodChange: (period: 'week' | 'month' | 'year') => void;
}

export default function TaskDistributionChart({ data, period, onPeriodChange }: TaskDistributionChartProps) {
  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-medium text-gray-700">Task Distribution</h3>
        <Select value={period} onValueChange={(value: any) => onPeriodChange(value)}>
          <SelectTrigger className="w-[180px] text-sm bg-gray-100 border-0 rounded-md">
            <SelectValue placeholder="Select period" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="week">This Week</SelectItem>
            <SelectItem value="month">This Month</SelectItem>
            <SelectItem value="year">This Year</SelectItem>
          </SelectContent>
        </Select>
      </div>
      
      <div className="h-60 bg-gray-50 rounded-lg">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={data}
            margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
          >
            <CartesianGrid strokeDasharray="3 3" vertical={false} />
            <XAxis 
              dataKey="date" 
              tick={{ fontSize: 12 }}
              stroke="#9CA3AF"
            />
            <YAxis 
              tickCount={5} 
              tick={{ fontSize: 12 }}
              stroke="#9CA3AF"
            />
            <Tooltip />
            <Legend />
            <Bar dataKey="created" name="Created" fill="#3B82F6" radius={[4, 4, 0, 0]} />
            <Bar dataKey="completed" name="Completed" fill="#10B981" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
