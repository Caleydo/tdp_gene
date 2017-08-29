import {AView, ISelection, IViewContext} from 'ordino/src/View';
import FormBuilder from 'ordino/src/form/FormBuilder';
import {scale, layout, svg as d3svg} from 'd3';
import {IFormElementDesc} from 'ordino/src/form/interfaces';

interface IStat {
  mutations: number;
  amplifications: number;
  deletions: number;
  unknown: number;
  ensg: string;
}

interface IStackElement {
  x: any;
  y: number;
  y0?: number;
}

abstract class ACancerAlteration extends AView {
  static readonly MARGINS = {
    top: 20,
    right: 200,
    bottom: 60,
    left: 60
  };

  static readonly CHART_WIDTH: number = 980;
  static readonly CHART_HEIGHT: number = 570;

  private x = scale
    .ordinal()
    .rangeRoundBands([0, ACancerAlteration.CHART_WIDTH - ACancerAlteration.MARGINS.left - ACancerAlteration.MARGINS.right], .01);

  private y = scale
    .linear()
    .rangeRound([ACancerAlteration.CHART_HEIGHT - ACancerAlteration.MARGINS.top - ACancerAlteration.MARGINS.bottom, 0]);


  private z = scale
    .ordinal()
    .range(['#FF0000', '#00FF00', '#0000FF', '#AAA']);

  private xAxis = d3svg.axis().orient('bottom');
  private yAxis = d3svg.axis().orient('left');

  private paramForm: FormBuilder;

  constructor(context: IViewContext, private selection: ISelection, parent: Element, options?) {
    super(context, parent);
  }

  buildParameterUI($parent: d3.Selection<any>, onChange: (name: string, value: any)=>Promise<any>) {
    this.paramForm = new FormBuilder($parent);

    const paramDesc = this.getParameterFormDescs();
    // map FormElement change function to provenance graph onChange function
    paramDesc.forEach((p) => {
      (<any>p.options).onChange = (selection, formElement) => onChange(formElement.id, selection.value);
    });

    this.paramForm.build(paramDesc);

    // add other fields
    super.buildParameterUI($parent, onChange);
  }

  init() {
    const svg = this.$node.append('svg')
      .attr('width', ACancerAlteration.CHART_WIDTH)
      .attr('height', ACancerAlteration.CHART_HEIGHT)
      .attr('class', 'cancer-alteration');

    svg
      .append('g')
      .attr('class', 'chart-view')
      .attr('transform', `translate(${ACancerAlteration.MARGINS.left}, ${ACancerAlteration.MARGINS.top})`);

    svg.append('g')
      .attr('class', 'chart-legend')
      .attr('transform', `translate(${ACancerAlteration.CHART_WIDTH - 150}, ${ACancerAlteration.MARGINS.top})`);

    this.update().then(() => this.addAxes());
  }

  changeSelection(selection: ISelection) {
    this.selection = selection;
    this.update().then(() => this.addAxes());
  }

  getParameter(name: string): any {
    return this.paramForm.getElementById(name).value.data;
  }

  setParameter(name: string, value: any) {
    this.paramForm.getElementById(name).value = value;
    this.$node.selectAll('.chart-view g').remove();
    this.update().then(() => this.addAxes());
  }

  private computeStats(data: any[][], ensgs: string[]) {
    const stats = data.map((rows, i) => {
      const stat: IStat = {
        mutations: 0,
        amplifications: 0,
        deletions: 0,
        unknown: 0,
        ensg: ensgs[i]
      };

      if(rows.length === 0) {
        return stat;
      }

      rows.forEach((item) => {

        if(item.aa_mutated) {
          stat.mutations++;
        } else if(item.cn === 2) { // TODO: > 0 ?
          stat.amplifications++;
        } else if(item.cn === -2) { // TODO: < 0?
          stat.deletions++;
        } else if(item.cn === null || item.aa_mutated === null) {
          stat.unknown++;
        }
      });

      Object.keys(stat).forEach((key) => {
        const entry = stat[key];
        if(typeof entry === 'number') {
          stat[key] = entry / rows.length;
        }
      });

      return stat;
    });

    return {
      stats,
      keys: Object.keys(stats[0]).filter((key) => key !== 'ensg')
    };
  }

  private async update() {
    const ensgs = await this.selection.idtype.unmap(this.selection.range);
    const data = await Promise.all(ensgs.map((ensg) => this.loadRows(ensg)));

    const { stats, keys }: { stats: IStat[], keys: string[] } = this.computeStats(data, ensgs);

    this.x.domain(ensgs);
    this.y.domain([0, 1]);
    this.z.domain(keys);

    const layers: IStackElement[][] = layout.stack()(keys.map((key): IStackElement[] => {
      return stats.map((stat: IStat): IStackElement => {
        return {
          x: stat.ensg,
          y: stat[key]
        };
      });
    }));

    const svg = this.$node.select('.chart-view');

    const categories = svg
      .selectAll('g')
      .data(layers);

    categories
      .enter()
      .append('g')
      .classed('layer', true)
      .style('fill', (d, i) => <string>this.z(keys[i])); // apply color to layer that all rects (parts of bars) inside a group inherit the color

    const bars = categories
      .selectAll('rect')
      .data((d) => d);

    bars // ENTER
      .enter()
      .append('rect')
      .attr('x', (d) => this.x(d.x))
      .attr('y', (d) => this.y(d.y + d.y0))
      .attr('width', this.x.rangeBand())
      .attr('height', (d) => this.y(d.y0) - this.y(d.y + d.y0));

    bars // UPDATE
    .attr('x', (d) => this.x(d.x))
    .attr('width', this.x.rangeBand());

    bars.exit().remove();
    categories.exit().remove();

    const legend = this.$node.select('.chart-legend');

    const entries = legend
      .selectAll('g')
      .attr('text-anchor', 'end')
      .data(keys);

    const legendGroup = entries
      .enter()
      .append('g')
      .attr('transform', (d, i) => `translate(0, ${ i * 20 })`);

    legendGroup
      .append('rect')
      .attr('x', -20)
      .attr('y', -10)
      .attr('width', 15)
      .attr('height', 15)
      .attr('fill', (d) => <string>this.z(d));

    legendGroup
      .append('text')
      .text((d) => d);

  }

  private addAxes() {
    this.xAxis.scale(this.x);
    this.yAxis.scale(this.y);

    const view = this.$node.select('.chart-view');

    view
      .append('g')
      .attr('class', 'axis x-axis')
      .attr('transform', `translate(0, ${ACancerAlteration.CHART_HEIGHT - ACancerAlteration.MARGINS.bottom - ACancerAlteration.MARGINS.top})`)
      .call(this.xAxis);

    view
      .append('g')
      .attr('class', 'axis y-axis')
      .call(this.yAxis);
  }

  protected abstract loadRows(ensg: string): Promise<any[]>;
  protected abstract getParameterFormDescs(): IFormElementDesc[];
}

export default ACancerAlteration;
