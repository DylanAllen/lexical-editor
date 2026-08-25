import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import { $createImageNode, ImageNode } from "./ImageNode";
import {
  $createParagraphNode,
  $getRoot,
  $getSelection,
  $isRangeSelection,
  COMMAND_PRIORITY_EDITOR,
  createCommand,
  LexicalCommand,
} from "lexical";
import { useEffect } from "react";

export const INSERT_IMAGE_COMMAND: LexicalCommand<string> = createCommand("INSERT_IMAGE_COMMAND");

export default function ImagePlugin(): null {
  const [editor] = useLexicalComposerContext();

  useEffect(() => {
    if (!editor.hasNodes([ImageNode])) {
      throw new Error("ImagePlugin: ImageNode not registered on editor");
    }

    return editor.registerCommand<string>(
      INSERT_IMAGE_COMMAND,
      (payload) => {
        const selection = $getSelection();
        const imageNode = $createImageNode({
          src: payload,
          altText: "User uploaded image",
        });

        if ($isRangeSelection(selection)) {
          selection.insertNodes([imageNode]);
        } else {
          const root = $getRoot();
          const paragraph = $createParagraphNode();
          paragraph.append(imageNode);
          root.append(paragraph);
        }
        return true;
      },
      COMMAND_PRIORITY_EDITOR
    );
  }, [editor]);

  return null;
}
