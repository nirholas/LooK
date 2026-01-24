/**
 * FocusHighlight - Draw attention to specific UI elements
 * 
 * Effects:
 * - Spotlight (darken everything except target)
 * - Glow outline around element
 * - Pulse animation
 * - Arrow pointer
 * - Magnifying glass zoom
 */

/**
 * Generate spotlight effect overlay
 * @param {Object} target - Target element bounds {x, y, width, height}
 * @param {Object} viewport - Viewport size {width, height}
 * @param {Object} options - Effect options
 */
export function generateSpotlightOverlay(target, viewport, options = {}) {
  const {
    padding = 20,
    borderRadius = 12,
    shadowOpacity = 0.7,
    feather = 30,
    color = '#000000'
  } = options;
  
  // Expanded target area
  const spotX = target.x - padding;
  const spotY = target.y - padding;
  const spotWidth = target.width + padding * 2;
  const spotHeight = target.height + padding * 2;
  
  // Generate SVG mask
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="${viewport.width}" height="${viewport.height}">
      <defs>
        <filter id="feather" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="${feather}" />
        </filter>
        <mask id="spotlight">
          <rect width="100%" height="100%" fill="white"/>
          <rect 
            x="${spotX}" y="${spotY}" 
            width="${spotWidth}" height="${spotHeight}" 
            rx="${borderRadius}" ry="${borderRadius}"
            fill="black" filter="url(#feather)"
          />
        </mask>
      </defs>
      <rect 
        width="100%" height="100%" 
        fill="${color}" 
        fill-opacity="${shadowOpacity}"
        mask="url(#spotlight)"
      />
    </svg>
  `;
  
  return svg;
}

/**
 * Generate glow outline effect
 * @param {Object} target - Target element bounds
 * @param {Object} options - Effect options
 */
export function generateGlowOutline(target, options = {}) {
  const {
    color = '#8B5CF6',
    glowSize = 15,
    strokeWidth = 3,
    borderRadius = 8,
    animated = true,
    animationDuration = 1500
  } = options;
  
  const padding = glowSize + strokeWidth;
  const width = target.width + padding * 2;
  const height = target.height + padding * 2;
  
  const animation = animated ? `
    <animate 
      attributeName="stroke-opacity" 
      values="1;0.5;1" 
      dur="${animationDuration}ms" 
      repeatCount="indefinite"
    />
    <animate 
      attributeName="stroke-width" 
      values="${strokeWidth};${strokeWidth + 2};${strokeWidth}" 
      dur="${animationDuration}ms" 
      repeatCount="indefinite"
    />
  ` : '';
  
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" 
         width="${width}" height="${height}"
         style="position:absolute;left:${target.x - padding}px;top:${target.y - padding}px;pointer-events:none;">
      <defs>
        <filter id="glow">
          <feGaussianBlur stdDeviation="${glowSize / 3}" result="blur"/>
          <feMerge>
            <feMergeNode in="blur"/>
            <feMergeNode in="SourceGraphic"/>
          </feMerge>
        </filter>
      </defs>
      <rect 
        x="${padding}" y="${padding}" 
        width="${target.width}" height="${target.height}"
        rx="${borderRadius}" ry="${borderRadius}"
        fill="none" 
        stroke="${color}" 
        stroke-width="${strokeWidth}"
        filter="url(#glow)"
      >
        ${animation}
      </rect>
    </svg>
  `;
  
  return svg;
}

/**
 * Generate arrow pointer to element
 * @param {Object} target - Target element center
 * @param {Object} options - Arrow options
 */
export function generateArrowPointer(target, options = {}) {
  const {
    color = '#EF4444',
    size = 40,
    direction = 'auto', // auto, top, bottom, left, right
    animated = true,
    label = ''
  } = options;
  
  // Auto-detect best direction based on position
  let arrowDir = direction;
  if (direction === 'auto') {
    if (target.y < 200) arrowDir = 'bottom';
    else if (target.y > 800) arrowDir = 'top';
    else arrowDir = 'left';
  }
  
  const arrowPaths = {
    top: `M0,${size} L${size/2},0 L${size},${size} Z`,
    bottom: `M0,0 L${size/2},${size} L${size},0 Z`,
    left: `M${size},0 L0,${size/2} L${size},${size} Z`,
    right: `M0,0 L${size},${size/2} L0,${size} Z`
  };
  
  const offsets = {
    top: { x: -size/2, y: -size - 20 },
    bottom: { x: -size/2, y: 20 },
    left: { x: -size - 20, y: -size/2 },
    right: { x: 20, y: -size/2 }
  };
  
  const offset = offsets[arrowDir];
  const bounce = animated ? `
    <animateTransform 
      attributeName="transform" 
      type="translate" 
      values="0,0;0,${arrowDir === 'top' || arrowDir === 'bottom' ? '-10' : '0'};0,0"
      dur="800ms" 
      repeatCount="indefinite"
    />
  ` : '';
  
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg"
         width="${size + 100}" height="${size + 50}"
         style="position:absolute;left:${target.x + offset.x}px;top:${target.y + offset.y}px;pointer-events:none;">
      <g>
        <path 
          d="${arrowPaths[arrowDir]}" 
          fill="${color}"
          filter="drop-shadow(2px 2px 4px rgba(0,0,0,0.3))"
        />
        ${bounce}
      </g>
      ${label ? `
        <text 
          x="${size/2}" y="${size + 20}" 
          text-anchor="middle" 
          fill="${color}" 
          font-family="Inter, sans-serif"
          font-size="14" 
          font-weight="600"
        >${label}</text>
      ` : ''}
    </svg>
  `;
  
  return svg;
}

/**
 * Generate magnifying glass zoom effect
 * @param {Object} center - Center point of magnification
 * @param {Object} options - Magnification options
 */
export function generateMagnifier(center, options = {}) {
  const {
    radius = 80,
    zoom = 2,
    borderWidth = 4,
    borderColor = '#3B82F6',
    handleLength = 40
  } = options;
  
  const size = radius * 2 + handleLength + 20;
  
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" 
         width="${size}" height="${size}"
         style="position:absolute;left:${center.x - radius}px;top:${center.y - radius}px;pointer-events:none;">
      <defs>
        <clipPath id="lensClip">
          <circle cx="${radius}" cy="${radius}" r="${radius - borderWidth/2}"/>
        </clipPath>
        <filter id="lensShadow">
          <feDropShadow dx="3" dy="3" stdDeviation="5" flood-opacity="0.3"/>
        </filter>
      </defs>
      
      <!-- Handle -->
      <line 
        x1="${radius + radius * 0.7}" y1="${radius + radius * 0.7}"
        x2="${radius + radius + handleLength * 0.7}" y2="${radius + radius + handleLength * 0.7}"
        stroke="${borderColor}" 
        stroke-width="8" 
        stroke-linecap="round"
        filter="url(#lensShadow)"
      />
      
      <!-- Lens border -->
      <circle 
        cx="${radius}" cy="${radius}" r="${radius}"
        fill="white" fill-opacity="0.1"
        stroke="${borderColor}" 
        stroke-width="${borderWidth}"
        filter="url(#lensShadow)"
      />
      
      <!-- Shine -->
      <ellipse 
        cx="${radius - 15}" cy="${radius - 20}" 
        rx="20" ry="10"
        fill="white" fill-opacity="0.3"
        transform="rotate(-45, ${radius - 15}, ${radius - 20})"
      />
    </svg>
  `;
  
  return {
    svg,
    clipBounds: {
      x: center.x - radius,
      y: center.y - radius,
      width: radius * 2,
      height: radius * 2,
      zoom
    }
  };
}

/**
 * Generate pulse animation at a point (e.g., for clicks)
 * @param {Object} point - Center point
 * @param {Object} options - Pulse options
 */
export function generatePulse(point, options = {}) {
  const {
    color = '#8B5CF6',
    maxRadius = 60,
    duration = 600,
    rings = 2
  } = options;
  
  const ringElements = [];
  for (let i = 0; i < rings; i++) {
    const delay = (duration / rings) * i;
    ringElements.push(`
      <circle 
        cx="${maxRadius}" cy="${maxRadius}" r="5"
        fill="none" 
        stroke="${color}" 
        stroke-width="3"
      >
        <animate 
          attributeName="r" 
          from="5" to="${maxRadius}" 
          dur="${duration}ms" 
          begin="${delay}ms"
          fill="freeze"
        />
        <animate 
          attributeName="stroke-opacity" 
          from="1" to="0" 
          dur="${duration}ms" 
          begin="${delay}ms"
          fill="freeze"
        />
      </circle>
    `);
  }
  
  const size = maxRadius * 2 + 10;
  
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" 
         width="${size}" height="${size}"
         style="position:absolute;left:${point.x - maxRadius}px;top:${point.y - maxRadius}px;pointer-events:none;">
      ${ringElements.join('')}
    </svg>
  `;
  
  return svg;
}

/**
 * Generate text callout/annotation
 * @param {Object} point - Anchor point
 * @param {string} text - Callout text
 * @param {Object} options - Callout options
 */
export function generateCallout(point, text, options = {}) {
  const {
    backgroundColor = '#18181B',
    textColor = '#FAFAFA',
    borderColor = '#8B5CF6',
    position = 'auto', // auto, top, bottom, left, right
    maxWidth = 200,
    padding = 12,
    borderRadius = 8,
    fontSize = 14
  } = options;
  
  // Estimate text dimensions
  const lineHeight = fontSize * 1.4;
  const charsPerLine = Math.floor(maxWidth / (fontSize * 0.55));
  const lines = Math.ceil(text.length / charsPerLine);
  const textHeight = lines * lineHeight;
  const textWidth = Math.min(text.length * fontSize * 0.55, maxWidth);
  
  const boxWidth = textWidth + padding * 2;
  const boxHeight = textHeight + padding * 2;
  
  // Position calculation
  let pos = position;
  if (position === 'auto') {
    if (point.y < 200) pos = 'bottom';
    else if (point.y > 800) pos = 'top';
    else if (point.x < 400) pos = 'right';
    else pos = 'left';
  }
  
  const offsets = {
    top: { x: -boxWidth/2, y: -boxHeight - 30 },
    bottom: { x: -boxWidth/2, y: 30 },
    left: { x: -boxWidth - 30, y: -boxHeight/2 },
    right: { x: 30, y: -boxHeight/2 }
  };
  
  const offset = offsets[pos];
  const arrowSize = 10;
  
  // Arrow pointing to target
  const arrowPoints = {
    top: `${boxWidth/2 - arrowSize},${boxHeight} ${boxWidth/2},${boxHeight + arrowSize} ${boxWidth/2 + arrowSize},${boxHeight}`,
    bottom: `${boxWidth/2 - arrowSize},0 ${boxWidth/2},${-arrowSize} ${boxWidth/2 + arrowSize},0`,
    left: `${boxWidth},${boxHeight/2 - arrowSize} ${boxWidth + arrowSize},${boxHeight/2} ${boxWidth},${boxHeight/2 + arrowSize}`,
    right: `0,${boxHeight/2 - arrowSize} ${-arrowSize},${boxHeight/2} 0,${boxHeight/2 + arrowSize}`
  };
  
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg"
         width="${boxWidth + arrowSize * 2}" height="${boxHeight + arrowSize * 2}"
         style="position:absolute;left:${point.x + offset.x}px;top:${point.y + offset.y}px;pointer-events:none;">
      <defs>
        <filter id="calloutShadow">
          <feDropShadow dx="2" dy="4" stdDeviation="6" flood-opacity="0.3"/>
        </filter>
      </defs>
      
      <!-- Box -->
      <rect 
        x="${arrowSize}" y="${arrowSize}" 
        width="${boxWidth}" height="${boxHeight}"
        rx="${borderRadius}" ry="${borderRadius}"
        fill="${backgroundColor}"
        stroke="${borderColor}"
        stroke-width="2"
        filter="url(#calloutShadow)"
      />
      
      <!-- Arrow -->
      <polygon 
        points="${arrowPoints[pos]}"
        fill="${backgroundColor}"
        stroke="${borderColor}"
        stroke-width="2"
        transform="translate(${arrowSize}, ${arrowSize})"
      />
      
      <!-- Text -->
      <text 
        x="${arrowSize + padding}" y="${arrowSize + padding + fontSize}"
        fill="${textColor}"
        font-family="Inter, sans-serif"
        font-size="${fontSize}"
      >${wrapText(text, charsPerLine).map((line, i) => 
        `<tspan x="${arrowSize + padding}" dy="${i === 0 ? 0 : lineHeight}">${line}</tspan>`
      ).join('')}</text>
    </svg>
  `;
  
  return svg;
}

function wrapText(text, maxChars) {
  const words = text.split(' ');
  const lines = [];
  let currentLine = '';
  
  for (const word of words) {
    if ((currentLine + ' ' + word).trim().length <= maxChars) {
      currentLine = (currentLine + ' ' + word).trim();
    } else {
      if (currentLine) lines.push(currentLine);
      currentLine = word;
    }
  }
  if (currentLine) lines.push(currentLine);
  
  return lines;
}

export default {
  generateSpotlightOverlay,
  generateGlowOutline,
  generateArrowPointer,
  generateMagnifier,
  generatePulse,
  generateCallout
};
