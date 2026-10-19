/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { ModelRecord } from '../types';

/**
 * Creates a boolean evaluator function from a user-supplied search filter query.
 * 
 * Rules:
 * 1. Accepts multiple whitespace-separated terms, defaulting to boolean "OR" connection:
 *    e.g. "claude gpt" -> matches if model contains "claude" OR "gpt"
 *    e.g. "meta deepseek google" -> matches if any of the three is present
 * 2. Recognizes explicit boolean operators: "AND", "OR", "NOT" (case-insensitive):
 *    e.g. "claude AND 3.5" -> requires both "claude" and "3.5"
 *    e.g. "gpt NOT mini" -> requires "gpt" and NOT "mini"
 *    e.g. "NOT deepseek" -> models that do not contain "deepseek"
 * 3. Supports quoted exact phrases:
 *    e.g. "\"gpt 4o\""
 * 4. Supports parentheses:
 *    e.g. "(claude OR gpt) AND 3.5"
 */
export function createFilterMatcher(queryString: string): (targetText: string) => boolean {
  const q = queryString.trim();
  if (!q) return () => true;

  // 1. Tokenize into terms, quoted strings, operators, and parens
  const regex = /"([^"]*)"?|([()])|([^\s()"]+)/g;
  interface Token {
    type: 'TERM' | 'AND' | 'OR' | 'NOT' | 'LPAREN' | 'RPAREN';
    value: string;
  }

  const rawTokens: Token[] = [];
  let m: RegExpExecArray | null;
  while ((m = regex.exec(q)) !== null) {
    if (m[1] !== undefined) {
      if (m[1].trim()) rawTokens.push({ type: 'TERM', value: m[1].toLowerCase().trim() });
    } else if (m[2] === '(') {
      rawTokens.push({ type: 'LPAREN', value: '(' });
    } else if (m[2] === ')') {
      rawTokens.push({ type: 'RPAREN', value: ')' });
    } else if (m[3] !== undefined) {
      const val = m[3];
      const upper = val.toUpperCase();
      if (upper === 'AND' || val === '&&' || val === '+') {
        rawTokens.push({ type: 'AND', value: 'AND' });
      } else if (upper === 'OR' || val === '||') {
        rawTokens.push({ type: 'OR', value: 'OR' });
      } else if (upper === 'NOT' || val === '!' || val.startsWith('-')) {
        if (val.startsWith('-') && val.length > 1) {
          rawTokens.push({ type: 'NOT', value: 'NOT' });
          rawTokens.push({ type: 'TERM', value: val.slice(1).toLowerCase().trim() });
        } else {
          rawTokens.push({ type: 'NOT', value: 'NOT' });
        }
      } else {
        rawTokens.push({ type: 'TERM', value: val.toLowerCase().trim() });
      }
    }
  }

  if (rawTokens.length === 0) return () => true;

  // 2. Insert implicit operators:
  // - Consecutive operands (TERM/RPAREN followed by TERM/LPAREN) default to boolean "OR"
  // - Operand followed by NOT defaults to boolean "AND" (e.g. "gpt NOT mini" -> "gpt AND NOT mini")
  const tokens: Token[] = [];
  for (let i = 0; i < rawTokens.length; i++) {
    tokens.push(rawTokens[i]);
    if (i < rawTokens.length - 1) {
      const curr = rawTokens[i];
      const next = rawTokens[i + 1];
      const isCurrOperand = curr.type === 'TERM' || curr.type === 'RPAREN';
      const isNextOperand = next.type === 'TERM' || next.type === 'LPAREN';
      if (isCurrOperand && isNextOperand) {
        tokens.push({ type: 'OR', value: 'OR' });
      } else if (isCurrOperand && next.type === 'NOT') {
        tokens.push({ type: 'AND', value: 'AND' });
      }
    }
  }

  // 3. Recursive-descent AST evaluator
  let pos = 0;

  function parseOr(): (target: string) => boolean {
    let node = parseAnd();
    while (pos < tokens.length && tokens[pos].type === 'OR') {
      pos++;
      if (pos >= tokens.length) break;
      const right = parseAnd();
      const left = node;
      node = (target) => left(target) || right(target);
    }
    return node;
  }

  function parseAnd(): (target: string) => boolean {
    let node = parseNot();
    while (pos < tokens.length && tokens[pos].type === 'AND') {
      pos++;
      if (pos >= tokens.length) break;
      const right = parseNot();
      const left = node;
      node = (target) => left(target) && right(target);
    }
    return node;
  }

  function parseNot(): (target: string) => boolean {
    if (pos < tokens.length && tokens[pos].type === 'NOT') {
      pos++;
      if (pos >= tokens.length) return () => false;
      const sub = parseNot();
      return (target) => !sub(target);
    }
    return parsePrimary();
  }

  function parsePrimary(): (target: string) => boolean {
    if (pos >= tokens.length) return () => true;
    const t = tokens[pos++];
    if (t.type === 'TERM') {
      const val = t.value;
      return (target) => target.includes(val);
    }
    if (t.type === 'LPAREN') {
      const sub = parseOr();
      if (pos < tokens.length && tokens[pos].type === 'RPAREN') {
        pos++;
      }
      return sub;
    }
    return () => true;
  }

  try {
    const matcher = parseOr();
    return (searchTarget: string) => matcher(searchTarget.toLowerCase());
  } catch {
    return () => true;
  }
}

/**
 * Builds a comprehensive search string from a model's identifying fields
 */
export function getModelSearchText(model: ModelRecord): string {
  return `${model.displayName} ${model.name} ${model.companyName} ${model.creatorClean} ${model.creator || ''}`.toLowerCase();
}

/**
 * Evaluates whether a ModelRecord matches a user search filter
 */
export function matchesModelQuery(model: ModelRecord, query: string): boolean {
  if (!query || !query.trim()) return true;
  const matcher = createFilterMatcher(query);
  return matcher(getModelSearchText(model));
}
