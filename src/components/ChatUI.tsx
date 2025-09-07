'use client';

import { useState, useRef, useEffect } from 'react';
import { Send, MessageSquare, Loader2 } from 'lucide-react';
import { Message, Exercise, MelData } from '@/types';

interface ChatUIProps {
  messages: Message[];
  onMessagesUpdate: (messages: Message[]) => void;
  onExerciseCreate: (exercise: Exercise) => void;
  apiKey: string;
  prompt?: string;
  onPromptChange?: (prompt: string) => void;
  sessionId?: string;
  onSessionIdChange?: (sessionId: string) => void;
  onMelUpdate?: (melData: MelData) => void;
  currentMelData?: MelData | null; // Add current MEL data
}

export const ChatUI = ({ messages, onMessagesUpdate, onExerciseCreate, apiKey, prompt, sessionId: propSessionId, onSessionIdChange, onMelUpdate, currentMelData }: ChatUIProps) => {
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [sessionId, setSessionId] = useState<string>(propSessionId || '');
  const [sessionCount, setSessionCount] = useState(0);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Update sessionId when prop changes
  useEffect(() => {
    if (propSessionId && propSessionId !== sessionId) {
      setSessionId(propSessionId);
    }
  }, [propSessionId, sessionId]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const adjustTextareaHeight = () => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = 'auto';
      textarea.style.height = Math.min(textarea.scrollHeight, 120) + 'px';
    }
  };

  useEffect(() => {
    adjustTextareaHeight();
  }, [inputValue]);

  const DEFAULT_LISA_PROMPT = `Your name is Lisa. You are an excellent Crisis Architect, simulation designer, and specialist in creating crisis exercises.

Lisa starts every conversation in a friendly, professional, HAL-inspired style:

- "What crisis would you like to write about today?" (or a natural variation).

Lisa guides users through realistic scenario design, with a focus on communication and decision-making in crisis management.

## Initial Inquiry
**Work step by step unless no information is given already.**

## Workflow – Overview

1. **Start**: "What crisis would you like to write about today?" (or a natural variation).
2. **Acknowledge/Confirm**: When the user describes a scenario, acknowledge and confirm it.
3. **Job Function/Organisation**: Always ask for the job function and organisation of the exercise player, and offer to suggest these if the user prefers.
4. **Suggest (if needed)**: If the user chooses "your choice" (or similar), select the most relevant job function and organisation for the scenario, state your choices, and explicitly ask for user confirmation before proceeding.
5. **Scenario Overview**: Only after the user confirms the job function and organisation, provide the scenario overview with all three events by name, brief description for each event, 3 realistic consequences, and 2 player actions per event (not in JSON).
6. **Stakeholder Check**: Group 'From' names into the most suitable 'Factions' automatically, using best judgment.
7. **Injects**: For each event, generate 5–6 injects using realistic mix of methods per event.
8. **User Review**: Display the injects for user review before generating json.
9. **JSON Output**: When user approves, export only the json file.

## Scenario Structure

Each scenario has three events:
1. Business as Usual (before crisis)
2. Disruption/Incident (during crisis)  
3. Escalation/Consequence (after crisis)

## Communication Methods

Use only these channel names: Email, Microblog, Msngr, TV, Phonecall, Website, Telegraph, Go-Social, Linkedin, Instamedia.

## JSON Output Format

Output as a JSON array. Each object must include:
- **Serial**: Event title or description
- **Number**: Sequential integer starting at 1
- **Time**: Format 00:00
- **From**: Never the player; use realistic names/roles (except Conducttr reminders)
- **Faction**: The associated group or affiliation
- **To**: Always "All"
- **Team**: Leave empty
- **Method**: Channel used
- **On**: Leave empty
- **Subject**: Subject line of emails (leave empty for other channels)
- **Message**: Main content of the communication

Starting Prompt: "What crisis would you like to write about today?"`;

  const currentPrompt = prompt || DEFAULT_LISA_PROMPT;

  const sendMessage = async () => {
    if (!inputValue.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: inputValue.trim(),
      timestamp: new Date(),
    };

    const updatedMessages = [...messages, userMessage];
    onMessagesUpdate(updatedMessages);
    setInputValue('');
    setIsLoading(true);

    try {
      // Create enhanced prompt that includes MEL context if available
      let enhancedPrompt = currentPrompt;
      
      if (currentMelData && currentMelData.injects.length > 0) {
        enhancedPrompt = `${currentPrompt}

## IMPORTANT: MEL CONTEXT PROVIDED
You are working with an EXISTING MEL (Message Exercise List) with ${currentMelData.totalInjects} injects across ${currentMelData.events.length} events.

**Current MEL Version**: ${currentMelData.version}
**MEL ID**: ${currentMelData.melId}
**Last Updated**: ${currentMelData.timestamp}

**CRITICAL INSTRUCTIONS FOR UPDATES:**
1. **PRESERVE USER EDITS**: The user has made manual edits to some injects. You MUST preserve ALL existing injects unless specifically asked to modify them.
2. **TARGETED UPDATES ONLY**: When the user asks for changes, identify the specific inject(s) they're referring to and ONLY modify those injects.
3. **MAINTAIN STRUCTURE**: Keep all inject IDs, numbers, and event structure intact.
4. **OUTPUT FORMAT**: For updates, output ONLY the modified injects as a JSON array with their original IDs preserved.

**Current MEL Summary:**
${currentMelData.events.map(event => `- ${event.name}: ${event.injectCount} injects`).join('\n')}

**Available Injects for Reference:**
${currentMelData.injects.map(inject => `#${inject.Number} (${inject.Serial}): ${inject.From} via ${inject.Method} - "${inject.Message.substring(0, 50)}..."`).join('\n')}

When the user asks for changes:
1. Identify which specific inject(s) they want to modify
2. Output ONLY those inject(s) with the requested changes
3. Keep all other fields identical (including ID, Number, Serial, etc.)
4. DO NOT recreate the entire exercise`;
      }

      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages: updatedMessages,
          apiKey, // This will be optional now, server will use env variable if not provided
          systemPrompt: enhancedPrompt,
          sessionId: sessionId || undefined,
          currentMelData: currentMelData, // Include current MEL context
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      
      // Update session info
      if (data.sessionId) {
        setSessionId(data.sessionId);
        if (onSessionIdChange) {
          onSessionIdChange(data.sessionId);
        }
      }
      if (data.messageCount) {
        setSessionCount(data.messageCount);
      }
      
      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: data.content,
        timestamp: new Date(),
      };

      const finalMessages = [...updatedMessages, assistantMessage];
      onMessagesUpdate(finalMessages);

      // Handle MEL data if present
      if (data.melData && onMelUpdate) {
        onMelUpdate(data.melData);
        console.log('MEL data received:', data.melData);
        
        // Create or update exercise with MEL data
        const exercise: Exercise = {
          id: data.melData.melId,
          title: 'Crisis Exercise',
          scenario: 'Generated from MEL',
          jobFunction: 'Crisis Manager',
          organisation: 'Organization',
          events: [],
          injects: data.melData.injects,
          status: 'complete',
          createdAt: new Date(),
          updatedAt: new Date(),
          melData: data.melData,
        };
        
        onExerciseCreate(exercise);
      } else {
        // Legacy JSON parsing for backward compatibility
        if (data.content.includes('[') && data.content.includes(']')) {
          try {
            const jsonMatch = data.content.match(/\[([\s\S]*?)\]/);
            if (jsonMatch) {
              const injects = JSON.parse(jsonMatch[0]);
              
              // Create exercise object
              const exercise: Exercise = {
                id: Date.now().toString(),
                title: 'Crisis Exercise',
                scenario: 'Generated from chat',
                jobFunction: 'Crisis Manager',
                organisation: 'Organization',
                events: [],
                injects: injects,
                status: 'complete',
                createdAt: new Date(),
                updatedAt: new Date(),
              };
              
              onExerciseCreate(exercise);
            }
          } catch {
            console.log('No valid JSON found in response');
          }
        }
      }
    } catch (error) {
      console.error('Error sending message:', error);
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: 'Sorry, I encountered an error while processing your request. Please try again.',
        timestamp: new Date(),
      };
      onMessagesUpdate([...updatedMessages, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="flex flex-col h-full bg-white border-l border-gray-300">
      {/* Chat Header */}
      <div className="flex items-center p-4 border-b border-gray-200 bg-gray-50">
        <MessageSquare size={20} className="text-gray-600 mr-2" />
        <div className="flex-1">
          <h2 className="text-lg font-semibold text-gray-800">Chat with Lisa</h2>
          {sessionId && (
            <p className="text-xs text-gray-500">Session: {sessionId.substring(8)} • {sessionCount} messages</p>
          )}
        </div>
        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full ${true ? 'bg-green-500' : 'bg-red-500'}`} title="API Key configured in environment"></div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[80%] rounded-lg px-4 py-2 ${
                message.role === 'user'
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-100 text-gray-800'
              }`}
            >
              <div className="whitespace-pre-wrap break-words">{message.content}</div>
              <div
                className={`text-xs mt-1 ${
                  message.role === 'user' ? 'text-blue-100' : 'text-gray-500'
                }`}
              >
                {formatTime(message.timestamp)}
              </div>
            </div>
          </div>
        ))}
        
        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-gray-100 text-gray-800 rounded-lg px-4 py-2">
              <div className="flex items-center space-x-2">
                <Loader2 size={16} className="animate-spin" />
                <span>Lisa is thinking...</span>
              </div>
            </div>
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="border-t border-gray-200 p-4">
        <div className="flex items-end space-x-2">
          <div className="flex-1">
            <textarea
              ref={textareaRef}
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Type your message..."
              disabled={isLoading}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
              rows={1}
              style={{ minHeight: '40px', maxHeight: '120px' }}
            />
          </div>
          <button
            onClick={sendMessage}
            disabled={!inputValue.trim() || isLoading}
            className="p-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
          >
            <Send size={20} />
          </button>
        </div>
      </div>
    </div>
  );
};
