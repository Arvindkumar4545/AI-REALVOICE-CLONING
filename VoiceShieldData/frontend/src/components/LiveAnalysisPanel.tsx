/**
 * LiveAnalysisPanel Component
 * Displays live microphone recording status, elapsed time, and session controls.
 */

import React, { useState, useEffect } from 'react';
import { Mic, Square, Loader } from 'lucide-react';

interface LiveAnalysisPanelProps {
  isRecording: boolean;
  isConnected: boolean;
  elapsedSeconds: number;
  riskScore?: number;
  classification?: 'BONA_FIDE' | 'UNCERTAIN' | 'SPOOF';
  chunksSent?: number;
  latencyMs?: number;
  onStart: () => void;
  onStop: () => void;
}

export const LiveAnalysisPanel: React.FC<LiveAnalysisPanelProps> = ({
  isRecording,
  isConnected,
  elapsedSeconds,
  riskScore = 0,
  classification,
  chunksSent = 0,
  latencyMs = 0,
  onStart,
  onStop,
}) => {
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const getRiskColor = (score: number) => {
    if (score < 0.35) return 'text-green-600';
    if (score < 0.65) return 'text-amber-600';
    return 'text-red-600';
  };

  const getRiskBgColor = (score: number) => {
    if (score < 0.35) return 'bg-green-50 border-green-200';
    if (score < 0.65) return 'bg-amber-50 border-amber-200';
    return 'bg-red-50 border-red-200';
  };

  return (
    <div className="bg-white rounded-lg shadow-lg border border-gray-200 p-6">
      <div className="space-y-4">
        {/* Header with status */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="relative">
              <Mic className="w-8 h-8 text-blue-600" />
              {isRecording && (
                <div className="absolute inset-0 animate-pulse">
                  <Mic className="w-8 h-8 text-red-500 opacity-75" />
                </div>
              )}
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Live Audio Analysis</h3>
              <p className="text-sm text-gray-500">
                {isRecording ? (
                  <span className="inline-flex items-center gap-1">
                    <span className="inline-block w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                    Recording...
                  </span>
                ) : (
                  'Ready to record'
                )}
              </p>
            </div>
          </div>

          {/* Connection status */}
          <div className="flex items-center gap-2">
            <div
              className={`w-3 h-3 rounded-full ${isConnected ? 'bg-green-500' : 'bg-gray-300'}`}
            />
            <span className="text-sm text-gray-600">
              {isConnected ? 'Connected' : 'Disconnected'}
            </span>
          </div>
        </div>

        {/* Time and risk display */}
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
            <p className="text-sm text-gray-600 mb-1">Elapsed Time</p>
            <p className="text-3xl font-mono font-bold text-gray-900">
              {formatTime(elapsedSeconds)}
            </p>
          </div>

          <div className={`rounded-lg p-4 border ${getRiskBgColor(riskScore)}`}>
            <p className="text-sm text-gray-600 mb-1">Risk Score</p>
            <div className="flex items-end gap-2">
              <p className={`text-3xl font-bold ${getRiskColor(riskScore)}`}>
                {(riskScore * 100).toFixed(1)}%
              </p>
              {classification && (
                <span
                  className={`text-xs font-semibold px-2 py-1 rounded-full mb-1 ${
                    classification === 'BONA_FIDE'
                      ? 'bg-green-200 text-green-800'
                      : classification === 'UNCERTAIN'
                      ? 'bg-amber-200 text-amber-800'
                      : 'bg-red-200 text-red-800'
                  }`}
                >
                  {classification}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Control buttons */}
        <div className="flex gap-3">
          <button
            onClick={onStart}
            disabled={isRecording || !isConnected}
            className="flex-1 flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 text-white font-medium py-3 rounded-lg transition"
          >
            <Mic className="w-5 h-5" />
            Start Recording
          </button>

          <button
            onClick={onStop}
            disabled={!isRecording}
            className="flex-1 flex items-center justify-center gap-2 bg-red-600 hover:bg-red-700 disabled:bg-gray-300 text-white font-medium py-3 rounded-lg transition"
          >
            <Square className="w-5 h-5" />
            Stop Recording
          </button>
        </div>

        {/* Metrics footer */}
        <div className="grid grid-cols-3 gap-2 text-center text-sm border-t border-gray-200 pt-4">
          <div>
            <p className="text-gray-600">Chunks</p>
            <p className="font-semibold text-gray-900">{chunksSent}</p>
          </div>
          <div>
            <p className="text-gray-600">Latency</p>
            <p className="font-semibold text-gray-900">{latencyMs.toFixed(0)}ms</p>
          </div>
          <div>
            <p className="text-gray-600">Status</p>
            <p className="font-semibold">
              {isRecording ? (
                <span className="text-blue-600 flex items-center justify-center gap-1">
                  <Loader className="w-4 h-4 animate-spin" />
                  Live
                </span>
              ) : (
                'Idle'
              )}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
