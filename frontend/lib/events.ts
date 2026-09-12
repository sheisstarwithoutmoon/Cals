/**
 * A tiny global pub/sub so data-fetching hooks (useMeals, useGoal) can
 * refetch when something outside their own component — like the AI chat
 * assistant — changes the underlying data.
 */
const DATA_CHANGED_EVENT = "cals:data-changed";

export function notifyDataChanged() {
  window.dispatchEvent(new Event(DATA_CHANGED_EVENT));
}

export function onDataChanged(handler: () => void) {
  window.addEventListener(DATA_CHANGED_EVENT, handler);
  return () => window.removeEventListener(DATA_CHANGED_EVENT, handler);
}
