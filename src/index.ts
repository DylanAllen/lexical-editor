// Components
export { Editor, default as LexicalEditor } from "./components/Editor";
export type { LexicalEditorProps, EditorThemeMode } from "./components/Editor";

export { LexicalRenderer, default as Renderer } from "./components/LexicalRenderer";
export type { LexicalRendererProps } from "./components/LexicalRenderer";

export { PlainTextRenderer, default as PlainText } from "./components/PlainTextRenderer";
export type { PlainTextRendererProps } from "./components/PlainTextRenderer";

export { ImageNode, $createImageNode, $isImageNode } from "./components/ImageNode";
export type { ImagePayload, SerializedImageNode } from "./components/ImageNode";

export { default as ImagePlugin, INSERT_IMAGE_COMMAND } from "./components/ImagePlugin";

// Transformers & Themes
export { CUSTOM_TRANSFORMERS, IMAGE_TRANSFORMER } from "./components/Editor";
export { LexicalTheme, default as defaultTheme } from "./lib/lexical-theme";

// Utilities
export {
  cn,
  isJsonString,
  getPlainTextFromRichText,
  getPlainTextFromEditorState,
} from "./lib/utils";

// UI Primitives (reusable if needed)
export { Button, buttonVariants } from "./components/ui/button";
export type { ButtonProps } from "./components/ui/button";
export {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
  DialogClose,
  DialogOverlay,
  DialogPortal,
} from "./components/ui/dialog";
export { Input } from "./components/ui/input";
export type { InputProps } from "./components/ui/input";
export { Label } from "./components/ui/label";
