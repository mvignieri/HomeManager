import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAppContext } from '@/context/app-context';

interface AnalyticsData {
  completionRate: number;
  tasksByPriority: {
    high: number;
    medium: number;
    low: number;
  };
  tasksByStatus: {
    created: number;
    assigned: number;
    completed: number;
  };
  taskDistribution: {
    date: string;
    created: number;
    completed: number;
  }[];
  topContributors: {
    userId: number;
    name: string;
    photoURL: string;
    taskCount: number;
    completionRate: number;
  }[];
}

export function useAnalytics() {
  const { currentHouse, houses } = useAppContext();
  const [selectedHouse, setSelectedHouse] = useState<number | 'all'>(
    currentHouse?.id || 'all'
  );
  const [timePeriod, setTimePeriod] = useState<'week' | 'month' | 'year'>('week');

  // Fetch analytics data
  const {
    data,
    isLoading,
    error,
    refetch,
  } = useQuery<AnalyticsData>({
    queryKey: ['/api/analytics', selectedHouse, timePeriod],
    enabled: !!currentHouse || selectedHouse === 'all',
  });

  return {
    data,
    isLoading,
    error,
    refetch,
    selectedHouse,
    setSelectedHouse,
    timePeriod,
    setTimePeriod,
    houses,
  };
}
