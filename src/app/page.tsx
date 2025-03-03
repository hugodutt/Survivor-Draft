'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Scenario } from '@/server/types';
import { API_URL } from '@/config/api';

export default function Home() {
  const router = useRouter();
  const [playerName, setPlayerName] = useState('');
  const [roomCode, setRoomCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [scenarios, setScenarios] = useState<Scenario[]>([]);
  const [selectedScenario, setSelectedScenario] = useState('');
  const [maxPlayers, setMaxPlayers] = useState(4);

  useEffect(() => {
    // Carrega os cenários disponíveis
    fetch(`${API_URL}/api/scenarios`)
      .then(res => res.json())
      .then(data => setScenarios(data))
      .catch(err => console.error('Failed to load scenarios:', err));
  }, []);

  const createRoom = async () => {
    if (!playerName) {
      setError('Please enter your name');
      return;
    }

    if (!selectedScenario) {
      setError('Please select a scenario');
      return;
    }
    
    setError('');
    setLoading(true);
    
    try {
      const response = await fetch(`${API_URL}/api/rooms`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          playerName,
          scenarioId: selectedScenario,
          maxPlayers
        }),
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to create room');
      }
      
      const room = await response.json();
      
      // Salva o nome do jogador no localStorage
      localStorage.setItem('playerName', playerName);
      
      // Redirect to room page
      router.push(`/room/${room.code}`);
    } catch (error) {
      console.error('Error creating room:', error);
      setError(error instanceof Error ? error.message : 'Failed to create room');
    } finally {
      setLoading(false);
    }
  };

  const joinRoom = async () => {
    if (!playerName) {
      setError('Please enter your name');
      return;
    }

    if (!roomCode) {
      setError('Please enter a room code');
      return;
    }

    setError('');
    setLoading(true);

    try {
      const normalizedCode = roomCode.toUpperCase();
      console.log(`Attempting to join room ${normalizedCode} as ${playerName}`);
      const response = await fetch(`${API_URL}/api/rooms/${normalizedCode}/join`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ playerName }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('Error response:', errorData);
        throw new Error(errorData.error || 'Failed to join room');
      }

      const roomData = await response.json();
      console.log('Successfully joined room:', roomData);

      // Salva o nome do jogador no localStorage
      localStorage.setItem('playerName', playerName);

      // Redirect to room page
      console.log('Redirecting to room page...');
      router.push(`/room/${normalizedCode}`);
    } catch (error) {
      console.error('Error joining room:', error);
      setError(error instanceof Error ? error.message : 'Failed to join room');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen relative overflow-hidden bg-[#0A0F1C]">
      {/* Background Effects */}
      <div className="absolute inset-0">
        <div className="absolute w-full h-full bg-[radial-gradient(circle_at_50%_50%,rgba(17,24,39,0),rgba(17,24,39,1))]" />
        <div className="absolute top-[-10%] right-[-10%] w-[500px] h-[500px] bg-blue-500/30 rounded-full blur-[120px]" />
        <div className="absolute bottom-[-10%] left-[-10%] w-[500px] h-[500px] bg-purple-500/30 rounded-full blur-[120px]" />
        <div className="absolute inset-0 bg-[url('/grid.svg')] opacity-20" />
      </div>

      {/* Main Content */}
      <div className="relative min-h-screen flex">
        {/* Left Section - Hero */}
        <div className="hidden lg:flex w-1/2 flex-col justify-center p-20">
          <h1 className="text-7xl font-bold mb-6">
            <span className="text-gradient">Survivor</span>
            <br />
            <span className="text-white">Draft</span>
          </h1>
          <p className="text-xl text-gray-400 max-w-lg">
            Make strategic choices, survive challenging scenarios, and compete with other players in this immersive survival game.
          </p>
          <div className="mt-12 flex gap-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-blue-500/20 flex items-center justify-center">
                <span className="text-2xl">🎮</span>
              </div>
              <div>
                <h3 className="text-white font-medium">Multiplayer</h3>
                <p className="text-gray-400 text-sm">Play with friends</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-purple-500/20 flex items-center justify-center">
                <span className="text-2xl">🎯</span>
              </div>
              <div>
                <h3 className="text-white font-medium">Strategic</h3>
                <p className="text-gray-400 text-sm">Make wise choices</p>
              </div>
            </div>
          </div>
        </div>

        {/* Right Section - Game Panel */}
        <div className="w-full lg:w-1/2 flex items-center justify-center p-8 bg-gray-900/50 backdrop-blur-xl">
          <div className="w-full max-w-md">
            <div className="lg:hidden text-center mb-12">
              <h1 className="text-5xl font-bold text-gradient mb-4">
                Survivor Draft
              </h1>
            </div>

            <div className="bg-gray-900 border border-gray-800 rounded-xl p-8 space-y-8">
              {error && (
                <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4 text-red-300 text-center animate-shake">
                  {error}
                </div>
              )}

              <div className="space-y-6">
                {/* Player Name Input */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-300">Player Name</label>
                  <input
                    type="text"
                    placeholder="Enter your name"
                    value={playerName}
                    onChange={(e) => setPlayerName(e.target.value)}
                    className="w-full h-12 px-4 rounded-lg bg-gray-800 border border-gray-700 text-gray-100 focus:border-blue-500 outline-none transition-colors"
                  />
                </div>

                {/* Mode Selection Button */}
                <div className="flex justify-center">
                  <button
                    onClick={() => setIsCreating(!isCreating)}
                    className="button w-full bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800"
                  >
                    {isCreating ? 'Join Room Instead' : 'Create Game Instead'}
                  </button>
                </div>

                {/* Game Forms */}
                {isCreating ? (
                  <div className="space-y-6 animate-slide-up">
                    <div className="space-y-4">
                      <label className="text-sm font-medium text-gray-300">Select Scenario</label>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-[400px] overflow-y-auto p-1">
                        {scenarios.map(scenario => (
                          <button
                            key={scenario.id}
                            onClick={() => setSelectedScenario(scenario.id)}
                            className={`group relative overflow-hidden rounded-xl transition-all duration-300 ${
                              selectedScenario === scenario.id 
                                ? 'ring-2 ring-purple-500 ring-offset-2 ring-offset-gray-900 scale-[0.98]' 
                                : 'hover:scale-[0.98]'
                            }`}
                          >
                            <div className="aspect-[16/9] relative">
                              <img
                                src={`/imgs/${scenario.id}.png`}
                                alt={scenario.name}
                                className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                              />
                              <div className="absolute inset-0 bg-gradient-to-t from-gray-900 via-gray-900/60 to-transparent" />
                              <div className="absolute bottom-0 left-0 right-0 p-4">
                                <h3 className="text-white font-medium text-lg">{scenario.name}</h3>
                                <p className="text-gray-300 text-sm opacity-0 group-hover:opacity-100 transition-opacity duration-300">{scenario.description}</p>
                              </div>
                              {selectedScenario === scenario.id && (
                                <div className="absolute inset-0 bg-purple-500/10 backdrop-blur-sm" />
                              )}
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="bg-gray-800 border border-gray-700 rounded-lg p-4 space-y-4">
                      <div className="flex justify-between items-center">
                        <label className="text-sm font-medium text-gray-300">Max Players</label>
                        <span className="text-purple-400 font-medium text-lg">
                          {maxPlayers} players
                        </span>
                      </div>
                      <div className="relative pt-2">
                        <input
                          type="range"
                          min="3"
                          max="15"
                          value={maxPlayers}
                          onChange={(e) => setMaxPlayers(Number(e.target.value))}
                          className="w-full accent-purple-500 h-2 rounded-lg appearance-none cursor-pointer bg-gray-700"
                        />
                        <div className="flex justify-between text-xs text-gray-400 px-1 mt-1">
                          <span>3</span>
                          <span>15</span>
                        </div>
                      </div>
                    </div>

                    <button
                      onClick={createRoom}
                      disabled={loading}
                      className="button w-full h-12 bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800"
                    >
                      {loading ? (
                        <span className="flex items-center justify-center">
                          <div className="spinner mr-2" />
                          Creating your room...
                        </span>
                      ) : (
                        'Create Room'
                      )}
                    </button>
                  </div>
                ) : (
                  <div className="space-y-6 animate-slide-up">
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-gray-300">Room Code</label>
                      <input
                        type="text"
                        placeholder="Enter room code"
                        value={roomCode}
                        onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
                        className="input w-full bg-white/5 border-white/10 focus:border-blue-500/50"
                      />
                    </div>

                    <button
                      onClick={joinRoom}
                      disabled={loading}
                      className="button w-full h-12 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800"
                    >
                      {loading ? (
                        <span className="flex items-center justify-center">
                          <div className="spinner mr-2" />
                          Joining room...
                        </span>
                      ) : (
                        'Join Room'
                      )}
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
} 