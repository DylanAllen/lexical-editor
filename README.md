# react-lexical-markdown-editor

A powerful, lightweight, and modern React rich-text and Markdown dual-mode editor, formatted renderer, and plaintext extractor powered by [Lexical](https://lexical.dev/) and [React Markdown](https://github.com/remarkjs/react-markdown).

Supports **React 18 & 19**, **Next.js (App Router & Pages Router)**, **Vite**, **Remix**, and standard React setups.

---

## Features

- 📝 **Dual-Mode Editing**: Switch seamlessly between visual WYSIWYG rich-text and raw Markdown editing with live preview.
- 🎨 **Universal Renderer**: `<LexicalRenderer />` automatically detects whether the input is serialized Lexical JSON or raw Markdown and renders it beautifully.
- 🌓 **Flexible Theming**:
  - **Auto / System**: Follow user's OS / browser color scheme (`theme="system"` or `theme="auto"` - default).
  - **Light Mode**: Force light theme (`theme="light"`).
  - **Dark Mode**: Force dark theme (`theme="dark"`).
  - **Unstyled / Headless**: Disable opinionated styling for 100% custom styling by the developer (`theme="unstyled"`).
  - **CSS Custom Properties**: Easily customize colors, borders, and radius via CSS variables (`--editor-primary`, `--editor-background`, etc.).
- 🎮 **Imperative Ref Control**: Expose `clear()`, `focus()`, `getMarkdown()`, `getJSON()`, `isEmpty()`, `setMarkdown()`, and `setJSON()` via `useRef<EditorRef>()`.
- ⚡ **Full Lexical Plugin Suite**: Includes Lists (`ListPlugin`), AutoLink & Link (`LinkPlugin`, `AutoLinkPlugin`), Tab Indentation (`TabIndentationPlugin`), History, Markdown Transformers, and Images.
- 📄 **Plain Text Rendering & Extraction**:
  - `<PlainTextRenderer />` component to render stripped plain text with optional truncation.
  - `getPlainTextFromRichText(content, maxLen?)` utility for clean summaries/previews in search results, cards, and metadata.
  - `getPlainTextFromEditorState(editorState, maxLen?)` helper to extract text directly from Lexical state.
- 🖼️ **Image Support**: Insert and render images via URL or markdown syntax (`![alt](url)`).
- 🎛️ **Extensible Toolbar**: Built-in format controls (Bold, Italic, Underline, Strikethrough, Heading, Image, Link, List) plus `renderCustomToolbarActions` slot for custom buttons (document pickers, mentions, AI helpers, etc.).
- 📐 **Collapsible & Expandable**: Compact mode for comment/message inputs and expandable heights for long-form article writing.
- ⌨️ **Keyboard Shortcuts**: Built-in `Cmd+Enter` / `Ctrl+Enter` submit trigger callback.
- 📦 **Dual ESM & CJS**: Full TypeScript definitions (`.d.ts`) and `"use client"` directives for React Server Components / Next.js App Router compatibility.

---

## Installation

```bash
npm install react-lexical-markdown-editor
```

### Peer Dependencies
Make sure you have React installed:
```bash
npm install react react-dom
```

---

## Quick Start

### 1. Import Styles

Import the CSS stylesheet in your root layout (`app/layout.tsx` for Next.js, `main.tsx` for Vite, or global CSS file):

```typescript
import "react-lexical-markdown-editor/styles.css";
```

---

### 2. Editor Component

```tsx
"use client";

import { useRef, useState } from "react";
import { Editor, EditorRef, getPlainTextFromRichText } from "react-lexical-markdown-editor";

export function PostEditor() {
  const editorRef = useRef<EditorRef>(null);
  const [content, setContent] = useState("");
  const [isEmpty, setIsEmpty] = useState(true);

  return (
    <div className="max-w-2xl mx-auto space-y-4">
      <Editor
        ref={editorRef}
        initialState={content}
        placeholder="Write your story or type markdown..."
        minHeight="250px"
        theme="system" // "system" | "auto" | "light" | "dark" | "unstyled"
        onChange={(editorState, empty) => {
          setIsEmpty(empty);
          // Convert Lexical state to JSON string or markdown
          const jsonString = JSON.stringify(editorState.toJSON());
          setContent(jsonString);
        }}
        onInit={(editorState, empty) => {
          setIsEmpty(empty);
        }}
        onSubmitShortcut={() => {
          console.log("Submitted with Cmd/Ctrl+Enter!");
        }}
      />

      <div className="flex gap-2">
        <button
          disabled={isEmpty}
          className="px-4 py-2 bg-blue-600 text-white rounded-md disabled:opacity-50"
          onClick={() => {
            console.log("Saving content:", content);
            console.log("Markdown output:", editorRef.current?.getMarkdown());
            console.log("Plaintext preview:", getPlainTextFromRichText(content, 120));
          }}
        >
          Publish Post
        </button>

        <button
          className="px-4 py-2 border rounded-md"
          onClick={() => editorRef.current?.clear()}
        >
          Clear
        </button>
      </div>
    </div>
  );
}
```

---

### 3. Formatted Renderer Component

`<LexicalRenderer />` handles both serialized Lexical JSON strings and Markdown strings automatically.

```tsx
import { LexicalRenderer } from "react-lexical-markdown-editor";

export function ArticleView({ postContent }: { postContent: string }) {
  return (
    <article className="max-w-3xl mx-auto py-8">
      <LexicalRenderer
        initialState={postContent}
        theme="system"
        className="text-gray-800 dark:text-gray-200"
      />
    </article>
  );
}
```

---

### 4. Theme & Styling Options

The editor and renderer support multiple styling modes out of the box:

#### A. Auto / System (Default)
Automatically responds to `@media (prefers-color-scheme: dark)` or parent `.dark` classes:
```tsx
<Editor theme="system" initialState={content} onChange={handleChange} />
```

#### B. Light Mode (Forced)
```tsx
<Editor theme="light" initialState={content} onChange={handleChange} />
```

#### C. Dark Mode (Forced)
```tsx
<Editor theme="dark" initialState={content} onChange={handleChange} />
```

#### D. Unstyled / Headless (Full Customization by Developer)
Disables default opinionated borders, backgrounds, and shadows:
```tsx
<Editor
  theme="unstyled"
  className="border-2 border-dashed border-purple-500 rounded-xl p-4 bg-purple-50"
  initialState={content}
  onChange={handleChange}
/>
```

#### E. Custom CSS Variables
You can customize the theme colors by overriding CSS custom properties in your stylesheet or on the container:

```css
.my-custom-editor {
  --editor-primary: #10b981; /* Emerald green */
  --editor-primary-hover: #059669;
  --editor-background: #fafafa;
  --editor-border: #e4e4e7;
  --editor-radius: 12px;
}
```

---

### 5. Plain Text Component & Extraction Utilities

Use `<PlainTextRenderer />` or `getPlainTextFromRichText` for card previews, meta descriptions, search snippets, or character-limited teasers:

```tsx
import { PlainTextRenderer, getPlainTextFromRichText } from "react-lexical-markdown-editor";

export function PostCard({ post }: { post: { title: string; content: string } }) {
  // Option A: Using the component
  return (
    <div className="border p-4 rounded-lg">
      <h3 className="font-bold text-lg">{post.title}</h3>
      <PlainTextRenderer
        content={post.content}
        maxLen={150}
        suffix="..."
        as="p"
        className="text-sm text-gray-600 mt-2"
      />
    </div>
  );

  // Option B: Using the utility function
  // const snippet = getPlainTextFromRichText(post.content, 150);
}
```

---

## API Reference

### `<Editor />` Props

| Prop | Type | Default | Description |
| :--- | :--- | :--- | :--- |
| `onChange` | `(editorState: EditorState, isEmpty: boolean, editor: LexicalEditor) => void` | **Required** | Triggered on every content change. |
| `onInit` | `(editorState: EditorState, isEmpty: boolean, editor: LexicalEditor) => void` | `undefined` | Triggered once on initial editor mount. |
| `initialState` | `string` | `undefined` | Initial content as Lexical JSON or Markdown string. |
| `theme` | `'light' \| 'dark' \| 'unstyled' \| 'auto' \| 'system'` | `'auto'` | Color theme mode. |
| `themeConfig` | `Record<string, any>` | `undefined` | Custom Lexical theme configuration classes. |
| `placeholder` | `string` | `"Enter some text..."` | Placeholder text when empty. |
| `minHeight` | `string` | `"min-h-[250px]"` | CSS min-height (e.g. `"250px"` or `"min-h-[250px]"`). |
| `expandedMinHeight` | `string` | `"min-h-[380px]"` | CSS min-height when expanded (e.g. `"380px"`). |
| `compact` | `boolean` | `false` | Compact styling for comment/reply boxes. |
| `allowExpand` | `boolean` | `true` | Show/hide expand and collapse toggle button. |
| `defaultToolbarOpen`| `boolean` | `true` (false in compact) | Toolbar open state by default. |
| `onSubmitShortcut` | `() => void` | `undefined` | Callback for `Cmd+Enter` / `Ctrl+Enter`. |
| `className` | `string` | `undefined` | Custom outer container class name. |
| `renderCustomToolbarActions` | `(context) => ReactNode` | `undefined` | Custom action buttons slot (e.g. document pickers). |

---

### `EditorRef` Methods

Accessible via `ref={editorRef}`:

| Method | Return Type | Description |
| :--- | :--- | :--- |
| `getEditor()` | `LexicalEditor \| null` | Access the underlying Lexical editor instance. |
| `focus()` | `void` | Focus the editor input. |
| `clear()` | `void` | Clear the editor content. |
| `getMarkdown()` | `string` | Get current content converted to Markdown. |
| `getJSON()` | `string` | Get current content as serialized Lexical JSON string. |
| `isEmpty()` | `boolean` | Check if editor is empty. |
| `setMarkdown(md)` | `void` | Programmatically set content from Markdown string. |
| `setJSON(json)` | `void` | Programmatically set content from Lexical JSON string. |

---

### `<LexicalRenderer />` Props

| Prop | Type | Default | Description |
| :--- | :--- | :--- | :--- |
| `initialState` | `string` | **Required** | Serialized Lexical JSON or Markdown string. |
| `theme` | `'light' \| 'dark' \| 'unstyled' \| 'auto' \| 'system'` | `'auto'` | Color theme mode. |
| `themeConfig` | `Record<string, any>` | `undefined` | Custom Lexical theme classes. |
| `className` | `string` | `undefined` | Custom container class name. |

---

### `<PlainTextRenderer />` Props

| Prop | Type | Default | Description |
| :--- | :--- | :--- | :--- |
| `content` | `string` | **Required** | Lexical JSON, Markdown, or plain text string. |
| `maxLen` | `number` | `undefined` | Maximum character length before truncation. |
| `suffix` | `string` | `"..."` | Truncation suffix. |
| `as` | `React.ElementType` | `"span"` | Container element/tag (`"span"`, `"p"`, `"div"`, etc.). |
| `className` | `string` | `undefined` | Custom CSS class name. |

---

### Utilities

```typescript
import {
  isJsonString,
  getPlainTextFromRichText,
  getPlainTextFromEditorState,
} from "react-lexical-markdown-editor";

// Check if string is serialized JSON
isJsonString(content); // boolean

// Extract plain text from Lexical JSON or Markdown
getPlainTextFromRichText(content, 120, "..."); // string

// Extract plain text directly from Lexical EditorState
getPlainTextFromEditorState(editorState, 120, "..."); // string
```

---

## License

MIT
