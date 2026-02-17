import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Link } from 'wouter';
import {
  Home, Calendar, Laptop, BarChart3,
  ThermometerSun, Lightbulb, Tv, Speaker,
  Plus, Minus, AreaChart, AlertCircle,
  CheckSquare as CheckCircle2
} from 'lucide-react';
import Navbar from '@/components/layout/navbar';
import Sidebar from '@/components/layout/sidebar';
import BottomNav from '@/components/layout/bottom-nav';

export default function SmartHomePage() {
  // Mock data
  const [temperature, setTemperature] = useState(22);
  const [boilerActive, setBoilerActive] = useState(true);
  const [activeTab, setActiveTab] = useState<string>('all');
  
  const devices = [
    { id: 1, name: 'Living Room', type: 'light', status: 'active', room: 'living' },
    { id: 2, name: 'Kitchen', type: 'light', status: 'inactive', room: 'kitchen' },
    { id: 3, name: 'Bedroom', type: 'light', status: 'inactive', room: 'bedroom' },
    { id: 4, name: 'Smart TV', type: 'tv', status: 'inactive', room: 'living' },
    { id: 5, name: 'Bluetooth Speaker', type: 'speaker', status: 'active', room: 'bedroom' },
    { id: 6, name: 'Echo Dot', type: 'speaker', status: 'active', room: 'kitchen' }
  ];
  
  // Calculate temperature percentage for slider (between 18-25 degree range)
  const tempPercentage = ((temperature - 18) / (25 - 18)) * 100;
  
  // Helper functions to get all rooms
  const rooms = Array.from(new Set(devices.map(device => device.room)));
  
  // Change temperature
  const increaseTemperature = () => {
    if (temperature < 25) {
      setTemperature(temperature + 1);
      if (temperature + 1 > 22) {
        setBoilerActive(true);
      }
    }
  };
  
  const decreaseTemperature = () => {
    if (temperature > 18) {
      setTemperature(temperature - 1);
      if (temperature - 1 <= 22) {
        setBoilerActive(false);
      }
    }
  };
  
  // Toggle device status
  const toggleDeviceStatus = (id: number) => {
    console.log(`Toggle device ${id}`);
    // This would be implemented with real data
  };
  
  // Filter devices by room
  const getFilteredDevices = () => {
    if (activeTab === 'all') {
      return devices;
    }
    return devices.filter(device => device.room === activeTab);
  };
  
  // Get icon based on device type
  const getDeviceIcon = (type: string) => {
    switch (type) {
      case 'light': return <Lightbulb className="h-5 w-5" />;
      case 'tv': return <Tv className="h-5 w-5" />;
      case 'speaker': return <Speaker className="h-5 w-5" />;
      default: return <Laptop className="h-5 w-5" />;
    }
  };
  
  // Mock temperature data for chart
  const mockTempData = [
    { time: 0, temperature: 20 },
    { time: 1, temperature: 21 },
    { time: 2, temperature: 22 },
    { time: 3, temperature: 22 },
    { time: 4, temperature: 23 },
    { time: 5, temperature: 22 },
    { time: 6, temperature: 21 },
  ];

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      <Navbar title="Smart Home" />
      <Sidebar />
      <header className="bg-white border-b border-gray-200 px-3 py-3 shadow-sm sm:px-4 md:ml-20 md:px-5 lg:ml-64 lg:px-6">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm font-medium text-gray-600">Gestisci dispositivi e automazioni</p>
          <Button size="sm" variant="outline" className="flex items-center gap-1 self-start sm:self-auto">
            <Plus className="h-4 w-4" />
            Add Device
          </Button>
        </div>
      </header>

      <main className="flex-grow overflow-y-auto px-3 py-5 pb-24 space-y-5 sm:px-4 md:ml-20 md:px-5 md:py-6 md:pb-6 md:space-y-6 lg:ml-64 lg:px-6">
        {/* Thermostat Card */}
        <Card className="shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg font-semibold">Thermostat</CardTitle>
            <CardDescription>Control your home temperature</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col items-center">
              <div className="text-5xl font-bold text-gray-800 flex items-baseline">
                {temperature}<span className="text-2xl font-normal text-gray-500">°C</span>
              </div>
              
              <div className="flex items-center justify-center space-x-6 my-4">
                <Button 
                  variant="outline"
                  size="icon"
                  className="rounded-full h-10 w-10"
                  onClick={decreaseTemperature}
                >
                  <Minus className="h-4 w-4" />
                </Button>
                <div className="h-16 w-16 rounded-full bg-gradient-to-r from-blue-400 to-red-400 flex items-center justify-center">
                  <div className="h-12 w-12 rounded-full bg-white flex items-center justify-center">
                    <ThermometerSun className="h-6 w-6 text-amber-500" />
                  </div>
                </div>
                <Button 
                  variant="outline"
                  size="icon"
                  className="rounded-full h-10 w-10"
                  onClick={increaseTemperature}
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              
              <div className="w-full flex justify-between text-sm text-gray-500 mb-1">
                <span>18°C</span>
                <span>25°C</span>
              </div>
              <div className="w-full h-2 bg-gray-100 rounded-full relative">
                <div 
                  className="absolute inset-y-0 left-0 bg-gradient-to-r from-blue-400 to-red-400 rounded-full"
                  style={{ width: `${tempPercentage}%` }}
                ></div>
              </div>
              
              <Badge 
                variant={boilerActive ? "default" : "secondary"} 
                className="mt-4 px-3 py-1 text-xs"
              >
                {boilerActive ? 'Heating Active' : 'Heating Inactive'}
              </Badge>
            </div>
          </CardContent>
        </Card>
        
        {/* Temperature Chart */}
        <Card className="shadow-sm">
          <CardHeader className="pb-2">
            <div className="flex justify-between">
              <div>
                <CardTitle className="text-lg font-semibold">Temperature History</CardTitle>
                <CardDescription>Last 24 hours</CardDescription>
              </div>
              <Button variant="ghost" size="sm" className="flex items-center gap-1">
                <AreaChart className="h-4 w-4" />
                Details
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="h-[150px] bg-gray-50 rounded-lg relative">
              {/* Simple mock chart */}
              <svg className="w-full h-full" viewBox="0 0 100 50">
                <defs>
                  <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#60a5fa" />
                    <stop offset="100%" stopColor="#f87171" />
                  </linearGradient>
                </defs>
                <path 
                  d={`M0,${50 - mockTempData[0].temperature} ${mockTempData.map((d, i) => 
                    `L${(i * 100) / (mockTempData.length - 1)},${50 - d.temperature}`).join(' ')}`} 
                  fill="none" 
                  stroke="url(#gradient)" 
                  strokeWidth="2"
                />
                <g>
                  {mockTempData.map((d, i) => (
                    <circle 
                      key={i} 
                      cx={(i * 100) / (mockTempData.length - 1)} 
                      cy={50 - d.temperature} 
                      r="1" 
                      fill="#fff"
                      stroke="url(#gradient)" 
                      strokeWidth="1"
                    />
                  ))}
                </g>
              </svg>
              <div className="absolute bottom-2 left-2 text-xs text-gray-500">12 AM</div>
              <div className="absolute bottom-2 right-2 text-xs text-gray-500">12 PM</div>
            </div>
          </CardContent>
        </Card>
        
        {/* Smart Devices */}
        <Card className="shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg font-semibold">Smart Devices</CardTitle>
            <Tabs defaultValue="all" onValueChange={setActiveTab}>
              <TabsList className="grid grid-cols-3 mt-2">
                <TabsTrigger value="all">All</TabsTrigger>
                <TabsTrigger value="living">Living Room</TabsTrigger>
                <TabsTrigger value="bedroom">Bedroom</TabsTrigger>
              </TabsList>
            </Tabs>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {getFilteredDevices().map(device => (
                <div key={device.id} className="bg-gray-50 p-4 rounded-lg">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className={device.status === 'active' ? 'text-primary' : 'text-gray-400'}>
                        {getDeviceIcon(device.type)}
                      </div>
                      <h4 className="text-sm font-medium mt-1">{device.name}</h4>
                      <p className="text-xs text-gray-500 mt-0.5 capitalize">{device.room} room</p>
                    </div>
                    <Switch 
                      checked={device.status === 'active'} 
                      onCheckedChange={() => toggleDeviceStatus(device.id)}
                    />
                  </div>
                </div>
              ))}
              
              {getFilteredDevices().length === 0 && (
                <div className="bg-gray-50 p-8 rounded-lg text-center sm:col-span-2 lg:col-span-3">
                  <AlertCircle className="h-10 w-10 text-gray-400 mx-auto mb-2" />
                  <h3 className="text-lg font-medium text-gray-600">No devices found</h3>
                  <p className="text-gray-500 mt-1">Add devices to get started</p>
                  <Button className="mt-4" size="sm">
                    Add Device
                  </Button>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </main>

      <BottomNav />
    </div>
  );
}
