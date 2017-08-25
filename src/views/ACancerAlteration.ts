import {AView, ISelection, IViewContext} from 'ordino/src/View';
import FormBuilder from 'ordino/src/form/FormBuilder';
import {scale, layout, svg as d3svg} from 'd3';

abstract class ACancerAlteration extends AView {
  static readonly MARGINS = {
    top: 20,
    right: 30,
    bottom: 60,
    left: 40
  };

  static readonly CHART_WIDTH: number = 960;
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
    this.$node.append('svg')
      .attr('width', ACancerAlteration.CHART_WIDTH)
      .attr('height', ACancerAlteration.CHART_HEIGHT)
      .attr('class', 'cancer-alteration')
      .append('g')
      .attr('class', 'chart-view')
      .attr('transform', `translate(${ACancerAlteration.MARGINS.left}, ${ACancerAlteration.MARGINS.top})`);

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
    const incrementMapValue = (map: Map<string, number|string>, key: string, increment: number = 1) => map.set(key, <number>map.get(key) + increment);

    const stats = data.map((rows, i) => {
      const stat = new Map<string, number|string>([
        ['mutations', 0],
        ['amplifications', 0],
        ['deletions', 0],
        ['unknown', 0],
        ['ensg', ensgs[i]]
      ]);

      rows.forEach((item) => {

        if(item.aa_mutated) {
          incrementMapValue(stat, 'mutations');
        } else if(item.cn === 2) { // TODO: > 0 ?
          incrementMapValue(stat, 'amplifications');
        } else if(item.cn === -2) { // TODO: < 0?
          incrementMapValue(stat, 'deletions');
        } else if(item.cn === null || item.aa_mutated === null) {
          incrementMapValue(stat, 'unknown');
        }
      });

      stat.forEach((entry, key) => {
        if(typeof entry === 'number' && key !== 'total') {
          const percentage = rows.length > 0? entry / rows.length : 0; // avoid division by 0
          stat.set(key, percentage);
          // incrementMapValue(stat, 'total', percentage);
        }
      });

      return stat;
    });

    return stats;
  }

  private async update() {
    const ensgs = await this.selection.idtype.unmap(this.selection.range);
    const data = await Promise.all(ensgs.map((ensg) => this.loadRows(ensg)));

    const stats = this.computeStats(data, ensgs);
    const keys = Array.from(stats[0].keys()).filter((key) => key !== 'ensg');

    this.x.domain(ensgs);
    this.y.domain([0, 1]);
    this.z.domain(keys);

    const layers: {x: any, y: number, y0?: number}[][] = layout.stack()(keys.map((key) => {
      return stats.map((stat: Map<string, number>) => {
        return {
          x: stat.get('ensg'),
          y: stat.get(key)
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
      .data((d) => <{x: any, y: number, y0?: number}[]>d)

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


  protected abstract loadRows(ensg: string);
  protected abstract getParameterFormDescs();
}

export default ACancerAlteration;
