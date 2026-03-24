"use client";

import * as React from "react";
import { Mark, mergeAttributes } from "@tiptap/core";
import Highlight from "@tiptap/extension-highlight";
import Link from "@tiptap/extension-link";
import Placeholder from "@tiptap/extension-placeholder";
import Underline from "@tiptap/extension-underline";
import StarterKit from "@tiptap/starter-kit";
import { EditorContent, useEditor } from "@tiptap/react";
import { cn } from "@/lib/utils";
import { Button } from "./button";
import {
  GRAMMAR_PILL_OPTIONS,
  GRAMMAR_PILL_PALETTES,
  getGrammarPillPalette,
  resolveGrammarPillType,
  type GrammarPillType,
} from "./grammar-pill";

const HIGHLIGHT_STYLE_OPTIONS = [
  { id: "highlight-1", label: "Exergue 1", color: "#fef08a" },
  { id: "highlight-2", label: "Exergue 2", color: "#bfdbfe" },
  { id: "highlight-3", label: "Exergue 3", color: "#bbf7d0" },
] as const;

type PedagogicalTag = GrammarPillType;

function toInlineStyle(style: Record<string, string | number>): string {
  return Object.entries(style)
    .map(([key, value]) => {
      const cssKey = key.replace(/[A-Z]/g, (match) => `-${match.toLowerCase()}`);
      return `${cssKey}:${value}`;
    })
    .join(";");
}

function getPedagogicalTagInlineStyles(tag: string): {
  tag: GrammarPillType;
  containerStyle: string;
  badgeStyle: string;
} {
  const resolvedTag = resolveGrammarPillType(tag);
  const palette = getGrammarPillPalette(resolvedTag);

  return {
    tag: resolvedTag,
    containerStyle: toInlineStyle({
      display: "inline-block",
      borderRadius: "9999px",
      borderWidth: "1px",
      borderStyle: "solid",
      padding: "4px 8px",
      backgroundColor: palette.backgroundPill,
      color: palette.textColor,
      borderColor: palette.borderColor,
      lineHeight: 1.35,
      fontWeight: 500,
      verticalAlign: "baseline",
    }),
    badgeStyle: toInlineStyle({
      display: "inline-flex",
      alignItems: "center",
      justifyContent: "center",
      borderRadius: "9999px",
      borderWidth: "1px",
      borderStyle: "solid",
      borderColor: palette.acronymBorder,
      backgroundColor: palette.acronymBg,
      color: palette.acronymText,
      fontSize: "0.75rem",
      fontWeight: 700,
      lineHeight: 1,
      padding: "3px 7px",
      marginRight: "4px",
      whiteSpace: "nowrap",
    }),
  };
}

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    pedagogicalStyle: {
      setPedagogicalStyle: (tag: PedagogicalTag) => ReturnType;
      unsetPedagogicalStyle: () => ReturnType;
    };
  }
}

const PedagogicalStyleMark = Mark.create({
  name: "pedagogicalStyle",

  addAttributes() {
    return {
      tag: {
        default: "subject",
        parseHTML: (element) => {
          const rawTag =
            element.getAttribute("data-grammar-pill") ??
            element.getAttribute("data-pedagogical-tag") ??
            element.getAttribute("tag");
          return resolveGrammarPillType(rawTag);
        },
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: "span[data-grammar-pill]",
      },
      {
        tag: "span[data-pedagogical-tag]",
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    const rawTag = String(HTMLAttributes.tag ?? "subject");
    const { tag, containerStyle, badgeStyle } = getPedagogicalTagInlineStyles(rawTag);
    const badgeLabel = GRAMMAR_PILL_PALETTES[tag].acronym;

    return [
      "span",
      mergeAttributes(HTMLAttributes, {
        "data-pedagogical-tag": tag,
        "data-grammar-pill": tag,
        class: "grammar-pill",
        style: containerStyle,
      }),
      [
        "span",
        {
          class: "grammar-pill-badge",
          contenteditable: "false",
          style: badgeStyle,
        },
        badgeLabel,
      ],
      [
        "span",
        {
          class: "grammar-pill-text",
        },
        0,
      ],
    ];
  },

  addCommands() {
    return {
      setPedagogicalStyle:
        (tag: PedagogicalTag) =>
        ({ commands }) =>
          commands.setMark(this.name, { tag: resolveGrammarPillType(tag) }),
      unsetPedagogicalStyle:
        () =>
        ({ commands }) =>
          commands.unsetMark(this.name),
    };
  },
});

export interface RichTextEditorProps {
  valueHtml: string;
  onChangeHtml: (html: string) => void;
  placeholder?: string;
  disabled?: boolean;
  enableUnderline?: boolean;
  enableCallout?: boolean;
  enableHighlights?: boolean;
  enablePedagogicalStyles?: boolean;
}

function hasPedagogicalMark(
  node: { marks?: ReadonlyArray<{ type?: { name?: string } }> } | null,
): boolean {
  if (!node?.marks) return false;
  return node.marks.some((mark) => mark?.type?.name === "pedagogicalStyle");
}

function normalizeHtml(value: string): string {
  const trimmed = value.trim();
  if (!trimmed || trimmed === "<p></p>") {
    return "";
  }

  return trimmed;
}

interface ToolbarButtonProps {
  label: React.ReactNode;
  ariaLabel?: string;
  active: boolean;
  onClick: () => void;
  disabled?: boolean;
  className?: string;
}

function ToolbarButton({
  label,
  ariaLabel,
  active,
  onClick,
  disabled,
  className,
}: ToolbarButtonProps): React.JSX.Element {
  const accessibleLabel = ariaLabel ?? (typeof label === "string" ? label : undefined);

  return (
    <Button
      type="button"
      size="sm"
      variant={active ? "secondary" : "ghost"}
      aria-label={accessibleLabel}
      title={accessibleLabel}
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "h-8 min-w-8 px-2 text-xs",
        active ? "border-brand-primary text-brand-primary" : "text-text-secondary",
        className,
      )}
    >
      {label}
    </Button>
  );
}

export function RichTextEditor({
  valueHtml,
  onChangeHtml,
  placeholder = "Ajouter des consignes detaillees...",
  disabled = false,
  enableUnderline = false,
  enableCallout = false,
  enableHighlights = false,
  enablePedagogicalStyles = false,
}: RichTextEditorProps): React.JSX.Element {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        blockquote: enableCallout ? {} : false,
        code: false,
        codeBlock: false,
        hardBreak: false,
        heading: false,
        horizontalRule: false,
        strike: false,
      }),
      Underline,
      Highlight.configure({
        multicolor: true,
      }),
      PedagogicalStyleMark,
      Link.configure({
        autolink: false,
        linkOnPaste: true,
        openOnClick: false,
        defaultProtocol: "https",
        HTMLAttributes: {
          target: "_blank",
          rel: "noopener noreferrer",
        },
      }),
      Placeholder.configure({
        placeholder,
      }),
    ],
    content: normalizeHtml(valueHtml),
    editable: !disabled,
    onUpdate({ editor: currentEditor }) {
      onChangeHtml(normalizeHtml(currentEditor.getHTML()));
    },
    editorProps: {
      attributes: {
        class:
          "min-h-40 p-3 text-sm text-text-primary outline-none focus-visible:ring-0 [&_p]:my-2 [&_ul]:my-2 [&_ul]:ml-5 [&_ul]:list-disc [&_ol]:my-2 [&_ol]:ml-5 [&_ol]:list-decimal [&_a]:text-brand-primary [&_a]:underline [&_blockquote]:my-3 [&_blockquote]:rounded-radius-button [&_blockquote]:border-l-4 [&_blockquote]:border-brand-300 [&_blockquote]:bg-brand-50/65 [&_blockquote]:px-3 [&_blockquote]:py-2",
      },
      handleKeyDown(view, event) {
        if (
          !enablePedagogicalStyles ||
          event.key !== " " ||
          event.ctrlKey ||
          event.metaKey ||
          event.altKey
        ) {
          return false;
        }

        const { state } = view;
        const { selection } = state;
        if (!selection.empty) {
          return false;
        }

        const markType = state.schema.marks.pedagogicalStyle;
        if (!markType) {
          return false;
        }

        const { $from } = selection;
        const beforeHasPedagogicalMark = hasPedagogicalMark($from.nodeBefore);
        const afterHasPedagogicalMark = hasPedagogicalMark($from.nodeAfter);

        // If we are at the end of a pedagogical pill, space should exit the pill.
        if (!beforeHasPedagogicalMark || afterHasPedagogicalMark) {
          return false;
        }

        event.preventDefault();
        const tr = state.tr.removeStoredMark(markType).insertText(" ", selection.from, selection.to);
        view.dispatch(tr);
        return true;
      },
    },
  });

  React.useEffect(() => {
    if (!editor) {
      return;
    }

    editor.setEditable(!disabled);
  }, [disabled, editor]);

  React.useEffect(() => {
    if (!editor) {
      return;
    }

    const nextHtml = normalizeHtml(valueHtml);
    const currentHtml = normalizeHtml(editor.getHTML());
    if (currentHtml !== nextHtml) {
      editor.commands.setContent(nextHtml || "", false);
    }
  }, [editor, valueHtml]);

  const setLink = React.useCallback(() => {
    if (!editor || disabled) {
      return;
    }

    const currentHref = String(editor.getAttributes("link").href ?? "");
    const inputValue = window.prompt("URL du lien", currentHref || "https://");
    if (inputValue === null) {
      return;
    }

    const href = inputValue.trim();
    if (!href) {
      editor.chain().focus().extendMarkRange("link").unsetLink().run();
      return;
    }

    editor.chain().focus().extendMarkRange("link").setLink({ href }).run();
  }, [disabled, editor]);

  const togglePedagogicalTag = React.useCallback(
    (tag: PedagogicalTag): void => {
      if (!editor || disabled) return;
      const currentTag = resolveGrammarPillType(
        String(editor.getAttributes("pedagogicalStyle").tag ?? ""),
      );
      if (editor.isActive("pedagogicalStyle") && currentTag === tag) {
        editor.chain().focus().unsetPedagogicalStyle().run();
        return;
      }
      editor.chain().focus().setPedagogicalStyle(tag).run();
    },
    [disabled, editor],
  );

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-1 rounded-radius-card border border-border-default bg-bg-elevated p-1.5">
        <ToolbarButton
          label="B"
          ariaLabel="Gras"
          active={Boolean(editor?.isActive("bold"))}
          onClick={() => editor?.chain().focus().toggleBold().run()}
          disabled={disabled || !editor}
          className="font-black"
        />
        <ToolbarButton
          label="I"
          ariaLabel="Italique"
          active={Boolean(editor?.isActive("italic"))}
          onClick={() => editor?.chain().focus().toggleItalic().run()}
          disabled={disabled || !editor}
          className="italic"
        />
        {enableUnderline ? (
          <ToolbarButton
            label="U"
            ariaLabel="Souligne"
            active={Boolean(editor?.isActive("underline"))}
            onClick={() => editor?.chain().focus().toggleUnderline().run()}
            disabled={disabled || !editor}
            className="underline"
          />
        ) : null}
        <ToolbarButton
          label="•"
          ariaLabel="Liste a puces"
          active={Boolean(editor?.isActive("bulletList"))}
          onClick={() => editor?.chain().focus().toggleBulletList().run()}
          disabled={disabled || !editor}
        />
        <ToolbarButton
          label="1."
          ariaLabel="Liste numerotee"
          active={Boolean(editor?.isActive("orderedList"))}
          onClick={() => editor?.chain().focus().toggleOrderedList().run()}
          disabled={disabled || !editor}
        />
        {enableCallout ? (
          <ToolbarButton
            label={'"'}
            ariaLabel="Citation"
            active={Boolean(editor?.isActive("blockquote"))}
            onClick={() => editor?.chain().focus().toggleBlockquote().run()}
            disabled={disabled || !editor}
          />
        ) : null}
        {enableHighlights
          ? HIGHLIGHT_STYLE_OPTIONS.map((option) => (
              <ToolbarButton
                key={option.id}
                label={
                  <span
                    className="inline-block h-3 w-3 rounded-[3px] border border-black/10"
                    style={{ backgroundColor: option.color }}
                  />
                }
                ariaLabel={option.label}
                active={Boolean(editor?.isActive("highlight", { color: option.color }))}
                onClick={() =>
                  editor?.chain().focus().toggleHighlight({ color: option.color }).run()
                }
                disabled={disabled || !editor}
              />
            ))
          : null}
        <ToolbarButton
          label="URL"
          ariaLabel="Lien"
          active={Boolean(editor?.isActive("link"))}
          onClick={setLink}
          disabled={disabled || !editor}
        />
        {enablePedagogicalStyles ? (
          <>
            <span className="mx-1 h-6 w-px bg-border-subtle" aria-hidden="true" />
            {GRAMMAR_PILL_OPTIONS.map((option) => (
              <ToolbarButton
                key={option.value}
                label={option.shortLabel}
                ariaLabel={option.label}
                active={Boolean(editor?.isActive("pedagogicalStyle", { tag: option.value }))}
                onClick={() => togglePedagogicalTag(option.value)}
                disabled={disabled || !editor}
                className="min-w-10"
              />
            ))}
          </>
        ) : null}
      </div>
      <div
        className={cn(
          "rounded-radius-button border border-border-default bg-bg-surface shadow-card transition-all focus-within:border-transparent focus-within:ring-2 focus-within:ring-brand-primary",
          disabled ? "opacity-70" : "",
        )}
      >
        <EditorContent editor={editor} />
      </div>
    </div>
  );
}
