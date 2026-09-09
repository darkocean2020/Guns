import ts from 'typescript';
import type { Plugin } from 'vite';
import translations from './english.json';

// Translate at build time so both pages use the same game rules and assets.
// Missing translations fail the English build instead of shipping mixed UI.
export function englishPage(): Plugin {
  const dictionary = translations as Record<string, string>;
  return {
    name: 'harbor-english-page',
    enforce: 'pre',
    transform(code, id) {
      if (id.includes('node_modules') || !/\.(ts|tsx)$/.test(id)) return;
      const source = ts.createSourceFile(id, code, ts.ScriptTarget.Latest, true);
      const edits: { start: number; end: number; value: string }[] = [];
      function visit(node: ts.Node) {
        if (ts.isStringLiteral(node) || ts.isJsxText(node) || ts.isTemplateHead(node) || ts.isTemplateMiddle(node) || ts.isTemplateTail(node) || ts.isNoSubstitutionTemplateLiteral(node)) {
          if (/\p{Script=Han}/u.test(node.text)) {
            const key = node.text.trim().replace(/\s+/g, ' ');
            const translated = dictionary[key];
            if (translated === undefined) throw new Error(`Missing English translation in ${id}: ${key}`);
            const leading = node.text.match(/^\s*/)?.[0] ?? '';
            const trailing = node.text.match(/\s*$/)?.[0] ?? '';
            const value = leading + translated + trailing;
            let replacement: string;
            if (ts.isJsxText(node)) replacement = value;
            else if (ts.isStringLiteral(node)) replacement = JSON.stringify(value);
            else {
              const escaped = value.replace(/\\/g, '\\\\').replace(/`/g, '\\`').replace(/\$\{/g, '\\${');
              replacement = (ts.isTemplateHead(node) || ts.isNoSubstitutionTemplateLiteral(node) ? '`' : '}') + escaped + (ts.isTemplateTail(node) || ts.isNoSubstitutionTemplateLiteral(node) ? '`' : '${');
            }
            edits.push({ start: ts.isJsxText(node) ? node.pos : node.getStart(source), end: node.end, value: replacement });
          }
        }
        ts.forEachChild(node, visit);
      }
      visit(source);
      for (const edit of edits.sort((a, b) => b.start - a.start)) code = code.slice(0, edit.start) + edit.value + code.slice(edit.end);
      return edits.length ? { code, map: null } : null;
    },
  };
}
