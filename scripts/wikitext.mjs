// Minimal wikitext helpers: extract top-level templates and their parameters.
// Handles nested {{templates}}, [[links|labels]] and {{{params}}} when splitting on `|`.

/**
 * @param {string} text
 * @returns {{ name: string, params: Record<string, string> }[]}
 */
export function extractTemplates(text) {
  const out = [];
  let i = 0;
  while (i < text.length) {
    const start = text.indexOf('{{', i);
    if (start === -1) break;
    const end = findClose(text, start);
    if (end === -1) break;
    const body = text.slice(start + 2, end);
    if (!body.startsWith('{')) out.push(parseTemplate(body)); // skip {{{params}}}
    i = end + 2;
  }
  return out;
}

/** Index of the `}}` closing the `{{` at `start`, or -1. */
function findClose(text, start) {
  let depth = 0;
  for (let i = start; i < text.length - 1; i++) {
    if (text[i] === '{' && text[i + 1] === '{') { depth++; i++; }
    else if (text[i] === '}' && text[i + 1] === '}') {
      depth--;
      if (depth === 0) return i;
      i++;
    }
  }
  return -1;
}

function splitTopLevel(body) {
  const parts = [];
  let curly = 0;
  let square = 0;
  let buf = '';
  for (let i = 0; i < body.length; i++) {
    const two = body.slice(i, i + 2);
    if (two === '{{') { curly++; buf += two; i++; continue; }
    if (two === '}}') { curly--; buf += two; i++; continue; }
    if (two === '[[') { square++; buf += two; i++; continue; }
    if (two === ']]') { square--; buf += two; i++; continue; }
    if (body[i] === '|' && curly === 0 && square === 0) { parts.push(buf); buf = ''; continue; }
    buf += body[i];
  }
  parts.push(buf);
  return parts;
}

function parseTemplate(body) {
  const [rawName, ...rest] = splitTopLevel(body);
  const params = {};
  let positional = 1;
  for (const part of rest) {
    const eq = part.indexOf('=');
    // `=` inside a nested template does not make a named param.
    const nested = part.indexOf('{{');
    if (eq !== -1 && (nested === -1 || eq < nested)) {
      params[part.slice(0, eq).trim()] = part.slice(eq + 1).trim();
    } else {
      params[String(positional++)] = part.trim();
    }
  }
  return { name: rawName.trim().replace(/_/g, ' '), params };
}

/** Strips links, bold/italic, comments and tags to get readable text. */
export function plainText(value) {
  return String(value ?? '')
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/<br\s*\/?>/gi, ' ')
    .replace(/<[^>]+>/g, '')
    .replace(/\[\[(?:[^\]|]*\|)?([^\]]*)\]\]/g, '$1')
    .replace(/'{2,}/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}
