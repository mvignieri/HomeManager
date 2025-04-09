import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';

export function useWebSocket() {
  const [socket, setSocket] = useState<WebSocket | null>(null);
  const [connected, setConnected] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    if (!user) return;
    
    let ws: WebSocket;
    
    try {
      // Create WebSocket connection
      const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
      const wsUrl = `${protocol}//${window.location.host}/ws`;
      ws = new WebSocket(wsUrl);
      
      // Set a connection timeout
      const connectionTimeout = setTimeout(() => {
        if (!connected) {
          console.log('WebSocket connection timed out. Application will continue without real-time updates.');
        }
      }, 5000);

      // Connection opened
      ws.addEventListener('open', () => {
        console.log('WebSocket Connected');
        setConnected(true);
        clearTimeout(connectionTimeout);
        
        try {
          ws.send(JSON.stringify({ 
            type: 'auth',
            userId: user.uid 
          }));
        } catch (err) {
          console.error('Error sending authentication message:', err);
        }
      });

      // Listen for messages
      ws.addEventListener('message', (event) => {
        try {
          const data = JSON.parse(event.data);
          
          // Handle different message types
          switch (data.type) {
            case 'task_update':
              // Trigger a query invalidation based on the updated task
              if (data.task && window.queryClient) {
                window.queryClient.invalidateQueries({ queryKey: ['/api/tasks'] });
                
                // Show notification for task updates
                if (data.action === 'assigned' && data.assignedTo === user.uid) {
                  toast({
                    title: "New Task Assigned",
                    description: `You've been assigned: ${data.task.title}`,
                  });
                }
              }
              break;
              
            case 'device_update':
              // Trigger a query invalidation for devices
              if (window.queryClient) {
                window.queryClient.invalidateQueries({ queryKey: ['/api/devices'] });
              }
              break;
              
            case 'notification':
              // Show notification
              toast({
                title: data.title || "Notification",
                description: data.message,
                variant: data.variant || "default",
              });
              break;
              
            default:
              console.log('Unhandled message type:', data.type);
          }
        } catch (e) {
          console.error('Error parsing WebSocket message:', e);
        }
      });

      // Handle errors
      ws.addEventListener('error', (error) => {
        console.error('WebSocket error:', error);
        // Allow application to continue without WebSocket
      });

      // Handle disconnection
      ws.addEventListener('close', () => {
        console.log('WebSocket Disconnected');
        setConnected(false);
      });

      setSocket(ws);
    } catch (err) {
      console.error('Failed to establish WebSocket connection:', err);
      // Allow application to continue without WebSocket
    }

    // Cleanup on unmount
    return () => {
      if (ws && (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING)) {
        try {
          ws.close();
        } catch (err) {
          console.error('Error closing WebSocket:', err);
        }
      }
    };
  }, [user, toast]);

  return { socket, connected };
}

// Make queryClient accessible to the WebSocket handler
declare global {
  interface Window {
    queryClient: any;
  }
}

export default useWebSocket;
