import React, { useState } from 'react';
import Navbar from '@/components/layout/navbar';
import BottomNav from '@/components/layout/bottom-nav';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import { useSmartHome } from '@/hooks/use-smart-home';
import TemperatureChart from '@/components/charts/temperature-chart';

export default function SmartHomePage() {
  const { 
    devices, 
    temperature, 
    boilerActive, 
    toggleDeviceStatus, 
    increaseTemperature, 
    decreaseTemperature,
    getTempHistory
  } = useSmartHome();
  
  const [tempChartPeriod, setTempChartPeriod] = useState<'day' | 'week' | 'month'>('day');
  const temperatureHistoryData = getTempHistory(tempChartPeriod);
  
  // Calculate temperature percentage for slider
  const tempPercentage = ((temperature - 18) / (25 - 18)) * 100;
  
  return (
    <div className="flex flex-col h-screen">
      <Navbar title="Smart Home" />
      
      <main className="flex-grow overflow-y-auto pb-20">
        <section className="p-4 space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-gray-800">Smart Home</h2>
            <div className="text-sm font-medium text-gray-500">
              Last updated: <span>Just now</span>
            </div>
          </div>
          
          <Card className="bg-white rounded-xl shadow-sm border border-gray-100">
            <CardContent className="p-4">
              <h3 className="font-medium text-gray-700 mb-4">Thermostat</h3>
              <div className="flex flex-col items-center">
                <div className="text-5xl font-bold text-gray-800">{temperature}°C</div>
                <div className="flex items-center space-x-6 my-4">
                  <Button 
                    className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center hover:bg-gray-200"
                    variant="ghost"
                    onClick={decreaseTemperature}
                  >
                    <span className="material-icons">remove</span>
                  </Button>
                  <Button 
                    className="w-10 h-10 rounded-full bg-primary text-white flex items-center justify-center hover:bg-primary/90"
                    onClick={increaseTemperature}
                  >
                    <span className="material-icons">add</span>
                  </Button>
                </div>
                <div className="w-full flex justify-between text-sm text-gray-500 mt-2">
                  <span>18°C</span>
                  <span>25°C</span>
                </div>
                <div className="w-full h-2 bg-gray-100 rounded-full mt-1 relative">
                  <div 
                    className="absolute inset-y-0 left-0 bg-primary rounded-full"
                    style={{ width: `${tempPercentage}%` }}
                  ></div>
                </div>
                <Badge variant={boilerActive ? "success" : "secondary"} className="mt-4 px-3 py-1 text-sm">
                  {boilerActive ? 'Boiler Active' : 'Boiler Inactive'}
                </Badge>
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-white rounded-xl shadow-sm border border-gray-100">
            <CardContent className="p-4">
              <h3 className="font-medium text-gray-700 mb-4">Alexa Devices</h3>
              <div className="grid grid-cols-2 gap-4">
                {devices.map(device => (
                  <div key={device.id} className="bg-gray-50 p-4 rounded-lg">
                    <div className="flex items-center justify-between">
                      <div>
                        <span className={`material-icons ${device.status === 'active' ? 'text-primary' : 'text-gray-400'}`}>
                          {device.type === 'light' ? 'lightbulb' : device.type === 'tv' ? 'tv' : 'speaker'}
                        </span>
                        <h4 className="text-sm font-medium mt-1">{device.name}</h4>
                      </div>
                      <Switch 
                        checked={device.status === 'active'} 
                        onCheckedChange={() => toggleDeviceStatus(device.id, device.status as any)}
                      />
                    </div>
                  </div>
                ))}
                
                {devices.length === 0 && (
                  <div className="col-span-2 bg-gray-50 p-8 rounded-lg text-center">
                    <span className="material-icons text-gray-400 text-4xl mb-2">devices</span>
                    <h3 className="text-lg font-medium text-gray-600">No devices found</h3>
                    <p className="text-gray-500 mt-1">Add devices to get started</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-white rounded-xl shadow-sm border border-gray-100">
            <CardContent className="p-4">
              <TemperatureChart 
                data={temperatureHistoryData}
                period={tempChartPeriod}
                onPeriodChange={setTempChartPeriod}
              />
            </CardContent>
          </Card>
        </section>
      </main>
      
      <BottomNav />
    </div>
  );
}
