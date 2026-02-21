import he from 'he';

export function decodeHtml(input) {
  if (input == null) return '';
  return he.decode(String(input));
}

// Minimal entity decoding for strings that may come from WP already partially encoded
export function decodeHtmlEntities(input = '') {
  if (!input) return '';
  return String(input)
    .replace(/&#038;/g, '&')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>');
}

export function stripHtml(input) {
  if (input == null) return '';
  const decoded = decodeHtml(input);

  // Strip style/script blocks first, then convert common line-break tags, then remove the rest.
  return decoded
    .replace(/<style[\s\S]*?>[\s\S]*?<\/style>/gi, '')
    .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, '')
    .replace(/<\s*br\s*\/?\s*>/gi, '\n')
    .replace(/<\s*\/p\s*>/gi, '\n\n')
    .replace(/<[^>]+>/g, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

// Safely render WP strings that may contain HTML entities / tags
export function wpText(input = '') {
  return stripHtml(decodeHtmlEntities(input));
}
