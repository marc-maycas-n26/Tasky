import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import { CustomLink } from './CustomLink';
import Image from '@tiptap/extension-image';
import Placeholder from '@tiptap/extension-placeholder';
import TaskList from '@tiptap/extension-task-list';
import TaskItem from '@tiptap/extension-task-item';
import { useEffect, useCallback, useState, useRef } from 'react';
import EmojiPicker, { Theme, type EmojiClickData } from 'emoji-picker-react';
import { Emoji } from '@tiptap/extension-emoji';
import { emojiSuggestion } from './EmojiSuggestion';
import './RichTextEditor.css';

interface Props {
  value: string;           // HTML string
  onChange: (html: string) => void;
  placeholder?: string;
  readOnly?: boolean;
}

export function RichTextEditor({ value, onChange, placeholder = 'Add a description…', readOnly = false }: Props) {
  const isDark = document.documentElement.getAttribute('data-theme') === 'dark';

  const [confirmLink, setConfirmLink] = useState<string | null>(null);

  const editor = useEditor({
    extensions: [
      StarterKit,
      Underline,
      CustomLink.configure({
        openOnClick: false,
        HTMLAttributes: { rel: 'noopener noreferrer' },
        onLinkClick: (href: string) => setConfirmLink(href),
      }),
      Image.configure({ inline: false, allowBase64: true }),
      Placeholder.configure({ placeholder }),
      TaskList,
      TaskItem.configure({ nested: true }),
      Emoji.configure({ enableEmoticons: true, suggestion: emojiSuggestion }),
    ],
    content: value,
    editable: !readOnly,
    onUpdate({ editor }) {
      const html = editor.getHTML();
      onChange(html === '<p></p>' ? '' : html);
    },
  });

  // Sync external value changes (e.g. ticket switch)
  useEffect(() => {
    if (!editor) return;
    if (editor.getHTML() !== value) {
      editor.commands.setContent(value || '');
    }
  }, [value, editor]);

  // ── Emoji picker ─────────────────────────────────────────────────────────
  const [pickerOpen, setPickerOpen] = useState(false);
  const pickerRef = useRef<HTMLDivElement>(null);

  const handleEmojiClick = useCallback((data: EmojiClickData) => {
    if (!editor) return;
    editor.chain().focus().insertContent(data.emoji).run();
    setPickerOpen(false);
  }, [editor]);

  useEffect(() => {
    if (!pickerOpen) return;
    function handleClick(e: MouseEvent) {
      if (pickerRef.current && !pickerRef.current.contains(e.target as Node)) {
        setPickerOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [pickerOpen]);

  // ── Link dialog ──────────────────────────────────────────────────────────
  const [linkDialogOpen, setLinkDialogOpen] = useState(false);
  const [linkUrl, setLinkUrl] = useState('');

  const openLinkDialog = useCallback(() => {
    if (!editor) return;
    const existing = editor.getAttributes('link').href as string | undefined;
    setLinkUrl(existing ?? 'https://');
    setLinkDialogOpen(true);
  }, [editor]);

  const applyLink = useCallback(() => {
    if (!editor) return;
    const url = linkUrl.trim();
    if (!url || url === 'https://') {
      editor.chain().focus().unsetLink().run();
    } else {
      editor.chain().focus().setLink({ href: url }).run();
    }
    setLinkDialogOpen(false);
  }, [editor, linkUrl]);

  // ── Image URL dialog ─────────────────────────────────────────────────────
  const [imageDialogOpen, setImageDialogOpen] = useState(false);
  const [imageUrl, setImageUrl] = useState('');

  const openImageDialog = useCallback(() => {
    setImageUrl('https://');
    setImageDialogOpen(true);
  }, []);

  const applyImage = useCallback(() => {
    if (!editor) return;
    const url = imageUrl.trim();
    if (url && url !== 'https://') {
      editor.chain().focus().setImage({ src: url }).run();
    }
    setImageDialogOpen(false);
  }, [editor, imageUrl]);

  // ── Paste image from clipboard ───────────────────────────────────────────
  useEffect(() => {
    if (!editor) return;
    function handlePaste(e: ClipboardEvent) {
      const items = Array.from(e.clipboardData?.items ?? []);
      const imageItem = items.find(item => item.type.startsWith('image/'));
      if (!imageItem) return;
      const file = imageItem.getAsFile();
      if (!file) return;
      e.preventDefault();
      const reader = new FileReader();
      reader.onload = () => {
        editor.chain().focus().setImage({ src: reader.result as string }).run();
      };
      reader.readAsDataURL(file);
    }
    const el = editor.view.dom;
    el.addEventListener('paste', handlePaste);
    return () => el.removeEventListener('paste', handlePaste);
  }, [editor]);

  // ── File upload (base64) ─────────────────────────────────────────────────
  const handleFileUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (!editor) return;
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const src = reader.result as string;
      editor.chain().focus().setImage({ src }).run();
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  }, [editor]);

  if (!editor) return null;

  const isActive = (name: string, attrs?: Record<string, unknown>) =>
    editor.isActive(name, attrs);

  return (
    <div className={`rte-root${readOnly ? ' rte-root--readonly' : ''}`}>
      {!readOnly && (
        <div className="rte-toolbar">
          <ToolbarGroup>
            <ToolBtn active={isActive('bold')} title="Bold (⌘B)" onClick={() => editor.chain().focus().toggleBold().run()}>
              <strong>B</strong>
            </ToolBtn>
            <ToolBtn active={isActive('italic')} title="Italic (⌘I)" onClick={() => editor.chain().focus().toggleItalic().run()}>
              <em>I</em>
            </ToolBtn>
            <ToolBtn active={isActive('underline')} title="Underline (⌘U)" onClick={() => editor.chain().focus().toggleUnderline().run()}>
              <u>U</u>
            </ToolBtn>
            <ToolBtn active={isActive('strike')} title="Strikethrough" onClick={() => editor.chain().focus().toggleStrike().run()}>
              <s>S</s>
            </ToolBtn>
          </ToolbarGroup>

          <div className="rte-toolbar-sep" />

          <ToolbarGroup>
            <ToolBtn active={isActive('heading', { level: 1 })} title="Heading 1" onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}>
              H1
            </ToolBtn>
            <ToolBtn active={isActive('heading', { level: 2 })} title="Heading 2" onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}>
              H2
            </ToolBtn>
            <ToolBtn active={isActive('heading', { level: 3 })} title="Heading 3" onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}>
              H3
            </ToolBtn>
          </ToolbarGroup>

          <div className="rte-toolbar-sep" />

          <ToolbarGroup>
            <ToolBtn active={isActive('bulletList')} title="Bullet list" onClick={() => editor.chain().focus().toggleBulletList().run()}>
              ≡
            </ToolBtn>
            <ToolBtn active={isActive('orderedList')} title="Numbered list" onClick={() => editor.chain().focus().toggleOrderedList().run()}>
              1.
            </ToolBtn>
            <ToolBtn active={isActive('blockquote')} title="Blockquote" onClick={() => editor.chain().focus().toggleBlockquote().run()}>
              "
            </ToolBtn>
            <ToolBtn active={isActive('code')} title="Inline code" onClick={() => editor.chain().focus().toggleCode().run()}>
              {'<>'}
            </ToolBtn>
          </ToolbarGroup>

          <div className="rte-toolbar-sep" />

          <ToolbarGroup>
            <ToolBtn active={isActive('link')} title="Insert / edit link" onClick={openLinkDialog}>
              🔗
            </ToolBtn>
            <ToolBtn active={false} title="Insert image from URL" onClick={openImageDialog}>
              🖼
            </ToolBtn>
            <label className="rte-btn" title="Upload image from file">
              📁
              <input type="file" accept="image/*" style={{ display: 'none' }} onChange={handleFileUpload} />
            </label>
          </ToolbarGroup>

          <div className="rte-toolbar-sep" />

          <ToolbarGroup>
            <ToolBtn active={isActive('taskList')} title="Checklist" onClick={() => editor.chain().focus().toggleTaskList().run()}>
              ☑
            </ToolBtn>
          </ToolbarGroup>

          <div className="rte-toolbar-sep" />

          <div className="rte-emoji-wrap" ref={pickerRef}>
            <ToolbarGroup>
              <ToolBtn active={pickerOpen} title="Insert emoji (or type :shortcode:)" onClick={() => setPickerOpen(p => !p)}>
                😊
              </ToolBtn>
            </ToolbarGroup>
            {pickerOpen && (
              <div className="rte-emoji-popover">
                <EmojiPicker
                  onEmojiClick={handleEmojiClick}
                  theme={isDark ? Theme.DARK : Theme.LIGHT}
                  searchPlaceholder="Search emojis…"
                  lazyLoadEmojis
                  width={320}
                  height={380}
                />
              </div>
            )}
          </div>
        </div>
      )}

      <EditorContent editor={editor} className="rte-content" />

      {/* Link dialog */}
      {linkDialogOpen && (
        <div className="rte-dialog-backdrop" onClick={() => setLinkDialogOpen(false)}>
          <div className="rte-dialog" onClick={e => e.stopPropagation()}>
            <div className="rte-dialog-title">Insert link</div>
            <input
              className="form-input"
              value={linkUrl}
              autoFocus
              onChange={e => setLinkUrl(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') applyLink(); if (e.key === 'Escape') setLinkDialogOpen(false); }}
              placeholder="https://…"
            />
            <div className="rte-dialog-actions">
              <button className="btn btn-secondary btn-sm" onClick={() => setLinkDialogOpen(false)}>Cancel</button>
              <button className="btn btn-danger btn-sm" onClick={() => { editor.chain().focus().unsetLink().run(); setLinkDialogOpen(false); }}>Remove</button>
              <button className="btn btn-primary btn-sm" onClick={applyLink}>Apply</button>
            </div>
          </div>
        </div>
      )}

      {/* Image URL dialog */}
      {imageDialogOpen && (
        <div className="rte-dialog-backdrop" onClick={() => setImageDialogOpen(false)}>
          <div className="rte-dialog" onClick={e => e.stopPropagation()}>
            <div className="rte-dialog-title">Insert image URL</div>
            <input
              className="form-input"
              value={imageUrl}
              autoFocus
              onChange={e => setImageUrl(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') applyImage(); if (e.key === 'Escape') setImageDialogOpen(false); }}
              placeholder="https://example.com/image.png"
            />
            <div className="rte-dialog-actions">
              <button className="btn btn-secondary btn-sm" onClick={() => setImageDialogOpen(false)}>Cancel</button>
              <button className="btn btn-primary btn-sm" onClick={applyImage}>Insert</button>
            </div>
          </div>
        </div>
      )}

      {/* Link confirmation dialog */}
      {confirmLink && (
        <div className="rte-dialog-backdrop" onClick={() => setConfirmLink(null)}>
          <div
            className="rte-dialog"
            onClick={e => e.stopPropagation()}
            onKeyDown={e => {
              if (e.key === 'Escape') setConfirmLink(null);
              if (e.key === 'Enter') { window.open(confirmLink, '_blank', 'noopener,noreferrer'); setConfirmLink(null); }
            }}
          >
            <div className="rte-dialog-title">Open external link?</div>
            <span className="rte-link-preview">{confirmLink}</span>
            <div className="rte-dialog-tip">Tip: ⌘+click (Mac) or Ctrl+click (Win) to open directly</div>
            <div className="rte-dialog-actions">
              <button className="btn btn-secondary btn-sm" onClick={() => setConfirmLink(null)}>Cancel</button>
              <button autoFocus className="btn btn-primary btn-sm" onClick={() => { window.open(confirmLink, '_blank', 'noopener,noreferrer'); setConfirmLink(null); }}>Open</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function ToolbarGroup({ children }: { children: React.ReactNode }) {
  return <div className="rte-toolbar-group">{children}</div>;
}

function ToolBtn({
  active, title, onClick, children,
}: {
  active: boolean; title: string; onClick: () => void; children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      title={title}
      className={`rte-btn${active ? ' rte-btn--active' : ''}`}
      onMouseDown={e => { e.preventDefault(); onClick(); }}
    >
      {children}
    </button>
  );
}
