import {AView, ISelection, IViewContext} from 'ordino/src/View';
import FormBuilder from 'ordino/src/form/FormBuilder';
import {scale, layout, svg as d3svg, format as d3Format} from 'd3';
import {IFormElementDesc} from 'ordino/src/form/interfaces';

const fakeTumorTypeData = ['Bladder', 'Breast', 'Brain', 'unknown'];

interface IStat {
  mutations: number;
  amplifications: number;
  deletions: number;
  unknown: number;
  ensg: string;
  tumortype: string;
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
  static readonly CHART_MARGIN: number = 15;

  private x = scale
    .ordinal()
    .rangeRoundBands([0, ACancerAlteration.CHART_WIDTH - ACancerAlteration.MARGINS.left - ACancerAlteration.MARGINS.right], .01);

  private y = scale
    .linear()
    .rangeRound([ACancerAlteration.CHART_HEIGHT - ACancerAlteration.MARGINS.top - ACancerAlteration.MARGINS.bottom, 0]);


  private zBars = scale
    .ordinal()
    .range(['#FF0000', '#00FF00', '#0000FF', '#AAA']);

  private zCircles = scale.category10();

  private xAxis = d3svg.axis().orient('bottom');
  private yAxis = d3svg.axis().orient('left').tickFormat(d3Format('.0%'));

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

    const chartView = svg
      .append('g')
      .attr('class', 'chart-view')
      .attr('transform', `translate(${ACancerAlteration.MARGINS.left}, ${ACancerAlteration.MARGINS.top})`);

    chartView
      .append('g')
      .attr('class', 'bar-area');

    // circles area below bars
    chartView
      .append('g')
      .attr('class', 'circles')
      .attr('transform', `translate(0, ${ACancerAlteration.CHART_HEIGHT - ACancerAlteration.MARGINS.top - ACancerAlteration.MARGINS.bottom + ACancerAlteration.CHART_MARGIN})`);

    // position legend 150px away from the right border of the SVG element
    svg.append('g')
      .attr('class', 'chart-legend')
      .attr('transform', `translate(${ACancerAlteration.CHART_WIDTH - 150}, ${ACancerAlteration.MARGINS.top})`);

    svg // y axis label
      .append('text')
      .attr('transform', `rotate(-90) translate(${-(ACancerAlteration.CHART_HEIGHT - ACancerAlteration.MARGINS.bottom - ACancerAlteration.MARGINS.top)/2}, 10)`)
      .attr('text-anchor', 'middle')
      .text('Alteration Frequency');

    // add axes
    chartView
      .append('g')
      .attr('class', 'axis x-axis')
      .attr('transform', `translate(0, ${ACancerAlteration.CHART_HEIGHT - ACancerAlteration.MARGINS.top - 20})`); // magic number 20 such that x-axis is not outside of SVG viewport

    chartView
      .append('g')
      .attr('class', 'axis y-axis');

    this.update();
  }

  changeSelection(selection: ISelection) {
    this.selection = selection;
    this.update();
  }

  getParameter(name: string): any {
    return this.paramForm.getElementById(name).value.data;
  }

  setParameter(name: string, value: any) {
    this.paramForm.getElementById(name).value = value;
    this.$node.selectAll('.chart-view g').remove();
    this.update();
  }

  private computeStats(data: any[][], ensgs: string[]) {
    const stats = data.map((rows, i) => {
      const stat: IStat = {
        mutations: 0,
        amplifications: 0,
        deletions: 0,
        unknown: 0,
        ensg: ensgs[i],
        tumortype: fakeTumorTypeData[Math.floor(Math.random() * 4)] // fake tumortype data
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
      keys: Object.keys(stats[0]).filter((key) => ['ensg', 'tumortype'].indexOf(key) === -1) // filter some keys to only contain the numeric values
    };
  }

  private async update() {
    const ensgs = await this.selection.idtype.unmap(this.selection.range);
    const data = await Promise.all(ensgs.map((ensg) => this.loadRows(ensg)));

    const { stats, keys }: { stats: IStat[], keys: string[] } = this.computeStats(data, ensgs);

    this.x.domain(ensgs);
    this.y.domain([0, 1]);
    this.zBars.domain(keys);
    this.zCircles.domain(fakeTumorTypeData);

    const layers: IStackElement[][] = layout.stack()(keys.map((key): IStackElement[] => {
      return stats.map((stat: IStat): IStackElement => {
        return {
          x: stat.ensg,
          y: stat[key]
        };
      });
    }));

    const barArea = this.$node.select('.chart-view .bar-area');

    const categories = barArea
      .selectAll('g.layer')
      .data(layers);

    categories
      .enter()
      .append('g')
      .classed('layer', true)
      .style('fill', (d, i) => <string>this.zBars(keys[i])); // apply color to layer that all rects (parts of bars) inside a group inherit the color

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


    const circlesGroup = this.$node
      .select('.circles');

    const circles = circlesGroup
      .selectAll('circle')
      .data(stats);

    circles
      .enter()
      .append('circle')
      .attr('r', 10)
      .attr('fill', (d) => <string>this.zCircles(d.tumortype))
      .append('title')
      .text((d) => d.tumortype);

    circles.attr('cx', (d, i) => this.x(d.ensg) + this.x.rangeBand() / 2); // center circle below bar

    circles.exit().remove();
    bars.exit().remove();
    categories.exit().remove();


    this.addLegend(keys);
    this.updateAxes();
  }

  private updateAxes() {
    this.xAxis.scale(this.x);
    this.yAxis.scale(this.y);

    const view = this.$node.select('.chart-view');

    view
      .select('g.x-axis')
      .call(this.xAxis);

    view
      .select('g.y-axis')
      .call(this.yAxis);
  }

  private addLegend(keys: string[]) {
    const legend = this.$node.select('.chart-legend');

    const entries = legend
      .selectAll('g')
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
      .attr('fill', (d) => <string>this.zBars(d));

    legendGroup
      .append('text')
      .text((d) => d);
  }

  protected abstract loadRows(ensg: string): Promise<any[]>;
  protected abstract getParameterFormDescs(): IFormElementDesc[];
}

export default ACancerAlteration;
