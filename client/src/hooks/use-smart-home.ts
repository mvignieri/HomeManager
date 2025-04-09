import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Device, DeviceType, DeviceStatus } from '@shared/schema';
import { queryClient, apiRequest } from '@/lib/queryClient';
import { useToast } from './use-toast';
import { useAppContext } from '@/context/app-context';

export function useSmartHome() {
  const { toast } = useToast();
  const { currentHouse } = useAppContext();

  // Fetch all devices for the current house
  const {
    data: devices = [],
    isLoading,
    error,
    refetch,
  } = useQuery<Device[]>({
    queryKey: ['/api/devices', currentHouse?.id],
    enabled: !!currentHouse,
  });

  // Get thermostat device
  const thermostat = devices.find(device => device.type === 'thermostat');
  
  // Get temperature from thermostat data
  const temperature = thermostat?.data?.temperature || 22;
  
  // Get boiler status from thermostat data
  const boilerActive = thermostat?.data?.boilerActive || false;

  // Get all light devices
  const lights = devices.filter(device => device.type === 'light');

  // Update device status mutation
  const updateDeviceStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: number; status: DeviceStatus }) => {
      const res = await apiRequest('PATCH', `/api/devices/${id}/status`, { status });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/devices'] });
    },
    onError: (error: any) => {
      toast({
        title: 'Failed to Update Device',
        description: error.message || 'An error occurred while updating the device',
        variant: 'destructive',
      });
    },
  });

  // Update thermostat temperature mutation
  const updateTemperatureMutation = useMutation({
    mutationFn: async (temperature: number) => {
      if (!thermostat) throw new Error('Thermostat not found');
      
      const res = await apiRequest('PATCH', `/api/devices/${thermostat.id}/temperature`, { temperature });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/devices'] });
    },
    onError: (error: any) => {
      toast({
        title: 'Failed to Update Temperature',
        description: error.message || 'An error occurred while updating the temperature',
        variant: 'destructive',
      });
    },
  });

  // Toggle device status
  const toggleDeviceStatus = (id: number, currentStatus: DeviceStatus) => {
    const newStatus = currentStatus === 'active' ? 'inactive' : 'active';
    updateDeviceStatusMutation.mutate({ id, status: newStatus });
  };

  // Increase temperature
  const increaseTemperature = () => {
    if (temperature < 25) {
      updateTemperatureMutation.mutate(temperature + 1);
    }
  };

  // Decrease temperature
  const decreaseTemperature = () => {
    if (temperature > 18) {
      updateTemperatureMutation.mutate(temperature - 1);
    }
  };

  // Get temperature history (mock data for now)
  const getTempHistory = (period: 'day' | 'week' | 'month' = 'day') => {
    // This would be fetched from an API in a real scenario
    return Array.from({ length: 24 }, (_, i) => ({
      time: i,
      temperature: Math.round(20 + Math.sin(i / 4) * 2 + Math.random()),
    }));
  };

  return {
    devices,
    thermostat,
    lights,
    temperature,
    boilerActive,
    isLoading,
    error,
    refetch,
    toggleDeviceStatus,
    increaseTemperature,
    decreaseTemperature,
    getTempHistory,
    isUpdatingStatus: updateDeviceStatusMutation.isPending,
    isUpdatingTemperature: updateTemperatureMutation.isPending,
  };
}
