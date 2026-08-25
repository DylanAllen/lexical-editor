import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import type { EditorState } from "lexical";
import { $getRoot } from "lexical";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Checks if a given string is a valid JSON string.
 */
export function isJsonString(str: string): boolean {
  if (typeof str !== "string" || !str.trim()) return false;
  try {
    const result = JSON.parse(str);
    return typeof result === "object" && result !== null;
  } catch {
    return false;
  }
}

/**
 * Recursively extracts plain text from a Lexical node AST.
 */
function extractTextFromLexicalNode(node: any): string {
  if (!node) return "";
  if (typeof node.text === "string") return node.text;
  if (node.type === "image") {
    return node.altText ? `[Image: ${node.altText}]` : "[Image]";
  }
  if (Array.isArray(node.children)) {
    return node.children
      .map(extractTextFromLexicalNode)
      .filter(Boolean)
      .join(" ");
  }
  return "";
}

/**
 * Converts Markdown string or HTML into clean plain text.
 */
function stripMarkdownAndHtml(content: string): string {
  return content
    // Remove HTML tags
    .replace(/<[^>]*>?/gm, "")
    // Convert markdown images ![alt](url) to [Image: alt] or [Image]
    .replace(/!\[(.*?)\]\(.*?\)/g, (_match, alt) => (alt ? `[Image: ${alt}]` : "[Image]"))
    // Convert markdown links [text](url) to text
    .replace(/\[(.*?)\]\(.*?\)/g, "$1")
    // Remove code block markers
    .replace(/```[\s\S]*?```/g, (match) => {
      return match.replace(/```[a-z]*\n?/gi, "").trim();
    })
    // Remove inline code backticks
    .replace(/`([^`]+)`/g, "$1")
    // Remove header markers (#, ##, etc.)
    .replace(/^#{1,6}\s+/gm, "")
    // Remove blockquote markers
    .replace(/^>\s+/gm, "")
    // Remove unordered list markers (*, -, +)
    .replace(/^[\*\-+]\s+/gm, "")
    // Remove ordered list markers (1., 2., etc.)
    .replace(/^\d+\.\s+/gm, "")
    // Remove bold and italic markers
    .replace(/[*_]{1,3}([^*_]+)[*_]{1,3}/g, "$1")
    // Remove strikethrough markers
    .replace(/~~(.*?)~~/g, "$1")
    // Normalize multiple spaces and newlines
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Extracts clean plain text from rich-text content (serialized Lexical JSON, Markdown, or raw text).
 *
 * @param content The rich-text content string (Lexical JSON or Markdown or plain text)
 * @param maxLen Optional maximum length to truncate the output
 * @param suffix Optional suffix when truncated (defaults to "...")
 * @returns Plain text representation of the content
 */
export function getPlainTextFromRichText(
  content: string,
  maxLen?: number,
  suffix: string = "..."
): string {
  if (!content) return "";
  let text = "";

  if (isJsonString(content)) {
    try {
      const parsed = JSON.parse(content);
      if (parsed?.root) {
        const extracted = extractTextFromLexicalNode(parsed.root)
          .replace(/\s+/g, " ")
          .trim();
        if (extracted) {
          text = extracted;
        }
      }
    } catch {
      // Fallback to stripping markdown/html
    }
  }

  if (!text) {
    text = stripMarkdownAndHtml(content);
  }

  if (typeof maxLen === "number" && maxLen > 0 && text.length > maxLen) {
    return text.slice(0, maxLen).trim() + suffix;
  }

  return text;
}

/**
 * Extracts plain text directly from an active Lexical EditorState.
 *
 * @param editorState The Lexical EditorState
 * @param maxLen Optional maximum length to truncate
 * @param suffix Optional suffix when truncated (defaults to "...")
 * @returns Plain text representation of the editor state
 */
export function getPlainTextFromEditorState(
  editorState: EditorState,
  maxLen?: number,
  suffix: string = "..."
): string {
  let text = "";
  editorState.read(() => {
    const root = $getRoot();
    text = root.getTextContent().replace(/\s+/g, " ").trim();
  });

  if (typeof maxLen === "number" && maxLen > 0 && text.length > maxLen) {
    return text.slice(0, maxLen).trim() + suffix;
  }

  return text;
}
