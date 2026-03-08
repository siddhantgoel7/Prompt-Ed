// Placeholder Socket.io route — not in active use; real-time is handled via Supabase Realtime.
// Kept as a reference stub should a custom server be adopted in the future.
import { Server as SocketIOServer } from 'socket.io';
import { NextResponse } from 'next/server';

let io: SocketIOServer | undefined;

/** Returns a status message explaining that Socket.io requires a custom server setup. */
export async function GET() {
  if (!io) {
    // Socket.io will be initialized on first request
    // For Next.js App Router, we need to use a different approach
    // This is a placeholder - actual socket.io integration requires a custom server
    // or using Supabase Realtime instead

    return NextResponse.json({
      message: 'Socket.io requires custom server setup. Use Supabase Realtime or deploy with custom server.'
    });
  }

  return NextResponse.json({ message: 'Socket.io connected' });
}
