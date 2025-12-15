export function removeWhiteBackground(svg: string, hash: string): string {
    const widthHeightViewBoxRegex = /width="([\d\.]+)" height="([\d\.]+)" viewBox="(-?[\d\.]+) (-?[\d\.]+) ([\d\.]+) ([\d\.]+)"/;
    const widthHeightViewBox = svg.match(widthHeightViewBoxRegex);

    if (!widthHeightViewBox) {
        console.error("Could not find width, height, or viewBox attribute in SVG string.");
        return svg;
    }

    const [, widthStr, heightStr, minXStr, minYStr, boxWidthStr, boxHeightStr] = widthHeightViewBox;
    const width = (parseFloat(widthStr!) * 1.5).toFixed(3);
    const height = (parseFloat(heightStr!) * 1.5).toFixed(3);
    const rectX = Math.floor(parseFloat(minXStr!));
    const rectY = Math.floor(parseFloat(minYStr!));
    const rectWidth = Math.ceil(parseFloat(boxWidthStr!)) + 1;
    const rectHeight = Math.ceil(parseFloat(boxHeightStr!)) + 1;
    
    const openingTagEndIndex = svg.indexOf('>');
    const closingTagIndex = svg.lastIndexOf('</svg>');
    const originalContent = svg.substring(openingTagEndIndex + 1, closingTagIndex).trim();

    const openingTag = `
        <svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="${minXStr} ${minYStr} ${boxWidthStr} ${boxHeightStr}">
    `;
    const newSvgContent = `
        <defs>
            <filter id="invert">
                <feColorMatrix in="SourceGraphic" type="matrix" values="-1 0 0 0 1  0 -1 0 0 1  0 0 -1 0 1  0 0 0 1 0" />
            </filter>
            <mask id="opacity-mask-${hash}">
                <g filter="url(#invert)">
                    <rect x="${rectX}" y="${rectY}" width="${rectWidth}" height="${rectHeight}" fill="white"/>
                    ${originalContent}
                </g>
            </mask>
        </defs>
        <rect x="${rectX}" y="${rectY}" width="${rectWidth}" height="${rectHeight}" fill="var(--text-color)" mask="url(#opacity-mask-${hash})"/>
    `;

    return `${openingTag}${newSvgContent}</svg>`;
}