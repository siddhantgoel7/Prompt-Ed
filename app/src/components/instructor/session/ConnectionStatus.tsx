// Fixed bottom-right realtime connection status indicator with a Reconnect button when disconnected.
'use client';

import * as React from 'react';
import { Button } from '@/components/ui/button';

import { SessionContext } from './SessionContext';

/** Displays a green "Connected" badge or a red "Disconnected" badge with a Reconnect button. */
export function ConnectionStatus(props: {
  isConnected?: boolean;
  onReconnect?: () => void;
}) {
  const context = React.useContext(SessionContext);
  const isConnected = context ? context.isConnected : props.isConnected!;
  const onReconnect = context ? context.handleReconnect : props.onReconnect!;
  const [reconnecting, setReconnecting] = React.useState(false);

  // Reset reconnecting flag once connection is restored
  React.useEffect(() => {
    if (isConnected && reconnecting) {
      setReconnecting(false);
    }
  }, [isConnected, reconnecting]);

  const handleClick = () => {
    setReconnecting(true);
    onReconnect();
  };

  if (isConnected) {
    return (
      <div
        className="fixed bottom-4 right-4 z-50 flex items-center gap-2 px-3 py-2 rounded-full"
        style={{
          background: 'var(--surface-glass)',
          backdropFilter: 'blur(8px)',
          border: '1px solid rgba(45,158,45,0.25)',
          boxShadow: '0 2px 12px rgba(0,0,0,0.1)',
        }}
      >
        <span
          className="h-2 w-2 rounded-full animate-pulse"
          style={{ background: 'var(--color-primary-400)' }}
        />
        <span className="text-xs font-medium" style={{ color: 'var(--color-primary-600)' }}>
          Connected
        </span>
      </div>
    );
  }

  return (
    <div
      className="fixed bottom-4 right-4 z-50 flex items-center gap-2 px-3 py-2 rounded-full"
      style={{
        background: 'rgba(239,68,68,0.08)',
        backdropFilter: 'blur(8px)',
        border: '1px solid rgba(239,68,68,0.25)',
        boxShadow: '0 2px 12px rgba(0,0,0,0.1)',
      }}
    >
      <span className="h-2 w-2 rounded-full bg-red-500 animate-pulse" />
      <span className="text-sm font-medium" style={{ color: '#dc2626' }}>
        {reconnecting ? 'Reconnecting…' : 'Disconnected'}
      </span>
      {!reconnecting ? (
        <button
          onClick={handleClick}
          className="ml-1 px-2.5 py-1 text-xs rounded-full font-medium text-white transition-all duration-150"
          style={{ background: '#ef4444' }}
        >
          Reconnect
        </button>
      ) : null}
    </div>
  );
}
