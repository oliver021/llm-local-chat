import { Message } from '../types';

export interface MessageGroup {
  date: string;
  messages: Message[];
}

/**
 * Format timestamp to time string (e.g., "2:30 PM")
 */
export function formatTime(timestamp: number): string {
  const date = new Date(timestamp);
  return date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

/**
 * Check if timestamp is from today
 */
function isToday(timestamp: number): boolean {
  const today = new Date();
  const messageDate = new Date(timestamp);
  return (
    today.getFullYear() === messageDate.getFullYear() &&
    today.getMonth() === messageDate.getMonth() &&
    today.getDate() === messageDate.getDate()
  );
}

/**
 * Check if timestamp is from yesterday
 */
function isYesterday(timestamp: number): boolean {
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const messageDate = new Date(timestamp);
  return (
    yesterday.getFullYear() === messageDate.getFullYear() &&
    yesterday.getMonth() === messageDate.getMonth() &&
    yesterday.getDate() === messageDate.getDate()
  );
}

/**
 * Format timestamp to date string for grouping
 * Returns "Today", "Yesterday", or "Mar 15"
 */
export function formatDateForGrouping(timestamp: number): string {
  if (isToday(timestamp)) {
    return 'Today';
  }
  if (isYesterday(timestamp)) {
    return 'Yesterday';
  }

  const date = new Date(timestamp);
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  });
}

/**
 * Group messages by date
 */
export function groupMessagesByDate(messages: Message[]): MessageGroup[] {
  const groups: { [key: string]: Message[] } = {};

  messages.forEach((message) => {
    const dateKey = formatDateForGrouping(message.timestamp);
    if (!groups[dateKey]) {
      groups[dateKey] = [];
    }
    groups[dateKey].push(message);
  });

  // Return groups in order: Today, Yesterday, then oldest dates first
  const dateOrder: { [key: string]: number } = {};
  const order = ['Today', 'Yesterday'];
  order.forEach((date, index) => {
    dateOrder[date] = index;
  });

  return Object.entries(groups)
    .sort((a, b) => {
      // "Today" and "Yesterday" come first
      const aOrder = dateOrder[a[0]] ?? Infinity;
      const bOrder = dateOrder[b[0]] ?? Infinity;

      if (aOrder !== Infinity && bOrder !== Infinity) {
        return bOrder - aOrder;
      }
      if (aOrder !== Infinity) return 1;
      if (bOrder !== Infinity) return -1;

      // For other dates, sort oldest first (chronological order)
      const aDate = new Date(a[1][0]?.timestamp ?? 0);
      const bDate = new Date(b[1][0]?.timestamp ?? 0);
      return aDate.getTime() - bDate.getTime();
    })
    .map(([date, msgs]) => ({
      date,
      messages: msgs,
    }));
}
