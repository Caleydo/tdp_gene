import {AView, ISelection, IViewContext} from 'ordino/src/View';
import {toFilter} from 'targid_common/src/utils';
import {FORM_DATA_SOURCE, FORM_TISSUE_OR_CELLLINE_FILTER, ParameterFormIds} from 'targid_boehringer/src/forms';
import {IFormElementDesc} from 'ordino/src/form/interfaces';
import FormBuilder from 'ordino/src/form/FormBuilder';
import {convertRow2MultiMap} from 'ordino/src/form/internal/FormMap';
import {getAPIJSON} from 'phovea_core/src/ajax';
import {scale, layout, svg as d3svg} from 'd3';

export default class CancerAlteration extends AView {
  private paramForm: FormBuilder;

  static readonly MARGINS = {
    top: 20,
    right: 30,
    bottom: 40,
    left: 40
  };

  static readonly CHART_WIDTH: number = 960;
  static readonly CHART_HEIGHT: number = 570;

  private x = scale
    .ordinal()
    .rangeRoundBands([0, CancerAlteration.CHART_WIDTH - CancerAlteration.MARGINS.left - CancerAlteration.MARGINS.right], .01);

  private y = scale
    .linear()
    .rangeRound([CancerAlteration.CHART_HEIGHT - CancerAlteration.MARGINS.top - CancerAlteration.MARGINS.bottom, 0]);


  private z = scale
    .ordinal()
    .range(['#FF0000', '#00FF00', '#0000FF', '#AAA']);

  private xAxis = d3svg.axis().orient('bottom');
  private yAxis = d3svg.axis().orient('left');

  constructor(context: IViewContext, private selection: ISelection, parent: Element, options?) {
    super(context, parent);
  }

  protected getParameterFormDescs(): IFormElementDesc[] {
    return [
      FORM_DATA_SOURCE,
      FORM_TISSUE_OR_CELLLINE_FILTER
    ];
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
      .attr('width', CancerAlteration.CHART_WIDTH)
      .attr('height', CancerAlteration.CHART_HEIGHT)
      .attr('class', 'cancer-alteration')
      .append('g')
      .attr('class', 'chart-view')
      .attr('transform', `translate(${CancerAlteration.MARGINS.left}, ${CancerAlteration.MARGINS.top})`);

    this.update().then(() => this.addAxes());
  }

  protected loadRows(ensg: string): Promise<any[]> {
    const ds= this.getParameter(ParameterFormIds.DATA_SOURCE);
    const param: any = {
      ensg,
      species: 'human'
    };
    toFilter(param, convertRow2MultiMap(this.getParameter('filter')));
    return getAPIJSON(`/targid/db/bioinfodb/cellline_onco_print/filter`, param);
  }

  changeSelection(selection: ISelection) {
    this.selection = selection;
    this.update().then(() => this.addAxes());
  }

  private computeStats(data: any[][]) {

    const incrementMapValue = (map: Map<string, number>, key: string, increment: number = 1) => map.set(key, map.get(key) + increment);

    const stats = data.map((rows) => {
      const stat = new Map<string, number>([
        ['mutations', 0],
        ['amplifications', 0],
        ['deletions', 0],
        ['unknown', 0],
        ['ensg', rows[0].id]
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
          const percentage = entry / rows.length;
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

    console.log('DATA: ', data);
    const stats = this.computeStats(data);
    console.log('STATS: ', stats);

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

    categories.exit().remove();
  }

  private addAxes() {
    this.xAxis.scale(this.x);
    this.yAxis.scale(this.y);

    const view = this.$node.select('.chart-view');

    view
      .append('g')
      .attr('class', 'axis x-axis')
      .attr('transform', `translate(0, ${CancerAlteration.CHART_HEIGHT - CancerAlteration.MARGINS.bottom - CancerAlteration.MARGINS.top})`)
      .call(this.xAxis);

    view
      .append('g')
      .attr('class', 'axis y-axis')
      .call(this.yAxis);
  }

}

