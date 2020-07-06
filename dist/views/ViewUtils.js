import { scale as d3Scale } from 'd3';
export class ViewUtils {
    static integrateColors(scale, colors) {
        const old = new Set(scale.domain());
        colors = Array.from(new Set(colors.filter((d) => Boolean(d) && !old.has(d)))); // just valid ones
        colors.sort(); // sort by name
        //append new ones
        scale.domain(scale.domain().concat(colors));
    }
    static colorScale() {
        return d3Scale.ordinal().range(ViewUtils.colors);
    }
    static legend(legend, scale) {
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
        legend.innerHTML = `
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
            }
            else {
                const cat = scale.domain()[i - 1] || 'null';
                Array.from(legend.parentElement.querySelectorAll(`.mark[data-color="${cat}"]`)).forEach((s) => s.classList.toggle('disabled', disabled));
            }
        }));
    }
}
ViewUtils.base = d3Scale.category20().range().slice(); // splice out the orange since used for selection;
ViewUtils.removed = ViewUtils.base.splice(2, 2);
// reorder such that repeat after the primary colors
ViewUtils.colors = ViewUtils.base.filter((d, i) => i % 2 === 0).concat(ViewUtils.base.filter((d, i) => i % 2 === 1));
//# sourceMappingURL=ViewUtils.js.map