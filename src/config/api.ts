const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export const API_ENDPOINTS = {
  scenarios: `${API_URL}/api/scenarios`,
  rooms: `${API_URL}/api/rooms`,
  joinRoom: (code: string) => `${API_URL}/api/rooms/${code}/join`,
  socket: API_URL
}; 