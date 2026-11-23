export function decodeHtmlEntities(input: string, stripTags = false): string {
  let base = input
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&nbsp;/gi, ' ')
    .replace(/&#(\d+);/g, (_m, dec) => String.fromCharCode(Number(dec)))
    .replace(/&#x([0-9a-f]+);/gi, (_m, hex) => String.fromCharCode(parseInt(hex, 16)));

  if (stripTags) {
    base = base.replace(/<br\s*\/?>/gi, '\n');
    let previous: string;
    do {
      previous = base;
      base = base.replace(/<[^>]+>/g, '');
    } while (base !== previous);
  }

  return base.trim();
}
