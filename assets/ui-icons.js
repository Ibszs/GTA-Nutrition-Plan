// Local Lucide subset; source and license are recorded in docs/asset-sources.md.
const SVG_NS = 'http://www.w3.org/2000/svg';

export function icon(name, className = 'ui-icon') {
  const svg = document.createElementNS(SVG_NS, 'svg');
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('class', className);
  svg.setAttribute('fill', 'none');
  svg.setAttribute('stroke', 'currentColor');
  svg.setAttribute('stroke-width', '1.8');
  svg.setAttribute('stroke-linecap', 'round');
  svg.setAttribute('stroke-linejoin', 'round');
  svg.setAttribute('aria-hidden', 'true');
  svg.setAttribute('focusable', 'false');
  const use = document.createElementNS(SVG_NS, 'use');
  use.setAttribute('href', `assets/icons.svg#${name}`);
  svg.append(use);
  return svg;
}

export function iconLabel(node, text, name, trailing = false) {
  const label = document.createElement('span');
  label.textContent = text;
  node.replaceChildren(...(trailing ? [label, icon(name)] : [icon(name), label]));
  node.classList.add('with-icon');
  return node;
}
