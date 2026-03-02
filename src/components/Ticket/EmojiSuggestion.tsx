import { ReactRenderer } from '@tiptap/react';
import type { SuggestionOptions } from '@tiptap/suggestion';
import { emojis } from '@tiptap/extension-emoji';
import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useState,
} from 'react';
import type { Instance as TippyInstance } from 'tippy.js';
import tippy from 'tippy.js';

// ── Types ─────────────────────────────────────────────────────────────────────

interface EmojiItem {
  emoji: string;
  name: string;
  shortcodes: string[];
}

interface SuggestionListProps {
  items: EmojiItem[];
  command: (item: EmojiItem) => void;
}

export interface SuggestionListRef {
  onKeyDown: (props: { event: KeyboardEvent }) => boolean;
}

// ── Dropdown list component ───────────────────────────────────────────────────

const EmojiSuggestionList = forwardRef<SuggestionListRef, SuggestionListProps>(
  ({ items, command }, ref) => {
    const [selected, setSelected] = useState(0);

    // Reset selection when items change
    useEffect(() => setSelected(0), [items]);

    useImperativeHandle(ref, () => ({
      onKeyDown({ event }) {
        if (event.key === 'ArrowUp') {
          setSelected(s => (s - 1 + items.length) % items.length);
          return true;
        }
        if (event.key === 'ArrowDown') {
          setSelected(s => (s + 1) % items.length);
          return true;
        }
        if (event.key === 'Enter' || event.key === 'Tab') {
          if (items[selected]) command(items[selected]);
          return true;
        }
        return false;
      },
    }));

    if (!items.length) return null;

    return (
      <div className="emoji-suggestion">
        {items.map((item, i) => (
          <button
            key={item.name}
            className={`emoji-suggestion-item${i === selected ? ' emoji-suggestion-item--active' : ''}`}
            onMouseDown={e => { e.preventDefault(); command(item); }}
            onMouseEnter={() => setSelected(i)}
          >
            <span className="emoji-suggestion-glyph">{item.emoji}</span>
            <span className="emoji-suggestion-name">:{item.shortcodes[0]}:</span>
          </button>
        ))}
      </div>
    );
  }
);
EmojiSuggestionList.displayName = 'EmojiSuggestionList';

// ── Suggestion config ─────────────────────────────────────────────────────────

export const emojiSuggestion: Omit<SuggestionOptions, 'editor'> = {
  items({ query }) {
    if (!query) return emojis.slice(0, 12) as EmojiItem[];
    const q = query.toLowerCase();
    return (emojis as EmojiItem[])
      .filter(e =>
        e.shortcodes.some(s => s.includes(q)) ||
        e.name.includes(q)
      )
      .slice(0, 12);
  },

  render() {
    let renderer: ReactRenderer<SuggestionListRef>;
    let popup: TippyInstance[];

    return {
      onStart(props) {
        renderer = new ReactRenderer(EmojiSuggestionList, {
          props,
          editor: props.editor,
        });

        popup = tippy('body', {
          getReferenceClientRect: props.clientRect as () => DOMRect,
          appendTo: () => document.body,
          content: renderer.element,
          showOnCreate: true,
          interactive: true,
          trigger: 'manual',
          placement: 'bottom-start',
          theme: 'emoji-suggestion',
        });
      },

      onUpdate(props) {
        renderer.updateProps(props);
        popup[0].setProps({
          getReferenceClientRect: props.clientRect as () => DOMRect,
        });
      },

      onKeyDown(props) {
        if (props.event.key === 'Escape') {
          popup[0].hide();
          return true;
        }
        return renderer.ref?.onKeyDown(props) ?? false;
      },

      onExit() {
        popup[0].destroy();
        renderer.destroy();
      },
    };
  },

  command({ editor, range, props }) {
    editor.chain().focus().deleteRange(range).insertContent(props.emoji).run();
  },
};
