import * as React from "react";
import { getPlainTextFromRichText } from "../lib/utils";

export interface PlainTextRendererProps extends React.HTMLAttributes<HTMLElement> {
  /**
   * The rich text content (Lexical JSON string, Markdown string, or plain text)
   */
  content: string;
  /**
   * Optional maximum length before truncating
   */
  maxLen?: number;
  /**
   * Truncation suffix (defaults to "...")
   */
  suffix?: string;
  /**
   * HTML tag or component to render as (defaults to "span")
   */
  as?: React.ElementType;
  /**
   * Optional custom className
   */
  className?: string;
}

/**
 * PlainTextRenderer extracts and renders clean plain text from either
 * serialized Lexical JSON, Markdown string, or raw text.
 */
export function PlainTextRenderer({
  content,
  maxLen,
  suffix = "...",
  as: Component = "span",
  className,
  ...rest
}: PlainTextRendererProps) {
  const plainText = React.useMemo(() => {
    return getPlainTextFromRichText(content, maxLen, suffix);
  }, [content, maxLen, suffix]);

  if (!plainText) return null;

  return (
    <Component className={className} {...rest}>
      {plainText}
    </Component>
  );
}

export default PlainTextRenderer;
