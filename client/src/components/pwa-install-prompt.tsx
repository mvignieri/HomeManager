import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Download, X, Bell, BellOff } from 'lucide-react';
import { canInstall, promptInstall, isPWA } from '@/lib/pwa';
import { useNotifications } from '@/hooks/use-notifications';

export default function PWAInstallPrompt() {
  const [showInstall, setShowInstall] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const { isSupported, isGranted, isDenied, requestPermission } = useNotifications();

  useEffect(() => {
    // Check if we should show install prompt
    const checkInstall = () => {
      if (!isPWA() && canInstall()) {
        const dismissed = localStorage.getItem('pwa-install-dismissed');
        if (!dismissed) {
          setShowInstall(true);
        }
      }
    };

    // Check if we should show notification prompt
    const checkNotifications = () => {
      if (isSupported && !isGranted && !isDenied) {
        const dismissed = localStorage.getItem('notifications-dismissed');
        if (!dismissed) {
          setShowNotifications(true);
        }
      }
    };

    checkInstall();
    checkNotifications();

    // Listen for install prompt availability
    const timer = setInterval(checkInstall, 1000);
    return () => clearInterval(timer);
  }, [isSupported, isGranted, isDenied]);

  const handleInstall = async () => {
    const accepted = await promptInstall();
    if (accepted) {
      setShowInstall(false);
    }
  };

  const handleDismissInstall = () => {
    setShowInstall(false);
    localStorage.setItem('pwa-install-dismissed', 'true');
  };

  const handleEnableNotifications = async () => {
    await requestPermission();
    setShowNotifications(false);
  };

  const handleDismissNotifications = () => {
    setShowNotifications(false);
    localStorage.setItem('notifications-dismissed', 'true');
  };

  if (!showInstall && !showNotifications) {
    return null;
  }

  return (
    <div className="fixed bottom-20 md:bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-96 z-50 animate-in slide-in-from-bottom-5">
      {showInstall && (
        <Card className="mb-4 shadow-lg border-primary">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                <Download className="h-5 w-5 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-sm mb-1">Install HomeTask</h3>
                <p className="text-xs text-gray-600 mb-3">
                  Install our app for a better experience with offline access and quick launch.
                </p>
                <div className="flex gap-2">
                  <Button size="sm" onClick={handleInstall}>
                    Install
                  </Button>
                  <Button size="sm" variant="ghost" onClick={handleDismissInstall}>
                    Not now
                  </Button>
                </div>
              </div>
              <button
                onClick={handleDismissInstall}
                className="flex-shrink-0 text-gray-400 hover:text-gray-600"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </CardContent>
        </Card>
      )}

      {showNotifications && (
        <Card className="shadow-lg border-primary">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                <Bell className="h-5 w-5 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-sm mb-1">Enable Notifications</h3>
                <p className="text-xs text-gray-600 mb-3">
                  Stay updated with task assignments and important updates.
                </p>
                <div className="flex gap-2">
                  <Button size="sm" onClick={handleEnableNotifications}>
                    <Bell className="h-3 w-3 mr-2" />
                    Enable
                  </Button>
                  <Button size="sm" variant="ghost" onClick={handleDismissNotifications}>
                    Not now
                  </Button>
                </div>
              </div>
              <button
                onClick={handleDismissNotifications}
                className="flex-shrink-0 text-gray-400 hover:text-gray-600"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
