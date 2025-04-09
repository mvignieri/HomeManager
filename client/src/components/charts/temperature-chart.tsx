import React from 'react';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Legend 
} from 'recharts';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';

interface TempDataPoint {
  time: number;
  temperature: number;
}

interface TemperatureChartProps {
  data: TempDataPoint[];
  period: 'day' | 'week' | 'month';
  onPeriodChange: (period: 'day' | 'week' | 'month') => void;
}

export default function TemperatureChart({ data, period, onPeriodChange }: TemperatureChartProps) {
  const formatXAxis = (value: number) => {
    if (period === 'day') {
      return `${value}:00`;
    } else if (period === 'week') {
      const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
      return days[value % 7];
    } else {
      return `Day ${value}`;
    }
  };
  
  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-medium text-gray-700">Temperature History</h3>
        <Select value={period} onValueChange={(value: any) => onPeriodChange(value)}>
          <SelectTrigger className="w-[180px] text-sm bg-gray-100 border-0 rounded-md">
            <SelectValue placeholder="Select period" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="day">Last 24 hours</SelectItem>
            <SelectItem value="week">Last 7 days</SelectItem>
            <SelectItem value="month">Last 30 days</SelectItem>
          </SelectContent>
        </Select>
      </div>
      
      <div className="h-48 flex items-end">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart
            data={data}
            margin={{ top: 5, right: 20, left: 0, bottom: 5 }}
          >
            <CartesianGrid strokeDasharray="3 3" vertical={false} />
            <XAxis 
              dataKey="time" 
              tickFormatter={formatXAxis} 
              tick={{ fontSize: 12 }}
              stroke="#9CA3AF"
            />
            <YAxis 
              domain={['dataMin - 2', 'dataMax + 2']} 
              tickCount={5} 
              tick={{ fontSize: 12 }}
              stroke="#9CA3AF"
            />
            <Tooltip 
              formatter={(value) => [`${value}°C`, 'Temperature']}
              labelFormatter={formatXAxis}
            />
            <Line 
              type="monotone" 
              dataKey="temperature" 
              stroke="#4F46E5" 
              strokeWidth={2}
              dot={{ stroke: '#4F46E5', strokeWidth: 2, r: 4 }}
              activeDot={{ r: 6 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
