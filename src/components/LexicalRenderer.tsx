import * as React from "react";
import { LexicalComposer } from "@lexical/react/LexicalComposer";
import { RichTextPlugin } from "@lexical/react/LexicalRichTextPlugin";
import { ContentEditable } from "@lexical/react/LexicalContentEditable";
import { LexicalErrorBoundary } from "@lexical/react/LexicalErrorBoundary";
import { ImageNode } from "./ImageNode";
import { AutoLinkPlugin } from "@lexical/react/LexicalAutoLinkPlugin";
import { AutoLinkNode, LinkNode } from "@lexical/link";
import { HeadingNode, QuoteNode } from "@lexical/rich-text";
import { ListNode, ListItemNode } from "@lexical/list";
import { CodeNode } from "@lexical/code";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

import LexicalTheme from "../lib/lexical-theme";
import { isJsonString } from "../lib/utils";
import type { EditorThemeMode } from "./Editor";

function onError(error: Error) {
  console.error("LexicalRenderer error:", error);
}

export interface LexicalRendererProps {
  /**
   * The serialized Lexical JSON string/object or Markdown string to render.
   */
  initialState: string | any;
  /**
   * Optional custom CSS class name for the wrapper element.
   */
  className?: string;
  /**
   * Theme mode: 'light' | 'dark' | 'unstyled' | 'auto' | 'system'
   * Defaults to 'auto'
   */
  theme?: EditorThemeMode;
  /**
   * Optional custom Lexical theme configuration to override default classes.
   */
  themeConfig?: Record<string, any>;
}

const URL_MATCHER =
  /((https?:\/\/(www\.)?)|(www\.))[-a-zA-Z0-9@:%._+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_+.~#?&//=]*)/;

const MATCHERS = [
  (text: string) => {
    const match = URL_MATCHER.exec(text);
    if (match === null) {
      return null;
    }
    const fullMatch = match[0];
    return {
      index: match.index,
      length: fullMatch.length,
      text: fullMatch,
      url: fullMatch.startsWith("http") ? fullMatch : `https://${fullMatch}`,
    };
  },
];

export function LexicalRenderer({
  initialState,
  className,
  theme = "auto",
  themeConfig,
}: LexicalRendererProps) {
  if (!initialState) return null;

  const contentStr =
    typeof initialState === "object" && initialState !== null
      ? JSON.stringify(initialState)
      : String(initialState);

  if (!contentStr.trim()) return null;

  const activeTheme: EditorThemeMode =
    theme === "system" ? "auto" : theme || "auto";

  const themeClassName =
    activeTheme === "light"
      ? "editor-theme-light"
      : activeTheme === "dark"
      ? "editor-theme-dark"
      : activeTheme === "unstyled"
      ? "editor-unstyled"
      : "editor-theme-auto";

  const wrapperClasses = [
    "editor-renderer",
    themeClassName,
    className || "",
  ]
    .filter(Boolean)
    .join(" ");

  // Render Markdown if string is not Lexical JSON
  if (!isJsonString(contentStr)) {
    return (
      <div className={wrapperClasses} data-editor-theme={activeTheme}>
        <div className="editor-renderer-markdown prose dark:prose-invert max-w-none">
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            components={{
              img: ({ src, alt }) => (
                <img
                  src={src || ""}
                  alt={alt || ""}
                  className="editor-image"
                  loading="lazy"
                />
              ),
              a: ({ href, children }) => (
                <a
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="editor-link"
                >
                  {children}
                </a>
              ),
            }}
          >
            {contentStr}
          </ReactMarkdown>
        </div>
      </div>
    );
  }

  const mergedTheme = themeConfig ? { ...LexicalTheme, ...themeConfig } : LexicalTheme;

  return (
    <div className={wrapperClasses} data-editor-theme={activeTheme}>
      <LexicalComposer
        key={contentStr}
        initialConfig={{
          namespace: "LexicalRenderer",
          theme: mergedTheme,
          onError,
          editorState: contentStr,
          editable: false,
          nodes: [
            ImageNode,
            AutoLinkNode,
            LinkNode,
            HeadingNode,
            QuoteNode,
            ListNode,
            ListItemNode,
            CodeNode,
          ],
        }}
      >
        <div className="editor-body-wrapper">
          <RichTextPlugin
            contentEditable={<ContentEditable className="editor-input editor-readonly" />}
            placeholder={null}
            ErrorBoundary={LexicalErrorBoundary}
          />
          <AutoLinkPlugin matchers={MATCHERS} />
        </div>
      </LexicalComposer>
    </div>
  );
}

export default LexicalRenderer;
