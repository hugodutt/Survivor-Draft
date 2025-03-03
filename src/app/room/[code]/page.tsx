'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { io, Socket } from 'socket.io-client';
import { Room } from '@/server/types';

export default function RoomPage() {
  const params = useParams();
  const [room, setRoom] = useState<Room | null>(null);
  const [error, setError] = useState<string>('');
  const [message, setMessage] = useState<string>('');
  const [socket, setSocket] = useState<Socket | null>(null);

  useEffect(() => {
    const playerName = localStorage.getItem('playerName');
    if (!playerName) {
      setError('Player name not found');
      return;
    }

    console.log('Initializing socket connection...');
    const newSocket = io('http://localhost:3001', {
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: 5
    });

    newSocket.on('connect', () => {
      console.log('Connected to server with ID:', newSocket.id);
      setSocket(newSocket);
      setError(''); // Limpa erros anteriores
      
      console.log(`Attempting to join room ${params.code} as ${playerName}`);
      newSocket.emit('join-room', params.code, playerName);
    });

    newSocket.on('connect_error', (error) => {
      console.error('Socket connection error:', error);
      setError('Failed to connect to server. Please check your connection and try again.');
    });

    newSocket.on('reconnect_attempt', (attemptNumber) => {
      console.log(`Attempting to reconnect... (attempt ${attemptNumber})`);
      setError(`Connection lost. Attempting to reconnect... (${attemptNumber})`);
    });

    newSocket.on('reconnect', () => {
      console.log('Reconnected to server');
      setError('');
      
      // Re-join room after reconnection
      if (playerName && params.code) {
        console.log(`Re-joining room ${params.code} as ${playerName}`);
        newSocket.emit('join-room', params.code, playerName);
      }
    });

    newSocket.on('error', (error: { message: string }) => {
      console.error('Socket error:', error);
      setError(error.message);
    });

    newSocket.on('room-updated', (updatedRoom: Room) => {
      console.log('Room updated:', updatedRoom);
      if (!updatedRoom || !Array.isArray(updatedRoom.players)) {
        console.error('Invalid room data received:', updatedRoom);
        return;
      }
      setRoom(updatedRoom);
      setError(''); // Limpa qualquer erro anterior
    });

    newSocket.on('draft-started', ({ room: updatedRoom, message }: { room: Room; message: string }) => {
      console.log('Draft started:', updatedRoom);
      if (!updatedRoom || !Array.isArray(updatedRoom.players)) {
        console.error('Invalid room data received:', updatedRoom);
        return;
      }
      setRoom(updatedRoom);
      setMessage(message);
    });

    newSocket.on('message', (newMessage: string) => {
      console.log('Message received:', newMessage);
      setMessage(newMessage);
    });

    // Cleanup na desmontagem do componente
    return () => {
      console.log('Cleaning up socket connection...');
      newSocket.disconnect();
      setSocket(null);
      setRoom(null);
    };
  }, [params.code]);

  const toggleReady = () => {
    if (socket && room) {
      console.log('Toggling ready state');
      socket.emit('player-ready', room.code);
    }
  };

  const startGame = () => {
    if (socket && room) {
      console.log('Starting game');
      socket.emit('start-game', room.code);
    }
  };

  const selectItem = (itemId: string) => {
    if (socket && room) {
      console.log('Selecting item:', itemId);
      socket.emit('select-item', room.code, itemId);
    }
  };

  const voteForPlayer = (playerId: string) => {
    if (socket && room) {
      console.log('Voting for player:', playerId);
      socket.emit('vote', room.code, playerId);
    }
  };

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900 text-white">
        <div className="bg-red-500 p-4 rounded-lg">
          <p>{error}</p>
        </div>
      </div>
    );
  }

  if (!room || !socket || !Array.isArray(room.players)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900 text-white">
        <div className="flex flex-col items-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-white mb-4"></div>
          <p className="text-gray-400">Connecting to room...</p>
        </div>
      </div>
    );
  }

  const currentPlayer = room.players.find(p => p.id === socket.id);
  console.log('Current player:', currentPlayer, 'Socket ID:', socket.id);
  console.log('Room players:', room.players);
  console.log('Room status:', room.status);
  console.log('Should show ready button:', currentPlayer && !currentPlayer.isHost && room.status === 'waiting');
  const isCurrentTurn = room.currentPlayerTurn === socket.id;

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {room.status === 'finished' ? (
        // Full screen game results
        <div className="min-h-screen flex items-center justify-center p-4">
          <div className="w-full max-w-4xl">
            <div className="bg-gray-800 rounded-2xl border border-gray-700 p-6">
              {/* Header with room code */}
              <div className="flex items-center justify-between mb-8 pb-4 border-b border-gray-700">
                <h1 className="text-2xl font-medium text-gray-400">
                  Room: <span className="text-white">{room.code}</span>
                </h1>
                <button
                  onClick={() => window.location.href = '/'}
                  className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg text-sm text-gray-300"
                >
                  Leave Room
                </button>
              </div>

              {/* Trophy and title */}
              <div className="flex items-center gap-4 mb-8">
                <div className="bg-yellow-500/20 p-4 rounded-2xl">
                  <span className="text-4xl">🏆</span>
                </div>
                <div>
                  <h2 className="text-3xl font-bold text-yellow-300">Game Results</h2>
                  <p className="text-gray-300 text-lg mt-1">Final standings and choices</p>
                </div>
              </div>
              
              <div className="space-y-4">
                {room.players
                  .sort((a, b) => ((b.votesReceived ?? 0) - (a.votesReceived ?? 0)))
                  .map((player, playerIndex) => (
                    <div 
                      key={player.id} 
                      className={`p-6 rounded-xl ${
                        playerIndex === 0 
                          ? 'bg-gradient-to-r from-yellow-500/10 to-orange-500/10 border-yellow-500/30' 
                          : 'bg-gray-800/50 border-gray-700/50'
                      } border`}
                    >
                      <div className="flex items-center gap-6">
                        <div className={`w-16 h-16 rounded-2xl flex items-center justify-center ${
                          playerIndex === 0 ? 'bg-yellow-500/20' : 'bg-gray-700/50'
                        }`}>
                          {playerIndex === 0 ? '👑' : '👤'}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <h3 className="text-2xl font-bold text-white truncate">
                              {player.name}
                            </h3>
                            {playerIndex === 0 && (
                              <div className="text-yellow-300 text-base font-medium px-4 py-2 bg-yellow-500/10 rounded-xl border border-yellow-500/30 ml-3">
                                Winner! 🏆
                              </div>
                            )}
                          </div>
                          <div className="text-base text-gray-300 flex items-center gap-2 mt-2">
                            <span>🎯</span>
                            {player.votesReceived ?? 0} vote{player.votesReceived !== 1 ? 's' : ''}
                          </div>
                        </div>
                      </div>

                      <div className="mt-6 pl-[5.5rem] space-y-3">
                        {player.usedItems.map((itemId, index) => {
                          const item = room.scenario.items.find(i => i.id === itemId);
                          const situation = room.scenario.situations[index];
                          return (
                            <div key={index} className="bg-gray-900/50 p-4 rounded-xl border border-gray-600/30">
                              <div className="flex items-center gap-4">
                                <span className="px-3 py-1.5 bg-gray-800/70 rounded-lg text-gray-400 font-medium">
                                  #{index + 1}
                                </span>
                                <span className="text-blue-300 font-medium text-lg">{item?.name || 'Unknown Item'}</span>
                                <span className="text-gray-400">→</span>
                                <span className="text-gray-300 flex-1">
                                  {situation?.description}
                                </span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          </div>
        </div>
      ) : (
        // Regular lobby layout
        <div className="min-h-screen">
          {/* Main Content */}
          <div className="min-h-screen p-4">
            <div className="max-w-7xl mx-auto">
              {/* Header - Enhanced */}
              <div className="flex items-center justify-between py-4 px-6 bg-gradient-to-r from-gray-800/90 to-gray-900/90 backdrop-blur-md rounded-2xl border border-gray-700/50 mb-6 shadow-lg">
                <div>
                  <div className="flex items-center gap-3">
                    <div className="bg-purple-500/10 p-2 rounded-lg border border-purple-500/20">
                      <span className="text-2xl">🎮</span>
                    </div>
                    <div>
                      <h1 className="text-2xl">
                        <span className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-purple-400 to-blue-400">Room:</span>
                        <span className="text-white font-bold ml-2">{room.code}</span>
                      </h1>
                      <p className="text-gray-400 mt-1">Share this code with your friends to play together</p>
                    </div>
                  </div>
                </div>
                {message && (
                  <div className="bg-blue-500/10 backdrop-blur-sm px-6 py-3 rounded-xl border border-blue-500/20 shadow-lg">
                    <p className="text-blue-200 font-medium">{message}</p>
                  </div>
                )}
              </div>

              {/* Game Area - Enhanced */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
                {/* Players Section - Enhanced */}
                <div className="lg:col-span-2">
                  <div className="bg-gradient-to-br from-gray-800/90 to-gray-900/90 backdrop-blur-md rounded-2xl border border-gray-700/50 p-6 shadow-lg">
                    {room.status === 'waiting' && (
                      <div className="h-full flex flex-col">
                        {/* Header with Player Count */}
                        <div className="flex items-center justify-between mb-6">
                          <div className="flex items-center gap-4">
                            <div className="bg-blue-500/15 p-3 rounded-xl border border-blue-500/20 shadow-inner">
                              <span className="text-2xl">👥</span>
                            </div>
                            <div>
                              <h2 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-purple-400">
                                Players
                              </h2>
                              <p className="text-gray-400 mt-1">Waiting for players to join...</p>
                            </div>
                          </div>
                          <div className="bg-gray-950/30 backdrop-blur-sm px-5 py-2 rounded-xl border border-gray-700/30 shadow-inner">
                            <span className="text-blue-300 font-bold text-xl">{room.players.length}</span>
                            <span className="text-gray-600 mx-2">/</span>
                            <span className="text-gray-300 text-xl font-medium">{room.maxPlayers}</span>
                          </div>
                        </div>

                        {/* Players Grid - Enhanced */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {room.players.map(player => (
                            <div 
                              key={player.id} 
                              className={`relative rounded-xl border-2 transition-all duration-200 ${
                                player.isReady 
                                  ? 'border-green-500/30 bg-gradient-to-br from-green-900/20 to-green-800/10 shadow-[inset_0_1px_1px_rgba(0,255,0,0.1)]' 
                                  : 'border-gray-700/50 bg-gradient-to-br from-gray-800/50 to-gray-900/50'
                              } p-6 backdrop-blur-md hover:shadow-lg`}
                            >
                              <div className="flex items-center gap-4">
                                <div className={`w-14 h-14 shrink-0 rounded-xl flex items-center justify-center shadow-lg ${
                                  player.isHost 
                                    ? 'bg-gradient-to-br from-yellow-500/20 to-orange-500/20 border border-yellow-500/30' 
                                    : 'bg-gradient-to-br from-gray-700/50 to-gray-800/50 border border-gray-600/30'
                                }`}>
                                  {player.isHost ? (
                                    <span className="text-2xl">👑</span>
                                  ) : (
                                    <span className="text-2xl">👤</span>
                                  )}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-3 mb-2">
                                    <span className="font-bold text-lg text-white truncate">
                                      {player.name}
                                    </span>
                                    {player.isHost && (
                                      <span className="shrink-0 text-yellow-300 text-sm bg-yellow-500/10 px-3 py-1 rounded-full border border-yellow-500/20">
                                        Host
                                      </span>
                                    )}
                                  </div>
                                  <div className={`flex items-center gap-2 ${
                                    player.isReady 
                                      ? 'text-green-400' 
                                      : 'text-gray-400'
                                  }`}>
                                    <div className={`w-2 h-2 rounded-full ${
                                      player.isReady 
                                        ? 'bg-green-400 shadow-[0_0_8px_rgba(74,222,128,0.5)]' 
                                        : 'bg-gray-500'
                                    }`} />
                                    <span className="text-sm font-medium">
                                      {player.isReady ? 'Ready to play' : 'Not ready'}
                                    </span>
                                  </div>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {room.status === 'drafting' && (
                      <div className="space-y-6">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-4">
                            <div className="bg-blue-500/20 p-3 rounded-xl border border-blue-500/20">
                              <span className="text-2xl">🎲</span>
                            </div>
                            <div>
                              <h2 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-purple-400">
                                Draft Phase
                              </h2>
                              <p className="text-gray-400">
                                {isCurrentTurn 
                                  ? "It's your turn! Select an item." 
                                  : `Waiting for ${room.players.find(p => p.id === room.currentPlayerTurn)?.name || 'player'} to choose...`}
                              </p>
                            </div>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                          {room.scenario.items.map(item => {
                            const isItemTaken = room.players.some(p => p.selectedItems.includes(item.id));
                            return (
                              <button
                                key={item.id}
                                onClick={() => selectItem(item.id)}
                                disabled={!isCurrentTurn || isItemTaken}
                                className={`relative p-4 rounded-xl border-2 transition-all duration-200 ${
                                  isItemTaken
                                    ? 'bg-gray-800/50 border-gray-600/50 cursor-not-allowed opacity-50'
                                    : isCurrentTurn
                                    ? 'bg-gradient-to-br from-blue-900/20 to-blue-800/10 border-blue-500/30 hover:shadow-lg hover:border-blue-500/50 cursor-pointer'
                                    : 'bg-gradient-to-br from-gray-800/50 to-gray-900/50 border-gray-700/50 cursor-not-allowed'
                                }`}
                              >
                                <div className="flex flex-col gap-3">
                                  <div className="bg-gray-900/50 p-3 rounded-lg w-12 h-12 flex items-center justify-center">
                                    <span className="text-2xl">🎁</span>
                                  </div>
                                  <div>
                                    <h3 className="font-medium text-lg text-white">{item.name}</h3>
                                    <p className="text-sm text-gray-400 mt-1">{item.description}</p>
                                  </div>
                                </div>
                                {isItemTaken && (
                                  <div className="absolute inset-0 flex items-center justify-center bg-gray-900/80 backdrop-blur-sm rounded-xl">
                                    <span className="text-gray-400 font-medium">Already taken</span>
                                  </div>
                                )}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {room.status === 'situations' && room.currentSituation && (
                      <div className="space-y-6">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-4">
                            <div className="bg-purple-500/20 p-3 rounded-xl border border-purple-500/20">
                              <span className="text-2xl">🎯</span>
                            </div>
                            <div>
                              <h2 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-purple-400 to-pink-400">
                                Current Situation
                              </h2>
                              <p className="text-gray-400">{room.currentSituation.description}</p>
                            </div>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                          {currentPlayer?.selectedItems.map(itemId => {
                            const item = room.scenario.items.find(i => i.id === itemId);
                            const isItemUsed = currentPlayer.usedItems.includes(itemId);
                            const isCurrentChoice = currentPlayer.currentItemChoice === itemId;

                            return (
                              <button
                                key={itemId}
                                onClick={() => selectItem(itemId)}
                                disabled={isItemUsed}
                                className={`relative p-4 rounded-xl border-2 transition-all duration-200 ${
                                  isItemUsed
                                    ? 'bg-gray-800/50 border-gray-600/50 cursor-not-allowed opacity-50'
                                    : isCurrentChoice
                                    ? 'bg-gradient-to-br from-purple-900/20 to-purple-800/10 border-purple-500/30'
                                    : 'bg-gradient-to-br from-gray-800/50 to-gray-900/50 border-gray-700/50 hover:border-purple-500/30'
                                }`}
                              >
                                <div className="flex flex-col gap-3">
                                  <div className="bg-gray-900/50 p-3 rounded-lg w-12 h-12 flex items-center justify-center">
                                    <span className="text-2xl">🎁</span>
                                  </div>
                                  <div>
                                    <h3 className="font-medium text-lg text-white">{item?.name}</h3>
                                    <p className="text-sm text-gray-400 mt-1">{item?.description}</p>
                                  </div>
                                </div>
                                {isItemUsed && (
                                  <div className="absolute inset-0 flex items-center justify-center bg-gray-900/80 backdrop-blur-sm rounded-xl">
                                    <span className="text-gray-400 font-medium">Already used</span>
                                  </div>
                                )}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {room.status === 'voting' && room.currentSituation && (
                      <div className="space-y-6">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-4">
                            <div className="bg-pink-500/20 p-3 rounded-xl border border-pink-500/20">
                              <span className="text-2xl">🗳️</span>
                            </div>
                            <div>
                              <h2 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-pink-400 to-purple-400">
                                Voting Phase
                              </h2>
                              <p className="text-gray-400">Vote for the best solution for: {room.currentSituation.description}</p>
                            </div>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                          {room.players.map(player => {
                            const selectedItem = room.scenario.items.find(item => item.id === player.currentItemChoice);
                            const votes = room.votes || {};
                            const currentVote = votes[socket.id as keyof typeof votes];
                            const hasVoted = currentVote !== undefined;
                            const isVotedByCurrentPlayer = hasVoted && currentVote === player.id;

                            return (
                              <button
                                key={player.id}
                                onClick={() => voteForPlayer(player.id)}
                                disabled={player.id === socket.id || hasVoted}
                                className={`relative p-6 rounded-xl border-2 transition-all duration-200 ${
                                  player.id === socket.id
                                    ? 'bg-gray-800/50 border-gray-600/50 cursor-not-allowed'
                                    : isVotedByCurrentPlayer
                                    ? 'bg-gradient-to-br from-purple-900/20 to-purple-800/10 border-purple-500/30'
                                    : hasVoted
                                    ? 'bg-gray-800/50 border-gray-600/50 cursor-not-allowed'
                                    : 'bg-gradient-to-br from-gray-800/50 to-gray-900/50 border-gray-700/50 hover:border-purple-500/30'
                                }`}
                              >
                                <div className="flex items-center gap-4">
                                  <div className="bg-gray-900/50 p-3 rounded-lg w-12 h-12 flex items-center justify-center">
                                    <span className="text-2xl">{player.id === socket.id ? '👤' : '🎯'}</span>
                                  </div>
                                  <div>
                                    <h3 className="font-medium text-lg text-white">{player.name}</h3>
                                    <p className="text-sm text-gray-400 mt-1">
                                      Selected: {selectedItem?.name || 'Loading...'}
                                    </p>
                                  </div>
                                </div>
                                {(player.id === socket.id || hasVoted) && (
                                  <div className="absolute inset-0 flex items-center justify-center bg-gray-900/80 backdrop-blur-sm rounded-xl">
                                    <span className="text-gray-400 font-medium">
                                      {player.id === socket.id ? "Can't vote for yourself" : 'Already voted'}
                                    </span>
                                  </div>
                                )}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Controls Section - Enhanced */}
                <div className="lg:col-span-1">
                  <div className="bg-gradient-to-br from-gray-800/90 to-gray-900/90 backdrop-blur-md rounded-2xl border border-gray-700/50 p-6 shadow-lg">
                    <div className="space-y-4">
                      {currentPlayer && (
                        <button
                          onClick={toggleReady}
                          className={`w-full py-4 px-6 rounded-xl font-bold text-lg transition-all duration-200 shadow-lg ${
                            currentPlayer.isReady 
                              ? 'bg-gradient-to-r from-red-500/20 to-red-600/20 text-red-300 border-2 border-red-500/30 hover:from-red-500/30 hover:to-red-600/30' 
                              : 'bg-gradient-to-r from-green-500/20 to-green-600/20 text-green-300 border-2 border-green-500/30 hover:from-green-500/30 hover:to-green-600/30'
                          }`}
                        >
                          <div className="flex items-center justify-center gap-3">
                            <span className="text-2xl">
                              {currentPlayer.isReady ? '↺' : '✓'}
                            </span>
                            <span>{currentPlayer.isReady ? 'Cancel Ready' : 'Ready to Play'}</span>
                          </div>
                        </button>
                      )}
                      
                      {currentPlayer?.isHost && (
                        <button
                          onClick={startGame}
                          disabled={!room.players.every(p => p.isReady)}
                          className={`w-full py-4 px-6 rounded-xl font-bold text-lg transition-all duration-200 shadow-lg ${
                            room.players.every(p => p.isReady)
                              ? 'bg-gradient-to-r from-blue-500/20 to-purple-500/20 text-blue-300 border-2 border-blue-500/30 hover:from-blue-500/30 hover:to-purple-500/30'
                              : 'bg-gradient-to-r from-gray-700/50 to-gray-800/50 text-gray-500 border-2 border-gray-600/50 cursor-not-allowed'
                          }`}
                        >
                          <div className="flex items-center justify-center gap-3">
                            <span className="text-2xl">🎮</span>
                            <span>Start Game</span>
                          </div>
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 