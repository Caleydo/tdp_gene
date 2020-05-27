import {scale as d3Scale} from 'd3';


const base = d3Scale.category20().range().slice();
base.splice(2, 2); // splice out the orange since used for selection
// reorder such that repeat after the primary colors
const colors = this.base.filter((d, i) => i%2 === 0).concat(this.base.filter((d, i) => i%2 === 1));

export class ViewUtils {

  static integrateColors(scale: d3Scale.Ordinal<string, string>, colors: string[]) {
    const old = new Set(scale.domain());
    colors = Array.from(new Set(colors.filter((d) => Boolean(d) && !old.has(d)))); // just valid ones
    colors.sort(); // sort by name
    //append new ones
    scale.domain(scale.domain().concat(colors));
  }

  static colorScale() {
    return d3Scale.ordinal<string, string>().range(colors);
  }

  static legend(legend: HTMLElement, scale: d3Scale.Ordinal<string, string>) {
    legend.classList.add('tdp-legend');
    const categories = scale.domain();
    if (categories.length === 0) {
      legend.innerHTML = '';
      return;
    }
    const cats = scale.domain().map((category) => {
      return `
          <div>
              <span style="background-color: ${scale(category)}"></span>
              <span>${category}</span>
          </div>
      `;
    }).join('\n');
    legend.innerHTML =  `
          <div>
              <span></span>
              <span>Hide/Show All</span>
          </div>
          ${cats}
          <div>
              <span style="background-color: black"></span>
              <span>Unknown</span>
          </div>`;
    Array.from(legend.children).forEach((d, i) => d.addEventListener('click', () => {
      const disabled = d.classList.toggle('disabled');
      if (i === 0) {
        // all
        Array.from(legend.children).forEach((d) => d.classList.toggle('disabled', disabled));
        Array.from(legend.parentElement.querySelectorAll(`.mark`)).forEach((s) => s.classList.toggle('disabled', disabled));
      } else {
        const cat = scale.domain()[i - 1] || 'null';
        Array.from(legend.parentElement.querySelectorAll(`.mark[data-color="${cat}"]`)).forEach((s) => s.classList.toggle('disabled', disabled));
      }
    }));
  }
}
