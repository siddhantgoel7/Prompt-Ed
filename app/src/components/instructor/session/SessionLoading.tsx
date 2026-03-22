// Full-screen loading state shown while the session page fetches lesson data.
// Tests detect this state via data-testid="loading-screen" on the LoadingScreen
// component — do not remove that attribute or change the component without
// updating the corresponding test assertions.
import { LoadingScreen } from '@/components/ui/LoadingScreen';

/** Renders a full-screen loading animation while session data is being fetched. */
export function SessionLoading() {
  return <LoadingScreen />;
}
