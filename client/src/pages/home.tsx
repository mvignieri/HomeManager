import React, { useState } from 'react';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

export default function HomePage() {
  const [currentDate] = useState(new Date());

  return (
    <div className="flex flex-col h-screen">
      <header className="bg-white border-b border-gray-200 p-4">
        <h1 className="text-xl font-bold">HomeTask</h1>
      </header>
      
      <main className="flex-grow overflow-y-auto p-4">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-bold">Dashboard</h2>
          <span className="text-sm text-gray-500">
            {format(currentDate, 'EEEE, MMMM d')}
          </span>
        </div>
        
        <div className="space-y-4">
          <Card>
            <CardContent className="p-4">
              <h3 className="text-lg font-medium mb-4">Welcome to HomeTask</h3>
              <p>Your smart home task management system is ready to use!</p>
              <div className="grid grid-cols-3 gap-4 mt-4">
                <div className="text-center bg-blue-50 p-4 rounded-lg">
                  <div className="text-2xl font-bold text-blue-500">3</div>
                  <div className="text-xs text-gray-500">Tasks Today</div>
                </div>
                <div className="text-center bg-purple-50 p-4 rounded-lg">
                  <div className="text-2xl font-bold text-purple-500">5</div>
                  <div className="text-xs text-gray-500">Assigned</div>
                </div>
                <div className="text-center bg-green-50 p-4 rounded-lg">
                  <div className="text-2xl font-bold text-green-500">2</div>
                  <div className="text-xs text-gray-500">Completed</div>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <h3 className="text-lg font-medium mb-4">Smart Home</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-gray-50 p-4 rounded-lg">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-amber-500 text-2xl">🌡️</div>
                      <h4 className="font-medium mt-1">Thermostat</h4>
                    </div>
                    <div className="text-right">
                      <div className="text-xl font-bold">22°C</div>
                      <div className="text-xs px-2 py-0.5 bg-green-100 text-green-800 rounded">
                        Active
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="bg-gray-50 p-4 rounded-lg">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-yellow-500 text-2xl">💡</div>
                      <h4 className="font-medium mt-1">Living Room</h4>
                    </div>
                    <Button variant="outline" size="sm">
                      Turn On
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
      
      <footer className="bg-white border-t border-gray-200 p-4 grid grid-cols-4 text-center">
        <Button variant="ghost" className="flex flex-col items-center text-xs">
          <span>🏠</span>
          Home
        </Button>
        <Button variant="ghost" className="flex flex-col items-center text-xs">
          <span>📅</span>
          Calendar
        </Button>
        <Button variant="ghost" className="flex flex-col items-center text-xs">
          <span>🔧</span>
          Devices
        </Button>
        <Button variant="ghost" className="flex flex-col items-center text-xs">
          <span>📊</span>
          Analytics
        </Button>
      </footer>
    </div>
  );
}
