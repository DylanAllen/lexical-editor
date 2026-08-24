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
import { Button } from "./ui/button";
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
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button
          type="button"
          title="Insert image"
          variant="ghost"
          size="icon"
          className={compact ? "h-6 w-6 p-0" : "h-8 w-8"}
        >
          <ImageIcon className={compact ? "h-3.5 w-3.5" : "h-4 w-4"} />
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Insert Image</DialogTitle>
        </DialogHeader>
        <div className="space-y-2 py-2">
          <Label htmlFor="imageUrl">Image URL</Label>
          <Input
            id="imageUrl"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://example.com/image.png"
          />
        </div>
        <DialogFooter>
          <DialogClose asChild>
            <Button
              type="button"
              onClick={() => {
                onOk(url);
                setUrl("");
              }}
            >
              Insert
            </Button>
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
    `toolbar-item ${active ? "active" : ""} ${compact ? "h-6 w-6 p-0" : "h-8 w-8"}`;
  const iconClass = compact ? "h-3.5 w-3.5" : "h-4 w-4";

  return (
    <div
      className={`editor-toolbar border-b flex flex-wrap gap-0.5 sm:gap-1 items-center animate-in fade-in-50 duration-200 ${
        compact ? "pb-1.5 mb-1.5" : "pb-2 mb-2"
      }`}
    >
      <Button
        onClick={() => editor.dispatchCommand(FORMAT_TEXT_COMMAND, "bold")}
        type="button"
        title="Bold"
        className={btnClass(isBold)}
        variant="ghost"
        size="icon"
      >
        <Bold className={iconClass} />
      </Button>
      <Button
        onClick={() => editor.dispatchCommand(FORMAT_TEXT_COMMAND, "italic")}
        type="button"
        title="Italic"
        variant="ghost"
        className={btnClass(isItalic)}
        size="icon"
      >
        <Italic className={iconClass} />
      </Button>
      <Button
        onClick={() => editor.dispatchCommand(FORMAT_TEXT_COMMAND, "underline")}
        type="button"
        title="Underline"
        className={btnClass(isUnderline)}
        variant="ghost"
        size="icon"
      >
        <Underline className={iconClass} />
      </Button>
      <Button
        onClick={() => editor.dispatchCommand(FORMAT_TEXT_COMMAND, "strikethrough")}
        className={btnClass(isStrikethrough)}
        type="button"
        title="Strikethrough"
        variant="ghost"
        size="icon"
      >
        <Strikethrough className={iconClass} />
      </Button>
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
    <div className="relative">
      <RichTextPlugin
        contentEditable={
          <ContentEditable
            className={`editor-input ${minHeight} ${
              compact ? "p-2 text-sm leading-relaxed" : "p-3"
            } border border-gray-200 dark:border-gray-800 rounded-md focus:outline-hidden bg-transparent transition-[min-height] duration-200`}
          />
        }
        placeholder={
          <div
            className={`editor-placeholder absolute ${
              compact ? "top-2 left-2 text-xs" : "top-3 left-3 text-sm"
            } text-gray-400 dark:text-gray-500 pointer-events-none`}
          >
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
  onSubmitShortcut,
  defaultToolbarOpen,
  allowExpand = true,
  renderCustomToolbarActions,
}: LexicalEditorProps) {
  const [mode, setMode] = useState<"wysiwyg" | "markdown">("wysiwyg");
  const [markdownText, setMarkdownText] = useState<string>("");
  const [markdownPreview, setMarkdownPreview] = useState(false);
  const [editorRef, setEditorRef] = useState<LexicalEditor | null>(null);

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

  return (
    <div
      className={
        className ||
        `editor-container border rounded-lg ${
          compact ? "p-2 space-y-1.5" : "p-4 space-y-3"
        } shadow-xs transition-all duration-200`
      }
    >
      {/* Header with Collapsible Format Toolbar Toggle & Expand/Collapse Mode */}
      <div className={`flex flex-wrap items-center justify-between gap-1.5 border-b border-gray-200 dark:border-gray-800 ${compact ? "pb-1.5" : "pb-3"}`}>
        <div className="flex items-center gap-1">
          {/* Format / Toolbar Toggle */}
          <Button
            type="button"
            variant={showToolbar ? "secondary" : "ghost"}
            size="sm"
            onClick={() => setShowToolbar(!showToolbar)}
            className={`text-xs gap-1 cursor-pointer ${compact ? "h-6 px-2 text-[11px]" : "h-7 px-2.5"}`}
            title={showToolbar ? "Hide formatting toolbar" : "Show formatting toolbar"}
          >
            <Sparkles className="h-3 w-3 text-blue-600 dark:text-blue-400" />
            <span>Format</span>
            {showToolbar ? (
              <ChevronUp className="h-3 w-3 opacity-60" />
            ) : (
              <ChevronDown className="h-3 w-3 opacity-60" />
            )}
          </Button>

          {/* Mode Switcher */}
          {showToolbar && (
            <div className="flex items-center space-x-0.5 bg-gray-100 dark:bg-gray-800 p-0.5 rounded-md text-xs font-medium animate-in fade-in-50 duration-150">
              <button
                type="button"
                onClick={switchToWysiwyg}
                className={`flex items-center gap-1 px-2 py-0.5 rounded-xs transition-all cursor-pointer text-[11px] ${
                  mode === "wysiwyg"
                    ? "bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 shadow-xs font-semibold"
                    : "text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100"
                }`}
              >
                <Type className="h-3 w-3" />
                Visual
              </button>
              <button
                type="button"
                onClick={switchToMarkdown}
                className={`flex items-center gap-1 px-2 py-0.5 rounded-xs transition-all cursor-pointer text-[11px] ${
                  mode === "markdown"
                    ? "bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 shadow-xs font-semibold"
                    : "text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100"
                }`}
              >
                <FileText className="h-3 w-3" />
                Markdown
              </button>
            </div>
          )}
        </div>

        <div className="flex items-center gap-1">
          {mode === "markdown" && showToolbar && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                if (!markdownPreview) {
                  syncMarkdownToEditor(markdownText);
                }
                setMarkdownPreview(!markdownPreview);
              }}
              className="text-xs h-6 px-2 gap-1 cursor-pointer text-[11px]"
            >
              {markdownPreview ? <Edit3 className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
              {markdownPreview ? "Edit" : "Preview"}
            </Button>
          )}

          {allowExpand && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setIsExpanded(!isExpanded)}
              className={`text-xs gap-1 cursor-pointer text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 ${
                compact ? "h-6 px-1.5 text-[11px]" : "h-7 px-2"
              }`}
              title={
                isExpanded
                  ? "Minimize editor"
                  : "Expand editor"
              }
            >
              {isExpanded ? (
                <>
                  <Minimize2 className="h-3 w-3" />
                  <span className="hidden sm:inline">Compact</span>
                </>
              ) : (
                <>
                  <Maximize2 className="h-3 w-3" />
                  <span className="hidden sm:inline">Expand</span>
                </>
              )}
            </Button>
          )}
        </div>
      </div>

      {/* Lexical Visual Editor */}
      <div className={mode === "wysiwyg" ? "block" : "hidden"}>
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

      {/* Markdown Raw Editor / Preview */}
      {mode === "markdown" && (
        <div className="space-y-1.5">
          {!markdownPreview ? (
            <>
              {/* Quick Markdown Toolbar */}
              {showToolbar && (
                <div
                  className={`flex flex-wrap gap-1 items-center bg-gray-50 dark:bg-gray-800/50 ${
                    compact ? "p-0.5 text-[11px]" : "p-1 text-xs"
                  } rounded-md border border-gray-200 dark:border-gray-800 animate-in fade-in-50 duration-150`}
                >
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => insertMarkdownSnippet("## Heading Title")}
                    title="Add Heading"
                    className={compact ? "h-6 px-1.5 text-[11px]" : "h-7 px-2"}
                  >
                    <HeadingIcon className="h-3 w-3 mr-1" /> H2
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => insertMarkdownSnippet("**Bold Text**")}
                    title="Add Bold"
                    className={compact ? "h-6 px-1.5 text-[11px]" : "h-7 px-2"}
                  >
                    <Bold className="h-3 w-3 mr-1" /> Bold
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => insertMarkdownSnippet("*Italic Text*")}
                    title="Add Italic"
                    className={compact ? "h-6 px-1.5 text-[11px]" : "h-7 px-2"}
                  >
                    <Italic className="h-3 w-3 mr-1" /> Italic
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => insertMarkdownSnippet("[Link Text](https://example.com)")}
                    title="Add Link"
                    className={compact ? "h-6 px-1.5 text-[11px]" : "h-7 px-2"}
                  >
                    <LinkIcon className="h-3 w-3 mr-1" /> Link
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => insertMarkdownSnippet("- List Item 1\n- List Item 2")}
                    title="Add Bullet List"
                    className={compact ? "h-6 px-1.5 text-[11px]" : "h-7 px-2"}
                  >
                    <ListIcon className="h-3 w-3 mr-1" /> List
                  </Button>
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
                rows={isExpanded ? 8 : compact ? 2 : 10}
                className={`w-full font-mono text-sm ${effectiveMinHeight} ${
                  compact ? "p-2 text-xs" : "p-3"
                } border border-gray-200 dark:border-gray-800 rounded-md bg-transparent focus:outline-hidden focus:ring-2 focus:ring-blue-500 transition-[min-height] duration-200`}
              />
            </>
          ) : (
            <div
              className={`border border-gray-200 dark:border-gray-800 rounded-md ${compact ? "p-2" : "p-4"} ${effectiveMinHeight} prose dark:prose-invert max-w-none transition-[min-height] duration-200`}
            >
              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {markdownText || "*No content to preview*"}
              </ReactMarkdown>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export function Editor(props: LexicalEditorProps) {
  const { initialState } = props;
  return (
    <LexicalComposer
      initialConfig={{
        namespace: "LexicalEditor",
        onError,
        editable: true,
        nodes: [ImageNode, LinkNode, HeadingNode, QuoteNode, ListNode, ListItemNode, CodeNode],
        theme: LexicalTheme,
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
