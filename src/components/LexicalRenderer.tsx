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

function onError(error: Error) {
  console.error("LexicalRenderer error:", error);
}

export interface LexicalRendererProps {
  /**
   * The serialized Lexical JSON string or Markdown string to render.
   */
  initialState: string;
  /**
   * Optional custom CSS class name for the wrapper element.
   */
  className?: string;
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

export function LexicalRenderer({ initialState, className }: LexicalRendererProps) {
  if (!initialState) return null;

  // Render Markdown if string is not Lexical JSON
  if (!isJsonString(initialState)) {
    return (
      <div className={`prose dark:prose-invert max-w-none space-y-4 ${className || ""}`}>
        <ReactMarkdown
          remarkPlugins={[remarkGfm]}
          components={{
            img: ({ src, alt }) => (
              <img
                src={src || ""}
                alt={alt || ""}
                className="rounded-lg border border-gray-200 dark:border-gray-800 shadow-xs my-4 max-w-full h-auto"
                loading="lazy"
              />
            ),
            a: ({ href, children }) => (
              <a
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                className="editor-link underline font-medium hover:opacity-85 transition-opacity"
              >
                {children}
              </a>
            ),
          }}
        >
          {initialState}
        </ReactMarkdown>
      </div>
    );
  }

  return (
    <LexicalComposer
      key={initialState}
      initialConfig={{
        namespace: "LexicalRenderer",
        theme: LexicalTheme,
        onError,
        editorState: initialState,
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
      <div className="relative">
        <RichTextPlugin
          contentEditable={<ContentEditable className={`${className || ""}`} />}
          placeholder={null}
          ErrorBoundary={LexicalErrorBoundary}
        />
        <AutoLinkPlugin matchers={MATCHERS} />
      </div>
    </LexicalComposer>
  );
}

export default LexicalRenderer;
