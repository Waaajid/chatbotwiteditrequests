'use client';

import { useState, useEffect, useCallback } from 'react';
import { AppUI } from './AppUI';
import { ChatUI } from './ChatUI';
import { Exercise, Message, MelData, Inject } from '@/types';

const ExerciseEditor = () => {
  const [currentExercise, setCurrentExercise] = useState<Exercise | null>(null);
  const [currentMel, setCurrentMel] = useState<MelData | null>(null);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      role: 'assistant',
      content: 'Hello! I\'m Lisa, your Crisis Architect. What crisis would you like to write about today?',
      timestamp: new Date(),
    },
  ]);
  const [apiKey, setApiKey] = useState<string>('');
  const [sessionId, setSessionId] = useState<string>('');
  const [prompt, setPrompt] = useState<string>('');

  // Auto-save session when messages or exercise changes
  useEffect(() => {
    if (sessionId && (messages.length > 1 || currentExercise)) {
      saveSession();
    }
  }, [messages, currentExercise, sessionId]);

  // Handle MEL updates from user edits
  const handleMelUpdate = async (updatedInjects: Inject[]) => {
    if (!currentMel || !sessionId) return;

    try {
      const response = await fetch('/api/chat', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sessionId,
          melId: currentMel.melId,
          injects: updatedInjects,
          action: 'updateInjects'
        }),
      });

      if (response.ok) {
        const data = await response.json();
        if (data.melData) {
          setCurrentMel(data.melData);
          
          // Update exercise with new MEL data
          if (currentExercise) {
            setCurrentExercise({
              ...currentExercise,
              injects: data.melData.injects,
              melData: data.melData
            });
          }
        }
      }
    } catch (error) {
      console.error('Failed to update MEL:', error);
    }
  };

  // Save session
  const saveSession = useCallback(async () => {
    if (!sessionId) return;
    
    try {
      await fetch('/api/sessions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sessionId,
          exercise: currentExercise,
          messages,
        }),
      });
    } catch (error) {
      console.error('Failed to save session:', error);
    }
  }, [sessionId, currentExercise, messages]);

  // Auto-save session when messages or exercise changes
  useEffect(() => {
    if (sessionId && (messages.length > 1 || currentExercise)) {
      saveSession();
    }
  }, [messages, currentExercise, sessionId, saveSession]);

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const loadSession = async (id: string) => {
    try {
      const response = await fetch(`/api/sessions?sessionId=${id}`);
      if (response.ok) {
        const data = await response.json();
        if (data.session) {
          setMessages(data.session.messages || []);
          setCurrentExercise(data.session.exercise || null);
          setSessionId(id);
        }
      }
    } catch (error) {
      console.error('Failed to load session:', error);
    }
  };

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Left Panel - App UI */}
      <div className="flex-1 border-r border-gray-300">
        <AppUI 
          exercise={currentExercise} 
          onExerciseUpdate={setCurrentExercise}
          apiKey={apiKey}
          onApiKeyChange={setApiKey}
          prompt={prompt}
          onPromptChange={setPrompt}
          melData={currentMel}
          onMelUpdate={handleMelUpdate}
        />
      </div>
      
      {/* Right Panel - Chat UI */}
      <div className="w-1/2">
        <ChatUI 
          messages={messages}
          onMessagesUpdate={setMessages}
          onExerciseCreate={setCurrentExercise}
          apiKey={apiKey}
          prompt={prompt}
          onPromptChange={setPrompt}
          sessionId={sessionId}
          onSessionIdChange={setSessionId}
          onMelUpdate={setCurrentMel}
          currentMelData={currentMel}
        />
      </div>
    </div>
  );
};

export default ExerciseEditor;
