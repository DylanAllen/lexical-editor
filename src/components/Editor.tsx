import * as React from "react";
import { useState, useCallback, useEffect } from "react";
import { LexicalComposer } from "@lexical/react/LexicalComposer";
import { RichTextPlugin } from "@lexical/react/LexicalRichTextPlugin";
import { ContentEditable } from "@lexical/react/LexicalContentEditable";
import { HistoryPlugin } from "@lexical/react/LexicalHistoryPlugin";
import { OnChangePlugin } from "@lexical/react/LexicalOnChangePlugin";
import {
  $convertFromMarkdownString,
  $convertToMarkdownString,
  TRANSFORMERS,
  TextMatchTransformer,
} from "@lexical/markdown";
import { mergeRegister } from "@lexical/utils";
import {
  $getRoot,
  $getSelection,
  $isRangeSelection,
  $createParagraphNode,
  $createTextNode,
  COMMAND_PRIORITY_LOW,
  EditorState,
  FORMAT_TEXT_COMMAND,
  KEY_DOWN_COMMAND,
  LexicalEditor,
  SELECTION_CHANGE_COMMAND,
} from "lexical";
import { LexicalErrorBoundary } from "@lexical/react/LexicalErrorBoundary";
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import { LinkNode, $createLinkNode } from "@lexical/link";
import { HeadingNode, QuoteNode } from "@lexical/rich-text";
import { ListNode, ListItemNode } from "@lexical/list";
import { CodeNode } from "@lexical/code";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

import {
  Bold,
  Italic,
  Underline,
  Strikethrough,
  Image as ImageIcon,
  Heading as HeadingIcon,
  List as ListIcon,
  Link as LinkIcon,
  Eye,
  Edit3,
  FileText,
  Type,
  Sparkles,
  ChevronDown,
  ChevronUp,
  Maximize2,
  Minimize2,
} from "lucide-react";

import { ImageNode, $createImageNode, $isImageNode } from "./ImageNode";
import ImagePlugin, { INSERT_IMAGE_COMMAND } from "./ImagePlugin";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "./ui/dialog";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import LexicalTheme from "../lib/lexical-theme";
import { isJsonString } from "../lib/utils";

export type EditorThemeMode = "light" | "dark" | "unstyled" | "auto";

export const IMAGE_TRANSFORMER: TextMatchTransformer = {
  dependencies: [ImageNode],
  export: (node) => {
    if (!$isImageNode(node)) {
      return null;
    }
    return `![${node.getAltText()}](${node.getSrc()})`;
  },
  importRegExp: /!\[([^\]]*)\]\(([^)]+)\)/,
  regExp: /!\[([^\]]*)\]\(([^)]+)\)/,
  replace: (textNode, match) => {
    const [, altText, src] = match;
    const imageNode = $createImageNode({
      altText,
      src,
    });
    textNode.replace(imageNode);
  },
  trigger: ")",
  type: "text-match",
};

export const CUSTOM_TRANSFORMERS = [IMAGE_TRANSFORMER, ...TRANSFORMERS];

function onError(error: Error) {
  console.error("LexicalEditor error:", error);
}

function ImageDialog({
  onOk,
  compact = false,
}: {
  onOk: (url: string) => void;
  compact?: boolean;
}) {
  const [url, setUrl] = useState("");
  const iconSize = compact ? 14 : 16;
  return (
    <Dialog>
      <DialogTrigger asChild>
        <button
          type="button"
          title="Insert image"
          className={`toolbar-item ${compact ? "compact" : ""}`}
        >
          <ImageIcon size={iconSize} />
        </button>
      </DialogTrigger>
      <DialogContent className="editor-dialog-content">
        <DialogHeader>
          <DialogTitle className="dialog-title">Insert Image</DialogTitle>
        </DialogHeader>
        <div style={{ margin: "0.75rem 0" }}>
          <Label htmlFor="imageUrl">Image URL</Label>
          <Input
            id="imageUrl"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://example.com/image.png"
          />
        </div>
        <DialogFooter className="editor-dialog-footer">
          <DialogClose asChild>
            <button
              type="button"
              className="editor-dialog-btn-primary"
              onClick={() => {
                if (url.trim()) {
                  onOk(url.trim());
                  setUrl("");
                }
              }}
            >
              Insert Image
            </button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function LinkDialog({
  onOk,
  compact = false,
}: {
  onOk: (url: string, title?: string) => void;
  compact?: boolean;
}) {
  const [url, setUrl] = useState("");
  const [title, setTitle] = useState("");
  const iconSize = compact ? 14 : 16;
  return (
    <Dialog>
      <DialogTrigger asChild>
        <button
          type="button"
          title="Insert link"
          className={`toolbar-item ${compact ? "compact" : ""}`}
        >
          <LinkIcon size={iconSize} />
        </button>
      </DialogTrigger>
      <DialogContent className="editor-dialog-content">
        <DialogHeader>
          <DialogTitle className="dialog-title">Insert Link</DialogTitle>
        </DialogHeader>
        <div style={{ margin: "0.75rem 0" }}>
          <div style={{ marginBottom: "0.75rem" }}>
            <Label htmlFor="linkText">Link Text (Optional)</Label>
            <Input
              id="linkText"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Visit Website"
            />
          </div>
          <div>
            <Label htmlFor="linkUrl">URL</Label>
            <Input
              id="linkUrl"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://example.com"
            />
          </div>
        </div>
        <DialogFooter className="editor-dialog-footer">
          <DialogClose asChild>
            <button
              type="button"
              className="editor-dialog-btn-primary"
              onClick={() => {
                if (url.trim()) {
                  onOk(url.trim(), title.trim());
                  setUrl("");
                  setTitle("");
                }
              }}
            >
              Insert Link
            </button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Toolbar({
  compact = false,
  renderCustomActions,
  onInsertMarkdown,
  onInsertLink,
}: {
  compact?: boolean;
  renderCustomActions?: (context: {
    editor: LexicalEditor;
    insertMarkdown: (snippet: string) => void;
    insertLink: (title: string, url: string) => void;
    compact: boolean;
    mode: "wysiwyg" | "markdown";
  }) => React.ReactNode;
  onInsertMarkdown: (snippet: string) => void;
  onInsertLink: (title: string, url: string) => void;
}) {
  const [editor] = useLexicalComposerContext();
  const onImageInsert = (url: string) => {
    if (url) {
      editor.dispatchCommand(INSERT_IMAGE_COMMAND, url);
    }
  };

  const [isBold, setIsBold] = useState(false);
  const [isItalic, setIsItalic] = useState(false);
  const [isUnderline, setIsUnderline] = useState(false);
  const [isStrikethrough, setIsStrikethrough] = useState(false);

  const $updateToolbar = useCallback(() => {
    const selection = $getSelection();
    if ($isRangeSelection(selection)) {
      setIsBold(selection.hasFormat("bold"));
      setIsItalic(selection.hasFormat("italic"));
      setIsUnderline(selection.hasFormat("underline"));
      setIsStrikethrough(selection.hasFormat("strikethrough"));
    }
  }, []);

  useEffect(() => {
    return mergeRegister(
      editor.registerUpdateListener(({ editorState }) => {
        editorState.read(() => {
          $updateToolbar();
        });
      }),
      editor.registerCommand(
        SELECTION_CHANGE_COMMAND,
        () => {
          $updateToolbar();
          return false;
        },
        COMMAND_PRIORITY_LOW
      )
    );
  }, [editor, $updateToolbar]);

  const btnClass = (active: boolean) =>
    `toolbar-item ${active ? "active" : ""} ${compact ? "compact" : ""}`;
  const iconSize = compact ? 14 : 16;

  return (
    <div className="editor-toolbar">
      <button
        onClick={() => editor.dispatchCommand(FORMAT_TEXT_COMMAND, "bold")}
        type="button"
        title="Bold"
        className={btnClass(isBold)}
      >
        <Bold size={iconSize} />
      </button>
      <button
        onClick={() => editor.dispatchCommand(FORMAT_TEXT_COMMAND, "italic")}
        type="button"
        title="Italic"
        className={btnClass(isItalic)}
      >
        <Italic size={iconSize} />
      </button>
      <button
        onClick={() => editor.dispatchCommand(FORMAT_TEXT_COMMAND, "underline")}
        type="button"
        title="Underline"
        className={btnClass(isUnderline)}
      >
        <Underline size={iconSize} />
      </button>
      <button
        onClick={() => editor.dispatchCommand(FORMAT_TEXT_COMMAND, "strikethrough")}
        className={btnClass(isStrikethrough)}
        type="button"
        title="Strikethrough"
      >
        <Strikethrough size={iconSize} />
      </button>

      <span className="editor-divider" />

      <LinkDialog
        onOk={(url, linkTitle) => onInsertLink(linkTitle || url, url)}
        compact={compact}
      />
      <ImageDialog onOk={onImageInsert} compact={compact} />

      {renderCustomActions &&
        renderCustomActions({
          editor,
          insertMarkdown: onInsertMarkdown,
          insertLink: onInsertLink,
          compact,
          mode: "wysiwyg",
        })}
    </div>
  );
}

function LexicalEditorInner({
  onChange,
  initialState,
  minHeight = "min-h-[250px]",
  placeholder = "Enter some text...",
  onSubmitShortcut,
  onEditorReady,
  compact = false,
}: LexicalEditorProps & { onEditorReady?: (editor: LexicalEditor) => void }) {
  const [editor] = useLexicalComposerContext();
  const [isInitialLoad, setIsInitialLoad] = useState(true);

  useEffect(() => {
    if (onEditorReady) {
      onEditorReady(editor);
    }
  }, [editor, onEditorReady]);

  useEffect(() => {
    if (initialState && isInitialLoad) {
      queueMicrotask(() => {
        try {
          if (isJsonString(initialState)) {
            const initialEditorState = editor.parseEditorState(initialState);
            editor.setEditorState(initialEditorState);
          } else {
            editor.update(() => {
              $convertFromMarkdownString(initialState, CUSTOM_TRANSFORMERS);
            });
          }
        } catch (e) {
          console.error("Error setting initial editor state:", e);
        }
      });
      setIsInitialLoad(false);
    }
  }, [editor, initialState, isInitialLoad]);

  useEffect(() => {
    if (!onSubmitShortcut) return;
    return editor.registerCommand(
      KEY_DOWN_COMMAND,
      (event: KeyboardEvent) => {
        if ((event.metaKey || event.ctrlKey) && event.key === "Enter") {
          event.preventDefault();
          onSubmitShortcut();
          return true;
        }
        return false;
      },
      COMMAND_PRIORITY_LOW
    );
  }, [editor, onSubmitShortcut]);

  function handleOnChange(editorState: EditorState, editorInstance: LexicalEditor) {
    editorState.read(() => {
      const root = $getRoot();
      // @ts-expect-error - Lexical node isEmpty helper
      const isEmpty = root.getFirstChild()?.isEmpty?.() && root.getChildrenSize() === 1;
      onChange(editorState, Boolean(isEmpty), editorInstance);
    });
  }

  return (
    <div className="editor-body-wrapper">
      <RichTextPlugin
        contentEditable={
          <ContentEditable
            className={`editor-input ${compact ? "compact" : ""} ${minHeight}`}
          />
        }
        placeholder={
          <div className={`editor-placeholder ${compact ? "compact" : ""}`}>
            {placeholder}
          </div>
        }
        ErrorBoundary={LexicalErrorBoundary}
      />
      <HistoryPlugin />
      <OnChangePlugin onChange={handleOnChange} />
      <ImagePlugin />
    </div>
  );
}

export interface LexicalEditorProps {
  /**
   * Callback fired when editor state changes.
   */
  onChange: (editorState: EditorState, isEmpty: boolean, editor: LexicalEditor) => void;
  /**
   * Optional callback when editor is initialized.
   */
  onInit?: (editorState: EditorState, isEmpty: boolean, editor: LexicalEditor) => void;
  /**
   * Initial content (either serialized Lexical JSON string or Markdown string).
   */
  initialState?: string;
  /**
   * CSS class or min-height for the editor body when collapsed / default (e.g. "min-h-[250px]").
   */
  minHeight?: string;
  /**
   * CSS class or min-height for the editor body when expanded (e.g. "min-h-[380px]").
   */
  expandedMinHeight?: string;
  /**
   * Placeholder string shown when editor is empty.
   */
  placeholder?: string;
  /**
   * Whether to use compact styling (smaller buttons, padding, fonts).
   */
  compact?: boolean;
  /**
   * Optional custom container CSS class.
   */
  className?: string;
  /**
   * Theme mode: 'light' | 'dark' | 'unstyled' | 'auto' (browser preference)
   * Defaults to 'auto'
   */
  theme?: EditorThemeMode;
  /**
   * Optional custom Lexical theme configuration to override default classes.
   */
  themeConfig?: Record<string, any>;
  /**
   * Callback when Cmd+Enter or Ctrl+Enter shortcut is pressed.
   */
  onSubmitShortcut?: () => void;
  /**
   * Whether the formatting toolbar is open by default.
   */
  defaultToolbarOpen?: boolean;
  /**
   * Whether to allow the user to toggle between expand and compact height.
   */
  allowExpand?: boolean;
  /**
   * Optional render slot for custom toolbar buttons (e.g. document pickers, custom links, mentions).
   */
  renderCustomToolbarActions?: (context: {
    editor: LexicalEditor | null;
    insertMarkdown: (snippet: string) => void;
    insertLink: (title: string, url: string) => void;
    compact: boolean;
    mode: "wysiwyg" | "markdown";
  }) => React.ReactNode;
}

function EditorWrapper({
  onChange,
  initialState,
  minHeight,
  expandedMinHeight,
  placeholder,
  compact = false,
  className,
  theme = "auto",
  onSubmitShortcut,
  defaultToolbarOpen,
  allowExpand = true,
  renderCustomToolbarActions,
}: LexicalEditorProps) {
  const [mode, setMode] = useState<"wysiwyg" | "markdown">("wysiwyg");
  const [markdownText, setMarkdownText] = useState<string>("");
  const [markdownPreview, setMarkdownPreview] = useState(false);
  const [editorRef, setEditorRef] = useState<LexicalEditor | null>(null);

  // Determine active theme mode ('light', 'dark', 'unstyled', 'auto')
  const activeTheme: EditorThemeMode = theme || "auto";

  const themeClassName =
    activeTheme === "light"
      ? "editor-theme-light"
      : activeTheme === "dark"
      ? "editor-theme-dark"
      : activeTheme === "unstyled"
      ? "editor-unstyled"
      : "editor-theme-auto";

  // Collapsible toolbar state (defaults to collapsed in compact mode, expanded otherwise)
  const [showToolbar, setShowToolbar] = useState<boolean>(
    defaultToolbarOpen !== undefined ? defaultToolbarOpen : !compact
  );

  // Expandable height state
  const [isExpanded, setIsExpanded] = useState<boolean>(false);

  const effectiveMinHeight = isExpanded
    ? expandedMinHeight || (compact ? "min-h-[170px]" : "min-h-[380px]")
    : minHeight || (compact ? "min-h-[44px]" : "min-h-[250px]");

  useEffect(() => {
    if (initialState && !isJsonString(initialState)) {
      setMarkdownText(initialState);
      setMode("markdown");
    }
  }, [initialState]);

  // Sync markdownText clearing when root is cleared externally
  useEffect(() => {
    if (!editorRef) return;
    return editorRef.registerUpdateListener(({ editorState }) => {
      editorState.read(() => {
        const root = $getRoot();
        if (root.getTextContent().length === 0 && root.getChildrenSize() <= 1) {
          const firstChild = root.getFirstChild();
          // @ts-expect-error - Lexical node isEmpty helper
          if (!firstChild || firstChild.isEmpty?.()) {
            setMarkdownText("");
          }
        }
      });
    });
  }, [editorRef]);

  const switchToMarkdown = () => {
    if (editorRef) {
      editorRef.getEditorState().read(() => {
        const md = $convertToMarkdownString(CUSTOM_TRANSFORMERS);
        setMarkdownText(md);
      });
    }
    setMode("markdown");
  };

  const switchToWysiwyg = () => {
    if (editorRef) {
      editorRef.update(() => {
        $getRoot().clear();
        if (markdownText) {
          $convertFromMarkdownString(markdownText, CUSTOM_TRANSFORMERS);
        }
      });
    }
    setMode("wysiwyg");
  };

  const syncMarkdownToEditor = (textToSync?: string) => {
    const text = typeof textToSync === "string" ? textToSync : markdownText;
    if (editorRef) {
      editorRef.update(() => {
        $getRoot().clear();
        if (text) {
          $convertFromMarkdownString(text, CUSTOM_TRANSFORMERS);
        }
      });
    }
  };

  const handleMarkdownChange = (newMarkdown: string) => {
    setMarkdownText(newMarkdown);
    if (editorRef) {
      onChange(editorRef.getEditorState(), newMarkdown.trim().length === 0, editorRef);
    }
  };

  const handleMarkdownBlur = () => {
    syncMarkdownToEditor(markdownText);
  };

  const handleShortcut = () => {
    if (mode === "markdown") {
      syncMarkdownToEditor(markdownText);
    }
    onSubmitShortcut?.();
  };

  const insertMarkdownSnippet = (snippet: string) => {
    const updated = markdownText + (markdownText ? "\n" : "") + snippet;
    setMarkdownText(updated);
    handleMarkdownChange(updated);
    syncMarkdownToEditor(updated);
  };

  const insertLink = (title: string, url: string) => {
    if (mode === "wysiwyg" && editorRef) {
      editorRef.update(() => {
        const selection = $getSelection();
        const linkNode = $createLinkNode(url, { target: "_blank", rel: "noopener noreferrer" });
        const textNode = $createTextNode(title || url);
        linkNode.append(textNode);
        if ($isRangeSelection(selection)) {
          selection.insertNodes([linkNode, $createTextNode(" ")]);
        } else {
          const root = $getRoot();
          const paragraph = $createParagraphNode();
          paragraph.append(linkNode);
          root.append(paragraph);
        }
      });
    } else {
      insertMarkdownSnippet(`[${title || url}](${url})`);
    }
  };

  const containerClasses = [
    "editor-container",
    compact ? "compact" : "",
    themeClassName,
    className || "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div className={containerClasses} data-editor-theme={activeTheme}>
      {/* Header Bar */}
      <div className="editor-header-bar">
        <div className="editor-header-left">
          {/* Format / Toolbar Toggle */}
          <button
            type="button"
            className="format-btn"
            onClick={() => setShowToolbar(!showToolbar)}
            title={showToolbar ? "Hide formatting toolbar" : "Show formatting toolbar"}
          >
            <Sparkles size={13} style={{ color: "var(--editor-primary)" }} />
            <span>Format</span>
            {showToolbar ? (
              <ChevronUp size={12} style={{ opacity: 0.6 }} />
            ) : (
              <ChevronDown size={12} style={{ opacity: 0.6 }} />
            )}
          </button>

          {/* Mode Switcher */}
          {showToolbar && (
            <div className="editor-mode-pill">
              <button
                type="button"
                onClick={switchToWysiwyg}
                className={mode === "wysiwyg" ? "active" : ""}
              >
                <Type size={12} />
                Visual
              </button>
              <button
                type="button"
                onClick={switchToMarkdown}
                className={mode === "markdown" ? "active" : ""}
              >
                <FileText size={12} />
                Markdown
              </button>
            </div>
          )}
        </div>

        <div className="editor-header-right">
          {mode === "markdown" && showToolbar && (
            <button
              type="button"
              className="format-btn"
              onClick={() => {
                if (!markdownPreview) {
                  syncMarkdownToEditor(markdownText);
                }
                setMarkdownPreview(!markdownPreview);
              }}
            >
              {markdownPreview ? <Edit3 size={13} /> : <Eye size={13} />}
              <span>{markdownPreview ? "Edit" : "Preview"}</span>
            </button>
          )}

          {allowExpand && (
            <button
              type="button"
              className="expand-btn"
              onClick={() => setIsExpanded(!isExpanded)}
              title={isExpanded ? "Minimize editor" : "Expand editor"}
            >
              {isExpanded ? (
                <>
                  <Minimize2 size={13} />
                  <span>Compact</span>
                </>
              ) : (
                <>
                  <Maximize2 size={13} />
                  <span>Expand</span>
                </>
              )}
            </button>
          )}
        </div>
      </div>

      {/* Lexical Visual Editor (Completely hidden when in markdown mode) */}
      <div style={{ display: mode === "wysiwyg" ? "block" : "none" }}>
        {showToolbar && (
          <Toolbar
            compact={compact}
            renderCustomActions={renderCustomToolbarActions}
            onInsertMarkdown={insertMarkdownSnippet}
            onInsertLink={insertLink}
          />
        )}
        <LexicalEditorInner
          onEditorReady={(editor) => {
            setEditorRef(editor);
          }}
          onChange={(editorState, isEmpty, editor) => {
            setEditorRef(editor);
            onChange(editorState, isEmpty, editor);
          }}
          initialState={initialState}
          minHeight={effectiveMinHeight}
          placeholder={placeholder}
          onSubmitShortcut={handleShortcut}
          compact={compact}
        />
      </div>

      {/* Markdown Raw Editor / Preview (Completely hidden when in wysiwyg mode) */}
      <div style={{ display: mode === "markdown" ? "block" : "none" }}>
        <div className="editor-markdown-section">
          {!markdownPreview ? (
            <>
              {/* Quick Markdown Toolbar */}
              {showToolbar && (
                <div className="editor-markdown-toolbar">
                  <button
                    type="button"
                    onClick={() => insertMarkdownSnippet("## Heading Title")}
                    title="Add Heading"
                  >
                    <HeadingIcon size={13} /> H2
                  </button>
                  <button
                    type="button"
                    onClick={() => insertMarkdownSnippet("**Bold Text**")}
                    title="Add Bold"
                  >
                    <Bold size={13} /> Bold
                  </button>
                  <button
                    type="button"
                    onClick={() => insertMarkdownSnippet("*Italic Text*")}
                    title="Add Italic"
                  >
                    <Italic size={13} /> Italic
                  </button>
                  <button
                    type="button"
                    onClick={() => insertMarkdownSnippet("[Link Text](https://example.com)")}
                    title="Add Link"
                  >
                    <LinkIcon size={13} /> Link
                  </button>
                  <button
                    type="button"
                    onClick={() => insertMarkdownSnippet("- List Item 1\n- List Item 2")}
                    title="Add Bullet List"
                  >
                    <ListIcon size={13} /> List
                  </button>
                  <ImageDialog
                    onOk={(url) => insertMarkdownSnippet(`![Image Description](${url})`)}
                    compact={compact}
                  />

                  {renderCustomToolbarActions &&
                    renderCustomToolbarActions({
                      editor: editorRef,
                      insertMarkdown: insertMarkdownSnippet,
                      insertLink,
                      compact,
                      mode: "markdown",
                    })}
                </div>
              )}

              <textarea
                value={markdownText}
                onChange={(e) => handleMarkdownChange(e.target.value)}
                onBlur={handleMarkdownBlur}
                onKeyDown={(e) => {
                  if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
                    e.preventDefault();
                    handleShortcut();
                  }
                }}
                placeholder={placeholder || "Type or paste your Markdown content here..."}
                rows={isExpanded ? 12 : compact ? 4 : 8}
                className={`editor-markdown-textarea ${effectiveMinHeight}`}
              />
            </>
          ) : (
            <div className={`editor-markdown-preview ${effectiveMinHeight}`}>
              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {markdownText || "*No content to preview*"}
              </ReactMarkdown>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export function Editor(props: LexicalEditorProps) {
  const { initialState, themeConfig } = props;
  const mergedTheme = themeConfig ? { ...LexicalTheme, ...themeConfig } : LexicalTheme;

  return (
    <LexicalComposer
      initialConfig={{
        namespace: "LexicalEditor",
        onError,
        editable: true,
        nodes: [ImageNode, LinkNode, HeadingNode, QuoteNode, ListNode, ListItemNode, CodeNode],
        theme: mergedTheme,
        editorState:
          initialState && !isJsonString(initialState)
            ? () => {
                $convertFromMarkdownString(initialState, CUSTOM_TRANSFORMERS);
              }
            : initialState || undefined,
      }}
    >
      <EditorWrapper {...props} />
    </LexicalComposer>
  );
}

export default Editor;
