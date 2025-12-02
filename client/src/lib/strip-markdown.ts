export function stripMarkdown(text: string, maxLength?: number): string {
  let result = text
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/\*([^*]+)\*/g, '$1')
    .replace(/__([^_]+)__/g, '$1')
    .replace(/_([^_]+)_/g, '$1')
    .replace(/~~([^~]+)~~/g, '$1')
    .replace(/`{3}[\s\S]*?`{3}/g, '')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/!\[([^\]]*)\]\([^)]+\)/g, '')
    .replace(/^\s*[-*+]\s+/gm, '')
    .replace(/^\s*\d+\.\s+/gm, '')
    .replace(/^\s*>\s+/gm, '')
    .replace(/^\s*[-*_]{3,}\s*$/gm, '')
    .replace(/\|[^\n]+\|/g, '')
    .replace(/\n{2,}/g, ' ')
    .replace(/\n/g, ' ')
    .trim();

  if (maxLength && result.length > maxLength) {
    result = result.substring(0, maxLength).trim() + '...';
  }

  return result;
}
