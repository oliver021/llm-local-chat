export type AppErrorCode =
  | 'NETWORK_UNREACHABLE'
  | 'NETWORK_TIMEOUT'
  | 'AUTH_MISSING'
  | 'AUTH_INVALID'
  | 'MODEL_ERROR'
  | 'DB_WRITE_FAILED'
  | 'DB_READ_FAILED'
  | 'STREAM_PARSE_ERROR'
  | 'STREAM_INTERRUPTED'
  | 'UNKNOWN';

export interface AppError extends Error {
  code: AppErrorCode;
  userFacing: boolean;
  userMessage?: string;
  retryable: boolean;
}

export function makeAppError(
  message: string,
  code: AppErrorCode,
  opts: { userFacing?: boolean; userMessage?: string; retryable?: boolean } = {}
): AppError {
  const err = new Error(message) as AppError;
  err.code = code;
  err.userFacing = opts.userFacing ?? false;
  err.userMessage = opts.userMessage;
  err.retryable = opts.retryable ?? false;
  return err;
}

export interface Message {
  id: string;
  role: 'user' | 'ai';
  content: string;
  timestamp: number;
  isEdited?: boolean;
  editedAt?: number;
  isStreaming?: boolean;
  isError?: boolean;
  errorCode?: AppErrorCode;
}

export interface ChatSession {
  id: string;
  title: string;
  isPinned: boolean;
  isArchived?: boolean;
  createdAt?: number;
  updatedAt: number;
  messages: Message[];
}

export type Theme = 'light' | 'dark';

export type ThemeName = 'default' | 'ocean' | 'sunset' | 'forest' | 'violet' | 'rose' | 'midnight' | 'gold';

export interface Bookmark {
  id: string;
  messageId: string;
  chatId: string;
  title: string;
  note?: string;
  createdAt: number;
}

// ── Assistant Manager ────────────────────────────────────────────────────────
export interface Assistant {
  id: string;
  name: string;
  avatarEmoji: string;
  systemPrompt: string;
  createdAt: number;
  updatedAt: number;
}

export type ActiveAssistantId = string | null;

// ── Personalization ──────────────────────────────────────────────────────────
export interface Memory {
  id: string;
  content: string;
  createdAt: number;
}

export interface PersonalizationSettings {
  displayName: string;
  customInstructions: string;
  memoriesEnabled: boolean;
  memories: Memory[];
}

// ── Web Search ───────────────────────────────────────────────────────────────
export type WebSearchProvider = 'tavily' | 'serpapi' | 'brave';

export interface WebSearchSettings {
  enabled: boolean;
  provider: WebSearchProvider;
  apiKey: string;
}

// ── MCP ──────────────────────────────────────────────────────────────────────
export interface MCPServer {
  id: string;
  name: string;
  urlOrCommand: string;
  enabled: boolean;
  createdAt: number;
}

// ── Voice Settings ───────────────────────────────────────────────────────────
export type TTSProvider = 'elevenlabs' | 'openai-tts' | 'browser';
export type STTProvider = 'whisper' | 'browser';

export interface VoiceSettings {
  ttsEnabled: boolean;
  sttEnabled: boolean;
  ttsProvider: TTSProvider;
  sttProvider: STTProvider;
  apiKey: string;
  selectedVoice: string;
  speed: number;
  pitch: number;
}
