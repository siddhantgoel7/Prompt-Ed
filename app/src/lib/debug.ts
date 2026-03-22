/**
 * Set NEXT_PUBLIC_DEBUG_TOOLS=true in .env.local to enable debug UI
 * (sweep runner, copy report button). Never set this in production.
 */
export const DEBUG_TOOLS = process.env.NEXT_PUBLIC_DEBUG_TOOLS === 'true';
