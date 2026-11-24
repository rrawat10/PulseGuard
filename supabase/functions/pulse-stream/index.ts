import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface PulseData {
  bpm: number;
  signal_strength: number;
  health_status: 'normal' | 'risk_a' | 'risk_b' | 'risk_c' | 'emergency';
  is_emergency: boolean;
  timestamp: string;
}

// Store connected clients
const clients = new Map<WebSocket, string>();

const generateMockPulseData = (): PulseData => {
  const baseBpm = 70 + Math.random() * 30; // 70-100 BPM base range
  const variation = (Math.random() - 0.5) * 20; // ±10 BPM variation
  const bpm = Math.round(baseBpm + variation);
  
  let health_status: PulseData['health_status'] = 'normal';
  let is_emergency = false;
  
  if (bpm < 60) {
    health_status = 'risk_a';
  } else if (bpm > 100) {
    health_status = 'risk_b';
  } else if (bpm > 120) {
    health_status = 'risk_c';
  }
  
  if (bpm < 40 || bpm > 140) {
    health_status = 'emergency';
    is_emergency = true;
  }
  
  return {
    bpm: Math.max(40, Math.min(200, bpm)), // Clamp between 40-200
    signal_strength: Math.round(70 + Math.random() * 30), // 70-100%
    health_status,
    is_emergency,
    timestamp: new Date().toISOString()
  };
};

const broadcastPulseData = () => {
  const pulseData = generateMockPulseData();
  
  clients.forEach((userId, socket) => {
    if (socket.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify({
        type: 'pulse_data',
        ...pulseData
      }));
    }
  });
};

// Start broadcasting pulse data every 2 seconds
const pulseInterval = setInterval(broadcastPulseData, 2000);

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
    console.log("Pulse WebSocket client connected");
  };

  socket.onmessage = (event) => {
    try {
      const data = JSON.parse(event.data);
      
      if (data.type === 'auth' && data.token) {
        // Store the client with user ID
        clients.set(socket, data.token);
        console.log(`Client authenticated with user ID: ${data.token}`);
        
        // Send initial pulse data
        const initialPulse = generateMockPulseData();
        socket.send(JSON.stringify({
          type: 'pulse_data',
          ...initialPulse
        }));
      } else if (data.type === 'command') {
        console.log('Received command:', data.command, data.data);
        
        // Handle commands from the client (e.g., device configuration)
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
    console.log("Pulse WebSocket client disconnected");
  };

  socket.onerror = (error) => {
    console.error("WebSocket error:", error);
    clients.delete(socket);
  };

  return response;
});