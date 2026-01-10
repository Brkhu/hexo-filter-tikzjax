export function rescale(svg: string, scale: number): string {
    const svgOpenTagRegex = /<svg([^>]+)>/;
    const match = svg.match(svgOpenTagRegex);
    if (!match) {
        console.error("Could not find <svg> tag.");
        return svg;
    }

    const originalOpeningTag = match[0];
    let newOpeningTag = originalOpeningTag;

    newOpeningTag = newOpeningTag.replace(/width="([\d\.]+)"/, (match, value) => {
        const newValue = (parseFloat(value) * scale).toFixed(3);
        return `width="${newValue}"`;
    });

    newOpeningTag = newOpeningTag.replace(/height="([\d\.]+)"/, (match, value) => {
        const newValue = (parseFloat(value) * scale).toFixed(3);
        return `height="${newValue}"`;
    });

    if (newOpeningTag === originalOpeningTag) {
        console.error("No width or height attribute found to rescale.");
        return svg;
    }

    return svg.replace(originalOpeningTag, newOpeningTag);
}

export function createMaskedSVG(svg: string, hash: string): string {
    const svgOpenTagRegex = /<svg([^>]+)>/;
    const match = svg.match(svgOpenTagRegex);
    if (!match) {
        console.error("Could not find <svg> tag.");
        return svg;
    }

    const originalOpeningTag = match[0];
    let newOpeningTag = originalOpeningTag;

    const viewBoxRegex = /viewBox="(-?[\d\.]+) (-?[\d\.]+) ([\d\.]+) ([\d\.]+)"/;
    const viewBoxMatch = newOpeningTag.match(viewBoxRegex);
    if (!viewBoxMatch) {
        console.error("Could not find viewBox attribute in SVG string.");
        return svg;
    }

    const [, minXStr, minYStr, boxWidthStr, boxHeightStr] = viewBoxMatch;
    
    const rectX = Math.floor(parseFloat(minXStr!));
    const rectY = Math.floor(parseFloat(minYStr!));
    const rectWidth = Math.ceil(parseFloat(boxWidthStr!)) + 1;
    const rectHeight = Math.ceil(parseFloat(boxHeightStr!)) + 1;

    newOpeningTag += `
    <defs>
        <filter id="invert">
            <feColorMatrix in="SourceGraphic" type="matrix" values="-1 0 0 0 1  0 -1 0 0 1  0 0 -1 0 1  0 0 0 1 0" />
        </filter>
        <mask id="opacity-mask-${hash}">
            <g filter="url(#invert)">
                <rect x="${rectX}" y="${rectY}" width="${rectWidth}" height="${rectHeight}" fill="white"/>
            `;
    const newClosingTag = `
            </g>
        </mask>
    </defs>
    <rect x="${rectX}" y="${rectY}" width="${rectWidth}" height="${rectHeight}" fill="var(--text-color)" mask="url(#opacity-mask-${hash})"/>
</svg>`;

    return svg.replace(originalOpeningTag, newOpeningTag).replace(/<\/svg>/, newClosingTag);
}