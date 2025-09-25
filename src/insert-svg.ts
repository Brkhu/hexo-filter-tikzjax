import type Hexo from 'hexo';
import { PluginConfig, TemplateLocals, localStorage } from './common';

/**
 * Insert generated SVGs into HTML of the post as inline tags.
 *
 * We separate this function from `renderTikzjax` and run them in different filters,
 * since we need the Markdown source to render TikZ graphics (in `before_post_render`).
 * But insert SVGs into Markdown source will cause problems, so we wait until the Markdown
 * source is rendered into HTML, then insert SVGs into HTML (in `after_render:html`).
 *
 * Since we need to process archive/tags/categories pages too, if they contains posts which
 * have TikZ graphs in it, the `after_post_render` filter is not sufficient.
 */
export function insertSvg(this: Hexo, html: string, locals: TemplateLocals): string | void {
  const config = this.config.tikzjax as PluginConfig;
  const page = locals.page;
  const indexContains = page.__index && page.posts.toArray().find((post: any) => post.tikzjax);

  // Only process if a post contains TikZ, or it's an index page and one of the posts contains TikZ.
  if (!page.tikzjax && !config.every_page && !indexContains) {
    return;
  }

  // Prepend CSS for TikZJax.
  html = html.replace(/<head>(?!<\/head>).+?<\/head>/s, (str) =>
    str.replace(
      '</head>',
      `<link rel="stylesheet" type="text/css" href="${config.font_css_url}" />` +
        (config.inline_style ? `<style>${config.inline_style}</style>` : '') +
        '</head>'
    )
  );

  // Find all TikZ placeholders inserted by `renderTikzjax`.
  const regex = /<!-- tikzjax-(cd-)placeholder-(\w+?) -->/g;
  const matches = html.matchAll(regex);
  const debug = (...args: any[]) => this.log.debug('[hexo-filter-tikzjax]', ...args);

  for (const match of matches) {
    const hash = match[2]?.trim();
    if (!hash) {
      continue;
    }

    const svg = localStorage.getItem(hash);
    debug('Looking for SVG in cache...', hash);

    if (svg) {
      if (match[1]) {
        const svg_cd = svg.replace('g stroke="#000"', 'g stroke="#000" fill="#000"')
        .replaceAll('"#000"', 'var(--text-color)')
        // TBD; this still behaves bad when using transparent backgrounds.
        // Masks?
        // .replaceAll('"#fff"', 'var(--content-bg-color)')
        .replace(/\b(width|height)=["']([\d.]+)["']/g, (match: string, attr: string, value: string): string => {
          // Scale tikzcd blocks by 1.5
          const scaledValue = parseFloat(value) * 1.5;
          return `${attr}="${scaledValue.toFixed(3)}"`;
        })
        html = html.replace(match[0], `<p><span class="tikzjax">${svg_cd}</span></p>`);
        debug('SVG commutative diagram inserted!', hash);
      }
      else {
        html = html.replace(match[0], `<p><span class="tikzjax">${svg}</span></p>`);
        debug('SVG inserted!', hash);
      }
    } else {
      debug('SVG not found in cache. Skipped.', hash);
    }
  }

  return html;
}
