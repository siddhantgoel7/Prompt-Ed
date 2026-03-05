import { render, screen, fireEvent, act } from '@testing-library/react';
import { ConnectionStatus } from '@/components/instructor/session/ConnectionStatus';

jest.mock('@/components/ui/button', () => ({
  Button: (props: any) => <button {...props} />,
}));

describe('ConnectionStatus', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });
  afterEach(() => {
    jest.useRealTimers();
  });

  // 1. Shows "Connected" with green dot when connected
  it('[US 1.53][AT1] shows Connected status when isConnected=true', () => {
    render(<ConnectionStatus isConnected={true} onReconnect={jest.fn()} />);

    expect(screen.getByText('Connected')).toBeInTheDocument();
    const dot = screen.getByText('Connected').previousElementSibling!;
    expect(dot.className).toContain('bg-green-500');
    expect(dot.className).toContain('animate-pulse');
  });

  // 2. Shows "Disconnected" with red dot and Reconnect button when disconnected
  it('[US 1.53][AT2] shows Disconnected status with Reconnect button when isConnected=false', () => {
    render(<ConnectionStatus isConnected={false} onReconnect={jest.fn()} />);

    expect(screen.getByText('Disconnected')).toBeInTheDocument();
    const dot = screen.getByText('Disconnected').previousElementSibling!;
    expect(dot.className).toContain('bg-red-500');
    expect(dot.className).toContain('animate-pulse');
    expect(screen.getByRole('button', { name: /Reconnect/i })).toBeInTheDocument();
  });

  // 3. Clicking Reconnect calls onReconnect and shows "Reconnecting…"
  it('[US 1.53][AT3] clicking Reconnect calls onReconnect and shows Reconnecting state', () => {
    const onReconnect = jest.fn();
    render(<ConnectionStatus isConnected={false} onReconnect={onReconnect} />);

    fireEvent.click(screen.getByRole('button', { name: /Reconnect/i }));

    expect(onReconnect).toHaveBeenCalledTimes(1);
    expect(screen.getByText('Reconnecting\u2026')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Reconnect/i })).not.toBeInTheDocument();
  });

  // 4. After reconnecting, status goes back to "Connected" (not "Reconnected")
  it('[US 1.53][AT4] returns to Connected after successful reconnect', () => {
    const { rerender } = render(
      <ConnectionStatus isConnected={false} onReconnect={jest.fn()} />
    );

    // Click reconnect
    fireEvent.click(screen.getByRole('button', { name: /Reconnect/i }));
    expect(screen.getByText('Reconnecting\u2026')).toBeInTheDocument();

    // Connection restored
    rerender(<ConnectionStatus isConnected={true} onReconnect={jest.fn()} />);

    expect(screen.getByText('Connected')).toBeInTheDocument();
    expect(screen.queryByText('Reconnecting\u2026')).not.toBeInTheDocument();
    expect(screen.queryByText('Reconnected')).not.toBeInTheDocument();
  });

  // 5. Dots have pulse animation in all states
  it('[US 1.53][AT5] dots have animate-pulse class in both connected and disconnected states', () => {
    const { rerender } = render(
      <ConnectionStatus isConnected={true} onReconnect={jest.fn()} />
    );

    // Connected state - green pulsing dot
    const connectedDot = screen.getByText('Connected').previousElementSibling!;
    expect(connectedDot.className).toContain('animate-pulse');
    expect(connectedDot.className).toContain('bg-green-500');

    // Disconnected state - red pulsing dot
    rerender(<ConnectionStatus isConnected={false} onReconnect={jest.fn()} />);
    const disconnectedDot = screen.getByText('Disconnected').previousElementSibling!;
    expect(disconnectedDot.className).toContain('animate-pulse');
    expect(disconnectedDot.className).toContain('bg-red-500');
  });

  // 6. No Reconnect button when connected
  it('[US 1.53][AT6] no Reconnect button when connected', () => {
    render(<ConnectionStatus isConnected={true} onReconnect={jest.fn()} />);

    expect(screen.queryByRole('button', { name: /Reconnect/i })).not.toBeInTheDocument();
  });

  // 7. Transition from connected to disconnected
  it('[US 1.53][AT7] transitions from Connected to Disconnected when connection drops', () => {
    const { rerender } = render(
      <ConnectionStatus isConnected={true} onReconnect={jest.fn()} />
    );

    expect(screen.getByText('Connected')).toBeInTheDocument();

    rerender(<ConnectionStatus isConnected={false} onReconnect={jest.fn()} />);

    expect(screen.getByText('Disconnected')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Reconnect/i })).toBeInTheDocument();
  });
});
