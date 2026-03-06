'use client';

import * as React from 'react';
import { Button } from '@/components/ui/button';

export function ConnectionStatus({
  isConnected,
  onReconnect,
}: {
  isConnected: boolean;
  onReconnect: () => void;
}) {
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
      <div className="fixed bottom-4 right-4 z-50 flex items-center gap-2 rounded-lg border bg-white px-3 py-2 shadow-sm">
        <span className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
        <span className="text-xs text-muted-foreground">Connected</span>
      </div>
    );
  }

  return (
    <div className="fixed bottom-4 right-4 z-50 flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 shadow-lg">
      <span className="h-2 w-2 rounded-full bg-red-500 animate-pulse" />
      <span className="text-sm font-medium text-red-800">
        {reconnecting ? 'Reconnecting\u2026' : 'Disconnected'}
      </span>
      {!reconnecting ? (
        <Button size="sm" variant="outline" className="ml-1 h-7 text-xs" onClick={handleClick}>
          Reconnect
        </Button>
      ) : null}
    </div>
  );
}
