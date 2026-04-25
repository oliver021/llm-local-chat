export interface Message {
  id: string;
  role: 'user' | 'ai';
  content: string;
  timestamp: number;
  isEdited?: boolean;
  editedAt?: number;
  // Streaming: true while the AI response is being written token by token.
  // The bubble renders partial content live; the cursor animates until false.
  isStreaming?: boolean;
}

export interface ChatSession {
  id: string;
  title: string;
  isPinned: boolean;
  updatedAt: number;
  messages: Message[];
}

export type Theme = 'light' | 'dark';
