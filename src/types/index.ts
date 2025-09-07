export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

export interface Event {
  name: string;
  description: string;
  consequences: string[];
  playerActions: string[];
}

export interface Inject {
  id?: string; // UUID for tracking
  Serial: string;
  Number: number;
  Time: string;
  From: string;
  Faction: string;
  To: string;
  Team: string;
  Method: string;
  On: string;
  Subject: string;
  Message: string;
  melId?: string; // MEL ID this inject belongs to
  originalIndex?: number; // Original position in the list
  lastModified?: string; // Timestamp of last modification
}

export interface MelEvent {
  id: string;
  name: string;
  injectCount: number;
}

export interface MelData {
  melId: string;
  version: number;
  timestamp: string;
  injects: Inject[];
  totalInjects: number;
  events: MelEvent[];
}

export interface Exercise {
  id: string;
  title: string;
  scenario: string;
  jobFunction: string;
  organisation: string;
  events: Event[];
  injects: Inject[];
  status: 'draft' | 'complete';
  createdAt: Date;
  updatedAt: Date;
  melData?: MelData; // Current MEL version
}

export interface Session {
  sessionId: string;
  messages: Message[];
  exercises: Exercise[];
  currentMel?: MelData;
  melHistory?: MelData[];
  lastActivity: string;
  createdAt: string;
}

export interface OpenAIResponse {
  id: string;
  object: string;
  created_at: number;
  status: string;
  model: string;
  output: Array<{
    type: string;
    id: string;
    status: string;
    role: string;
    content: Array<{
      type: string;
      text: string;
      annotations: unknown[];
    }>;
  }>;
  usage: {
    input_tokens: number;
    output_tokens: number;
    total_tokens: number;
  };
}
