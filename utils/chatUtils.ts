/** Maximum character length for auto-generated chat titles. */
export const MAX_TITLE_LENGTH = 30;

/**
 * Derives a display title from the first message of a new chat.
 * Truncates at MAX_TITLE_LENGTH and appends "..." if needed.
 */
export function makeChatTitle(content: string): string {
  return content.length > MAX_TITLE_LENGTH
    ? `${content.slice(0, MAX_TITLE_LENGTH)}...`
    : content;
}
