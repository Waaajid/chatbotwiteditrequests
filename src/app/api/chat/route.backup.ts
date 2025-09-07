import { NextRequest, NextResponse } from 'next/server';
import { randomUUID } from 'crypto';

// Types for better type safety
interface Inject {
  id?: string;
  melId?: string;
  Number?: string | number;
  Serial?: string;
  Time?: string;
  From?: string;
  Faction?: string;
  To?: string;
  Team?: string;
  Method?: string;
  On?: string;
  Subject?: string;
  Message?: string;
  originalIndex?: number;
  lastModified?: string;
  [key: string]: unknown;
}

interface MelData {
  melId: string;
  version: number;
  timestamp: string;
  injects: Inject[];
  totalInjects: number;
  events: Event[];
}

interface Event {
  id: string;
  name: string;
  injectCount: number;
}

interface Session {
  messages: Array<{ role: string; content: string; id?: string }>;
  lastActivity: string;
  createdAt: string;
  currentMel?: MelData;
  melHistory?: Array<MelData & { createdAt: string; source: string }>;
}

// In-memory session storage (in production, use a database)
const sessions = new Map<string, Session>();

// Helper function to detect and extract JSON from message content
function extractJsonFromContent(content: string): Inject[] | null {
  try {
    // Look for JSON code blocks
    const jsonBlockMatch = content.match(/```json\s*([\s\S]*?)\s*```/);
    if (jsonBlockMatch) {
      return JSON.parse(jsonBlockMatch[1]);
    }

    // Look for plain JSON arrays in the content
    const jsonArrayMatch = content.match(/\[\s*{[\s\S]*}\s*\]/);
    if (jsonArrayMatch) {
      return JSON.parse(jsonArrayMatch[0]);
    }

    return null;
  } catch (error) {
    console.error('Failed to parse JSON from content:', error);
    return null;
  }
}

// Helper function to mint UUIDs for injects and create MEL version
function createMelVersion(injects: Inject[], melId?: string): MelData {
  const currentMelId = melId || randomUUID();
  const timestamp = new Date().toISOString();

  // Add UUIDs to each inject if they don't have them
  const injectsWithIds = injects.map((inject, index) => ({
    ...inject,
    id: inject.id || randomUUID(),
    melId: currentMelId,
    originalIndex: index,
    lastModified: timestamp
  }));

  return {
    melId: currentMelId,
    version: 1,
    timestamp,
    injects: injectsWithIds,
    totalInjects: injectsWithIds.length,
    events: extractEventsFromInjects(injectsWithIds)
  };
}

// Helper function to extract unique events from injects
function extractEventsFromInjects(injects: Inject[]): Event[] {
  const eventMap = new Map();

  injects.forEach(inject => {
    const eventName = inject.Serial;
    if (!eventMap.has(eventName)) {
      eventMap.set(eventName, {
        id: randomUUID(),
        name: eventName,
        injectCount: 0
      });
    }
    eventMap.get(eventName).injectCount++;
  });

  return Array.from(eventMap.values());
}

// Helper function to update MEL version with user edits
function updateMelVersion(currentMel: MelData, updatedInjects: Inject[]): MelData {
  const timestamp = new Date().toISOString();

  return {
    ...currentMel,
    version: currentMel.version + 1,
    timestamp,
    injects: updatedInjects.map(inject => ({
      ...inject,
      lastModified: timestamp
    })),
    totalInjects: updatedInjects.length,
    events: extractEventsFromInjects(updatedInjects)
  };
}

// Helper function to merge updated injects with existing MEL
function mergeMelUpdates(currentMel: MelData | null, updatedInjects: Inject[]): MelData {
  if (!currentMel || !currentMel.injects) {
    // No existing MEL, treat as new creation
    return createMelVersion(updatedInjects);
  }

  // Create a map of existing injects by ID and Number for quick lookup
  const existingInjectsMap = new Map();
  currentMel.injects.forEach((inject: Inject) => {
    existingInjectsMap.set(inject.id, inject);
    existingInjectsMap.set(inject.Number, inject);
  });

  // Determine if this is a partial update or full replacement
  const isPartialUpdate = updatedInjects.length < currentMel.injects.length;

  if (isPartialUpdate) {
    // Partial update: merge updated injects with existing ones
    const mergedInjects = [...currentMel.injects];

    updatedInjects.forEach(updatedInject => {
      const existingIndex = mergedInjects.findIndex(existing =>
        existing.id === updatedInject.id ||
        existing.Number === updatedInject.Number
      );

      if (existingIndex >= 0) {
        // Update existing inject while preserving ID and metadata
        mergedInjects[existingIndex] = {
          ...updatedInject,
          id: mergedInjects[existingIndex].id, // Preserve original ID
          melId: currentMel.melId, // Preserve MEL ID
          lastModified: new Date().toISOString()
        };
      } else {
        // Add new inject with proper ID
        mergedInjects.push({
          ...updatedInject,
          id: updatedInject.id || randomUUID(),
          melId: currentMel.melId,
          lastModified: new Date().toISOString()
        });
      }
    });

    return updateMelVersion(currentMel, mergedInjects);
  } else {
    // Full replacement: create new MEL version
    return updateMelVersion(currentMel, updatedInjects);
  }
}

// Helper function to process Responses API output
function processResponsesApiOutput(responseData: any): { content: string; extractedJson: Inject[] | null; toolCalls?: any[]; action?: string } {
  let content = '';
  let extractedJson: Inject[] | null = null;
  let toolCalls: any[] = [];
  let action = 'merge'; // default action

  // Handle structured responses from Responses API
  if (responseData.choices && responseData.choices[0]) {
    const choice = responseData.choices[0];
    
    // Extract content from message
    if (choice.message && choice.message.content) {
      content = choice.message.content;
    }
    
    // Extract tool calls if present
    if (choice.message && choice.message.tool_calls) {
      toolCalls = choice.message.tool_calls;
    }
    
    // Try to parse JSON from content first
    if (content) {
      extractedJson = extractJsonFromContent(content);
    }
    
    // Handle structured JSON schema response (preferred for Responses API)
    if (choice.message && choice.message.parsed) {
      const parsed = choice.message.parsed;
      if (parsed.updatedInjects && Array.isArray(parsed.updatedInjects)) {
        extractedJson = parsed.updatedInjects;
        action = parsed.action || 'merge';
      }
    }
  }

  return { content, extractedJson, toolCalls, action };
}

// Build MEL context for the API request
function buildMelContext(currentMel: MelData | null): string {
  if (!currentMel || !currentMel.injects) {
    return "No existing MEL context. This is a new exercise creation.";
  }

  return JSON.stringify({
    melId: currentMel.melId,
    version: currentMel.version,
    totalInjects: currentMel.totalInjects,
    injects: currentMel.injects.map(inject => ({
      id: inject.id,
      Number: inject.Number,
      Serial: inject.Serial,
      Time: inject.Time,
      From: inject.From,
      Faction: inject.Faction,
      To: inject.To,
      Team: inject.Team,
      Method: inject.Method,
      On: inject.On,
      Subject: inject.Subject,
      Message: inject.Message
    }))
  });
}

export async function POST(request: NextRequest) {
  try {
    const { messages, apiKey, systemPrompt, sessionId, currentMelData } = await request.json();

    // Use provided API key or fallback to environment variable
    const openaiApiKey = apiKey || process.env.OPENAI_API_KEY;

    if (!openaiApiKey) {
      return NextResponse.json(
        { error: 'API key is required' },
        { status: 400 }
      );
    }

    // Get or create session
    const currentSessionId = sessionId || `session_${Date.now()}`;
    let session = sessions.get(currentSessionId);

    if (!session) {
      session = {
        messages: [],
        lastActivity: new Date().toISOString(),
        createdAt: new Date().toISOString(),
      };
      sessions.set(currentSessionId, session);
    }

    // Update session with current MEL if provided
    if (currentMelData) {
      session.currentMel = currentMelData;
    }

    // Build the complete message history for the API call
    // Clean messages to only include role and content (remove id and other fields)
    const cleanMessages = (messages as Array<{ role: string; content: string; id?: string }>).map((msg) => ({
      role: msg.role,
      content: msg.content
    }));

    // Get current MEL context
    const existingMel = currentMelData || session.currentMel;
    const melContext = buildMelContext(existingMel);

    // Build input array for Responses API
    const inputMessages = [
      {
        role: 'system',
        content: systemPrompt
      },
      ...cleanMessages,
      {
        role: 'user',
        content: `Current MEL Context: ${melContext}`
      }
    ];

    // Call OpenAI Chat Completions API (correct endpoint)
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${openaiApiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages: inputMessages,
        temperature: 0.7,
        max_tokens: 2000,
        stream: false
      }),
    });
                      Method: { type: 'string' },
                      On: { type: 'string' },
                      Subject: { type: 'string' },
                      Message: { type: 'string' }
                    },
                    required: ['Number', 'Serial', 'Time', 'From', 'Faction', 'To', 'Team', 'Method', 'On', 'Subject', 'Message'],
                    additionalProperties: false
                  }
                },
                explanation: { type: 'string' }
              },
              required: ['action', 'updatedInjects'],
              additionalProperties: false
            }
          }
        },
        tools: [
          {
            type: 'function',
            function: {
              name: 'mergeMelUpdates',
              description: 'Smart merge partial updates into existing MEL',
              parameters: {
                type: 'object',
                properties: {
                  melId: { type: 'string' },
                  updatedInjects: { 
                    type: 'array', 
                    items: { type: 'object' } 
                  }
                },
                required: ['melId', 'updatedInjects']
              }
            }
          },
          {
            type: 'function',
            function: {
              name: 'updateMelVersion',
              description: 'Replace all injects and increment version',
              parameters: {
                type: 'object',
                properties: {
                  melId: { type: 'string' },
                  newInjects: { 
                    type: 'array', 
                    items: { type: 'object' } 
                  }
                },
                required: ['melId', 'newInjects']
              }
            }
          }
        ]
      }),
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error('OpenAI Responses API Error:', {
        status: response.status,
        statusText: response.statusText,
        error: errorData
      });
      return NextResponse.json(
        { error: `OpenAI Responses API Error: ${response.status} - ${errorData}` },
        { status: response.status }
      );
    }

    const responseData = await response.json();

    // Process the structured response
    const { content, extractedJson, toolCalls, action } = processResponsesApiOutput(responseData);

    // Default content if none provided
    const finalContent = content || 'Exercise data has been processed using Responses API.';

    // Process MEL data from structured response
    let melData = null;

    if (extractedJson && Array.isArray(extractedJson)) {
      console.log('Structured injects detected from Responses API, processing MEL update');

      if (existingMel && existingMel.injects && existingMel.injects.length > 0) {
        // This is an update to existing MEL
        if (action === 'merge') {
          melData = mergeMelUpdates(existingMel, extractedJson);
          console.log(`Merged MEL to version ${melData.version} - ${extractedJson.length} injects processed`);
        } else {
          melData = updateMelVersion(existingMel, extractedJson);
          console.log(`Replaced MEL to version ${melData.version} - ${extractedJson.length} injects processed`);
        }
      } else {
        // This is a new MEL - create version 1
        melData = createMelVersion(extractedJson);
        console.log(`Created new MEL version 1 with ID: ${melData.melId}`);
      }

      // Store MEL in session
      session.currentMel = melData;
      
      // Also store in MEL history for versioning
      if (!session.melHistory) {
        session.melHistory = [];
      }
      session.melHistory.push({
        ...melData,
        createdAt: new Date().toISOString(),
        source: action === 'merge' ? 'partial_update_responses' : 'full_creation_responses'
      });
    }

    // Update session with the new message exchange
    const updatedMessages = [
      ...messages,
      {
        role: 'assistant',
        content: finalContent
      }
    ];

    session.messages = updatedMessages;
    session.lastActivity = new Date().toISOString();
    sessions.set(currentSessionId, session);

    return NextResponse.json({
      content: finalContent,
      sessionId: currentSessionId,
      messageCount: session.messages.length,
      melData: melData, // Include MEL data if structured response was detected
      hasJson: !!extractedJson,
      apiType: 'responses', // Indicate this is using Responses API
      action: action, // Include the action taken
      toolCalls: toolCalls && toolCalls.length > 0 ? toolCalls : undefined
    });
  } catch (error) {
    console.error('Responses API Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Get session history
export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const sessionId = url.searchParams.get('sessionId');

    if (!sessionId) {
      return NextResponse.json({ sessions: Array.from(sessions.keys()) });
    }

    const session = sessions.get(sessionId);
    if (!session) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }

    return NextResponse.json({ session });
  } catch (error) {
    console.error('Get session error:', error);
    return NextResponse.json(
      { error: 'Failed to retrieve session' },
      { status: 500 }
    );
  }
}

// Update MEL with user edits
export async function PUT(request: NextRequest) {
  try {
    const { sessionId, melId, injects, action } = await request.json();

    if (!sessionId) {
      return NextResponse.json(
        { error: 'Session ID is required' },
        { status: 400 }
      );
    }

    const session = sessions.get(sessionId);
    if (!session) {
      return NextResponse.json(
        { error: 'Session not found' },
        { status: 404 }
      );
    }

    if (action === 'updateInjects' && injects && Array.isArray(injects)) {
      // User made edits to injects in the frontend
      const currentMel = session.currentMel;

      if (!currentMel || currentMel.melId !== melId) {
        return NextResponse.json(
          { error: 'MEL not found or ID mismatch' },
          { status: 404 }
        );
      }

      // Create updated MEL version
      const updatedMel = updateMelVersion(currentMel, injects);
      session.currentMel = updatedMel;

      // Add to history
      if (!session.melHistory) {
        session.melHistory = [];
      }
      session.melHistory.push({
        ...updatedMel,
        createdAt: new Date().toISOString(),
        source: 'user_edit'
      });

      sessions.set(sessionId, session);

      return NextResponse.json({
        success: true,
        melData: updatedMel,
        message: `MEL updated to version ${updatedMel.version}`
      });
    }

    return NextResponse.json(
      { error: 'Invalid action or missing data' },
      { status: 400 }
    );
  } catch (error) {
    console.error('MEL update error:', error);
    return NextResponse.json(
      { error: 'Failed to update MEL' },
      { status: 500 }
    );
  }
}
