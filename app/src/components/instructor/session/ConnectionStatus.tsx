// Fixed bottom-right realtime connection status indicator with a Reconnect button when disconnected.
'use client';

import * as React from 'react';

import { SessionContext } from './SessionContext';

/** Displays a green "Connected" badge or a red "Disconnected" badge with a Reconnect button. */
export function ConnectionStatus(props: Readonly<{
  isConnected?: boolean;
  onReconnect?: () => void;
}>) {
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
        className="fixed bottom-4 right-4 z-40 flex items-center gap-2 px-3 py-2 rounded-full"
        style={{
          background: 'var(--surface-glass)',
          backdropFilter: 'blur(8px)',
          border: '1px solid var(--color-primary-alpha-25)',
          boxShadow: '0 2px 12px var(--color-black-alpha-10)',
        }}
      >
        <span
          className="h-2 w-2 rounded-full animate-pulse"
          style={{ background: 'var(--color-primary-400)' }}
        />
        <span className="text-xs font-medium text-brand-600">
          Connected
        </span>
      </div>
    );
  }

  return (
    <div
      className="fixed bottom-4 right-4 z-40 flex items-center gap-2 px-3 py-2 rounded-full"
      style={{
        background: 'var(--color-error-alpha-08)',
        backdropFilter: 'blur(8px)',
        border: '1px solid var(--color-error-alpha-25)',
        boxShadow: '0 2px 12px var(--color-black-alpha-10)',
      }}
    >
      <span className="h-2 w-2 rounded-full bg-red-500 animate-pulse" />
      <span className="text-sm font-medium text-err-600">
        {reconnecting ? 'Reconnecting\u2026' : 'Disconnected'}
      </span>
      {reconnecting ? null : (
        <button
          onClick={handleClick}
          className="ml-1 px-2.5 py-1 text-xs rounded-full font-medium text-white transition-all duration-150"
          style={{ background: 'var(--color-error-500)' }}
        >
          Reconnect
        </button>
      )}
    </div>
  );
}
