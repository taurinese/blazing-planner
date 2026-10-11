import { describe, expect, it } from 'vitest';
// @ts-expect-error plain JS module without types
import { extractTemplates, plainText } from './wikitext.mjs';

describe('wikitext', () => {
  it('extracts named and positional params with nested templates and links', () => {
    const text = `Intro {{Ninja Infobox
| name = Naruto Uzumaki
| element = {{Icon|Bravery}}
| stars = 5-6
| link = [[Sage Mode|Sage]]
| positional
}} outro {{Stub}}`;
    const [info, stub] = extractTemplates(text);
    expect(info.name).toBe('Ninja Infobox');
    expect(info.params).toMatchObject({
      name: 'Naruto Uzumaki',
      element: '{{Icon|Bravery}}',
      stars: '5-6',
      link: '[[Sage Mode|Sage]]',
      '1': 'positional',
    });
    expect(stub).toEqual({ name: 'Stub', params: {} });
  });

  it('cleans markup into plain text', () => {
    expect(plainText("'''[[Naruto Uzumaki|Naruto]]'''<br/>Sage <!-- x -->Mode")).toBe('Naruto Sage Mode');
  });
});
