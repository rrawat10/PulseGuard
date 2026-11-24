import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Store connected clients (WebSocket -> user_id)
const clients = new Map<WebSocket, string>();

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const upgrade = req.headers.get("upgrade") || "";
  if (upgrade.toLowerCase() !== "websocket") {
    return new Response("Expected WebSocket connection", { status: 400 });
  }

  const { socket, response } = Deno.upgradeWebSocket(req);

  socket.onopen = () => {
    console.log("ECG WebSocket client connected");
  };

  socket.onmessage = (event) => {
    try {
      const data = JSON.parse(event.data);
      
      if (data.type === 'auth' && data.token) {
        // Store the client with user ID
        clients.set(socket, data.token);
        console.log(`ECG client authenticated with user ID: ${data.token}`);
        
        // Send acknowledgment
        socket.send(JSON.stringify({
          type: 'auth_success',
          message: 'Connected to ECG stream'
        }));
      } 
      else if (data.type === 'ecg_sample') {
        // Single ECG sample from ESP32
        // Forward to the client that sent it
        if (socket.readyState === WebSocket.OPEN) {
          socket.send(JSON.stringify({
            type: 'ecg_sample',
            value: data.value,
            timestamp: data.timestamp || Date.now()
          }));
        }
      }
      else if (data.type === 'ecg_batch') {
        // Batch of ECG samples from ESP32
        // This is more efficient for high-frequency data
        if (socket.readyState === WebSocket.OPEN) {
          socket.send(JSON.stringify({
            type: 'ecg_batch',
            samples: data.samples,
            timestamp: data.timestamp || Date.now()
          }));
        }
      }
      else if (data.type === 'command') {
        console.log('Received command:', data.command, data.data);
        
        // Handle commands (e.g., start/stop recording, calibration)
        socket.send(JSON.stringify({
          type: 'command_response',
          command: data.command,
          status: 'acknowledged'
        }));
      }
    } catch (error) {
      console.error('Error processing WebSocket message:', error);
    }
  };

  socket.onclose = () => {
    clients.delete(socket);
    console.log("ECG WebSocket client disconnected");
  };

  socket.onerror = (error) => {
    console.error("WebSocket error:", error);
    clients.delete(socket);
  };

  return response;
});
