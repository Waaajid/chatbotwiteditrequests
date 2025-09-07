import { NextRequest, NextResponse } from 'next/server';

interface SessionData {
  id: string;
  messages: Array<{ role: string; content: string; id?: string }>;
  lastActivity: string;
  createdAt: string;
  exercise?: unknown;
}

// In-memory session storage (in production, use a database)
const sessions = new Map<string, SessionData>();

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const sessionId = url.searchParams.get('sessionId');

    if (!sessionId) {
      // Return list of all sessions
      const sessionList = Array.from(sessions.keys()).map(id => ({
        id,
        lastActivity: sessions.get(id)?.lastActivity || new Date().toISOString(),
        messageCount: sessions.get(id)?.messages?.length || 0,
      }));
      return NextResponse.json({ sessions: sessionList });
    }

    // Return specific session
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

export async function POST(request: NextRequest) {
  try {
    const { sessionId, exercise, messages } = await request.json();

    if (!sessionId) {
      return NextResponse.json({ error: 'Session ID required' }, { status: 400 });
    }

    // Save or update session
    const session = {
      id: sessionId,
      exercise,
      messages,
      lastActivity: new Date().toISOString(),
      createdAt: sessions.get(sessionId)?.createdAt || new Date().toISOString(),
    };

    sessions.set(sessionId, session);

    return NextResponse.json({ success: true, session });
  } catch (error) {
    console.error('Save session error:', error);
    return NextResponse.json(
      { error: 'Failed to save session' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const sessionId = url.searchParams.get('sessionId');

    if (!sessionId) {
      return NextResponse.json({ error: 'Session ID required' }, { status: 400 });
    }

    sessions.delete(sessionId);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete session error:', error);
    return NextResponse.json(
      { error: 'Failed to delete session' },
      { status: 500 }
    );
  }
}
