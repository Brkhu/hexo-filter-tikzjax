import type Hexo from 'hexo';
import tex2svg from 'node-tikzjax';
import { PluginConfig, PostData, localStorage, md5 } from './common';
import taskQueue from './queue';

/**
 * Extract TikZ code blocks from post content and render them into SVGs with `node-tikzjax`.
 * The generated SVGs are saved in cache with a hash as their keys for better performance.
 */
export async function renderTikzjax(this: Hexo, data: PostData): Promise<PostData | void> {
  const config = this.config.tikzjax as PluginConfig;
  if (!data.tikzjax && !config.every_page) {
    return;
  }

  // Set up loggers.
  const logPrefix = '[hexo-filter-tikzjax]';
  const debug = (...args: any[]) => this.log.debug.apply(this.log, [logPrefix, ...args]);
  const error = (...args: any[]) => this.log.error.apply(this.log, [logPrefix, ...args]);
  taskQueue.setLogger({ debug, error });

  // Find all TikZ code blocks in Markdown source. Here we handle tikz and tikz-mask separately.
  const regex = /```tikz(-mask|-color)?(-scale(?:=[\d\.]+)?)?\n([\s\S]+?)```/g;
  const matches = data.content.matchAll(regex);

  for await (const match of matches) {
    // Generate a hash for each TikZ code block as its cache key.
    const hash = md5(JSON.stringify(match[3]) + JSON.stringify(config));
    let svg = localStorage.getItem(hash);

    if (!svg) {
      //match[0]=full string, match[1]=empty or -mask, match[2]=-scale or -scale=..., match[3]=tex codes
      const input = match[3]?.trim();
      if (!input) {
        continue;
      }

      // Since `node-tikzjax` does not allow concurrent calls,
      // we have to use a task queue to make sure that only one call is running at a time.
      // This could be a bottleneck when generating a large number of posts.
      debug('Processing TikZ graphic...', hash);
      svg = await new Promise((resolve) => {
        taskQueue.enqueue(async () => {
          const svg = await tex2svg(input, {
            showConsole: this.env.debug,
            ...config.tikzjax_options,
          });

          resolve(svg);
        });
      });

      if (svg) {
        localStorage.setItem(hash, svg);
        debug('TikZ graphic saved in cache.', hash);
      } else {
        debug('TikZ graphic not generated. Skipped.', hash);
      }
    } else {
      debug('TikZ graphic found in cache. Skip rendering.', hash);
    }

    // Replace the TikZ code block with a placeholder
    // so that we can insert the SVG later in `insertSvg` function.

    let placeholder = `<!-- tikzjax${match[1]??''}${match[2]??''}-placeholder-${hash} -->`;
    data.content = data.content.replace(match[0], placeholder);
  }

  return data;
}
