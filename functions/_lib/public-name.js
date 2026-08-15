export const PUBLIC_NAME_MAX_GRAPHEMES = 12;

function graphemes(value) {
  const text = String(value || '');
  try {
    if (typeof Intl !== 'undefined' && Intl.Segmenter) {
      return [...new Intl.Segmenter(undefined, {granularity:'grapheme'}).segment(text)].map(item => item.segment);
    }
  } catch {}
  return Array.from(text);
}

export function compactPublicName(value, fallback='Player') {
  const cleaned = String(value || '').replace(/[\u0000-\u001F\u007F]/g, '').replace(/\s+/g, ' ').trim() || fallback;
  const parts = graphemes(cleaned);
  if (parts.length <= PUBLIC_NAME_MAX_GRAPHEMES) return cleaned;
  return `${parts.slice(0, PUBLIC_NAME_MAX_GRAPHEMES - 1).join('')}…`;
}
