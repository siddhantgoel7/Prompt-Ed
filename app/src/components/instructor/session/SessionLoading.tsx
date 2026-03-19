// Full-screen loading state shown while the session page fetches lesson data.
import { LoadingScreen } from '@/components/ui/LoadingScreen';

/** Renders a full-screen loading animation while session data is being fetched. */
export function SessionLoading() {
  return <LoadingScreen />;
}
