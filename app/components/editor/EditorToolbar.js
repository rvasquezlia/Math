"use client";

/**
 * EditorToolbar
 * ─────────────
 * Formatting toolbar + drag-and-drop block palette for the TipTap BlockEditor.
 */

const BLOCK_PALETTE = [
  { id: "heading1", label: "H1 Header", icon: "H₁", description: "Section heading" },
  { id: "heading2", label: "H2 Header", icon: "H₂", description: "Sub-section heading" },
  { id: "notebook", label: "Notebook", icon: "📓", description: "Write-in-notebook block" },
  { id: "explanation", label: "Explanation", icon: "💡", description: "Concept explanation" },
  { id: "guided", label: "Guided Practice", icon: "🧩", description: "Step-by-step practice" },
  { id: "stepBlock", label: "Steps", icon: "🔢", description: "Numbered step block" },
  { id: "carousel", label: "Carousel", icon: "🎠", description: "Sliding card carousel" },
  { id: "dynamicTabs", label: "Tabs", icon: "📑", description: "Tabbed content panels" },
  { id: "codeCopy", label: "Code + Copy", icon: "📋", description: "Code block with copy button" },
  { id: "blockquote", label: "Callout", icon: "❝", description: "Highlighted callout quote" },
  { id: "horizontalRule", label: "Divider", icon: "─", description: "Horizontal rule divider" },
];

export default function EditorToolbar({ editor }) {
  if (!editor) return null;

  const btn = (label, action, isActive = false, title = label) => (
    <button
      key={label}
      className={`editor-toolbar__btn${isActive ? " editor-toolbar__btn--active" : ""}`}
      onClick={action}
      title={title}
      type="button"
    >
      {label}
    </button>
  );

  function insertBlock(id) {
    switch (id) {
      case "heading1":
        editor.chain().focus().toggleHeading({ level: 1 }).run();
        break;
      case "heading2":
        editor.chain().focus().toggleHeading({ level: 2 }).run();
        break;
      case "blockquote":
        editor.chain().focus().toggleBlockquote().run();
        break;
      case "horizontalRule":
        editor.chain().focus().setHorizontalRule().run();
        break;
      case "notebook":
        editor.chain().focus().insertContent({
          type: "blockquote",
          content: [{ type: "paragraph", content: [{ type: "text", text: "✏️ Notebook: write your answer here…" }] }],
        }).run();
        break;
      case "explanation":
        editor.chain().focus().insertContent({
          type: "blockquote",
          content: [{ type: "paragraph", content: [{ type: "text", text: "💡 Explanation: add your concept here…" }] }],
        }).run();
        break;
      case "guided":
        editor.chain().focus().insertContent({
          type: "blockquote",
          content: [{ type: "paragraph", content: [{ type: "text", text: "🧩 Guided Practice: step-by-step instructions…" }] }],
        }).run();
        break;
      default:
        editor.chain().focus().insertContent({ type: id, attrs: id === "stepBlock" ? { step: 1 } : id === "codeCopy" ? { language: "text" } : {} }).run();
        break;
    }
  }

  function handleDragStart(e, blockId) {
    e.dataTransfer.setData("text/plain", blockId);
    e.dataTransfer.effectAllowed = "copy";
  }

  return (
    <div className="editor-toolbar-wrapper">
      {/* ── Marks & formatting ── */}
      <div className="editor-toolbar" role="toolbar" aria-label="Formatting options">
        {btn("B", () => editor.chain().focus().toggleBold().run(), editor.isActive("bold"), "Bold")}
        {btn("I", () => editor.chain().focus().toggleItalic().run(), editor.isActive("italic"), "Italic")}
        {btn("S̶", () => editor.chain().focus().toggleStrike().run(), editor.isActive("strike"), "Strike")}
        {btn("<>", () => editor.chain().focus().toggleCode().run(), editor.isActive("code"), "Inline code")}

        <span className="editor-toolbar__sep" />

        {[1, 2, 3].map((level) =>
          btn(
            `H${level}`,
            () => editor.chain().focus().toggleHeading({ level }).run(),
            editor.isActive("heading", { level }),
            `Heading ${level}`,
          ),
        )}

        <span className="editor-toolbar__sep" />

        {btn("• List", () => editor.chain().focus().toggleBulletList().run(), editor.isActive("bulletList"))}
        {btn("1. List", () => editor.chain().focus().toggleOrderedList().run(), editor.isActive("orderedList"))}
        {btn("❝", () => editor.chain().focus().toggleBlockquote().run(), editor.isActive("blockquote"), "Blockquote")}
        {btn("HR", () => editor.chain().focus().setHorizontalRule().run(), false, "Horizontal rule")}

        <span className="editor-toolbar__sep" />

        {btn("↩", () => editor.chain().focus().undo().run(), false, "Undo")}
        {btn("↪", () => editor.chain().focus().redo().run(), false, "Redo")}
      </div>

      {/* ── Block palette ── */}
      <div
        className="block-palette"
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault();
          const blockId = e.dataTransfer.getData("text/plain");
          if (blockId) insertBlock(blockId);
        }}
      >
        <span className="block-palette__label">Drag or click to insert:</span>
        <div className="block-palette__grid">
          {BLOCK_PALETTE.map((block) => (
            <button
              key={block.id}
              type="button"
              className="block-palette__item"
              draggable
              onDragStart={(e) => handleDragStart(e, block.id)}
              onClick={() => insertBlock(block.id)}
              title={block.description}
            >
              <span className="block-palette__icon">{block.icon}</span>
              <span className="block-palette__name">{block.label}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
