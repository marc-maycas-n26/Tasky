import { getAttributes } from '@tiptap/core'
import Link from '@tiptap/extension-link'
import { Plugin, PluginKey } from '@tiptap/pm/state'

export const CustomLink = Link.extend({
  addOptions() {
    return {
      ...this.parent?.(),
      onLinkClick: (_href: string) => {},
    }
  },

  addProseMirrorPlugins() {
    const parentPlugins = (this.parent?.() ?? []).filter(
      (plugin: Plugin) => (plugin.spec as any).key?.key !== 'handleClickLink$',
    )

    const customClickPlugin = new Plugin({
      key: new PluginKey('customHandleClickLink'),
      props: {
        handleClick: (view, _pos, event) => {
          if (event.button !== 0) return false

          let link: HTMLAnchorElement | null = null
          if (event.target instanceof HTMLAnchorElement) {
            link = event.target
          } else {
            const el = event.target as HTMLElement | null
            if (!el) return false
            link = el.closest<HTMLAnchorElement>('a')
            if (link && !this.editor.view.dom.contains(link)) link = null
          }

          if (!link) return false

          if (this.options.enableClickSelection) {
            this.editor.commands.extendMarkRange(this.type.name)
          }

          const attrs = getAttributes(view.state, this.type.name)
          const href = link.href || attrs.href

          if (href) {
            if (event.metaKey || event.ctrlKey) {
              window.open(href, '_blank', 'noopener,noreferrer')
            } else {
              this.options.onLinkClick(href)
            }
            return true
          }

          return false
        },
      },
    })

    return [...parentPlugins, customClickPlugin]
  },
})
