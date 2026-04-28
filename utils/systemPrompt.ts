import { Assistant, PersonalizationSettings } from '../types';

export function buildSystemPrompt(
  activeAssistant: Assistant | null,
  personalization: PersonalizationSettings
): string | null {
  const parts: string[] = [];

  if (activeAssistant?.systemPrompt.trim()) {
    parts.push(activeAssistant.systemPrompt.trim());
  }

  if (personalization.customInstructions.trim()) {
    parts.push(`## User Instructions\n${personalization.customInstructions.trim()}`);
  }

  if (personalization.memoriesEnabled && personalization.memories.length > 0) {
    const lines = personalization.memories.map(m => `- ${m.content}`).join('\n');
    parts.push(`## What you know about the user\n${lines}`);
  }

  return parts.length > 0 ? parts.join('\n\n') : null;
}
