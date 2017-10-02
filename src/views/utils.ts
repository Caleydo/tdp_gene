import {scale as d3Scale, Selection} from 'd3';

export function integrateColors(scale: d3Scale.Ordinal<string, string>, colors: string[]) {
  const old = new Set(scale.domain());
  colors = Array.from(new Set(colors.filter((d) => Boolean(d) && !old.has(d)))); // just valid ones
  colors.sort(); // sort by name
  //append new ones
  scale.domain(scale.domain().concat(colors));
}

const base = d3Scale.category20().range().slice();
// reorder such that repeat after the primary colors
const colors = base.filter((d, i) => i%2 === 0).concat(base.filter((d, i) => i%2 === 1));

export function colorScale() {
  return d3Scale.ordinal<string, string>().range(colors);
}

export function legend(legend: HTMLElement, scale: d3Scale.Ordinal<string, string>) {
  legend.classList.add('tdp-legend');
  legend.innerHTML = scale.domain().map((category) => {
    return `
        <div>
            <span style="background-color: ${scale(category)}"></span>
            <span>${category}</span>
        </div>
    `;
  }).join('\n');
}
