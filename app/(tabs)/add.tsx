import { Redirect } from 'expo-router';

/**
 * The middle tab never actually renders — its press is intercepted in the tab
 * layout and routed to the composer modal. This exists so the route is valid
 * (and so a deep link to /add still does the right thing).
 */
export default function AddTab() {
  return <Redirect href="/compose" />;
}
