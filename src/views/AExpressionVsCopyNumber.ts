/**
 * Created by Holger Stitz on 21.07.2016.
 */
import '../style.scss';

import {Range} from 'phovea_core/src/range';
import {FORM_EXPRESSION_SUBTYPE_ID, FORM_COPYNUMBER_SUBTYPE_ID} from '../forms';
import {showErrorModalDialog} from 'tdp_core/src/dialogs';
import * as d3 from 'd3';
import {toSelectOperation, SelectOperation, integrateSelection} from 'phovea_core/src/idtype';
import {FormElementType, IFormSelectDesc} from 'tdp_core/src/form';
import {resolveId} from 'tdp_core/src/views';
import {AD3View} from 'tdp_core/src/views/AD3View';
import {colorScale, integrateColors, legend} from './utils';


export abstract class AExpressionVsCopyNumber extends AD3View {
  private readonly margin = {top: 40, right: 5, bottom: 50, left: 50};
  private readonly width = 280 - this.margin.left - this.margin.right;
  private readonly height = 320 - this.margin.top - this.margin.bottom;

  private $legend: d3.Selection<any>;

  private x = d3.scale.linear();
  private y = d3.scale.log();
  private readonly color = colorScale();
  private xAxis = d3.svg.axis().orient('bottom').scale(this.x);
  private yAxis = d3.svg.axis().orient('left').scale(this.y).tickFormat(this.y.tickFormat(2, '.1f'));

  protected initImpl() {
    super.initImpl();
    this.node.classList.add('expressionVsCopyNumber', 'multiple');
    this.$legend = this.$node.append('div').classed('tdp-legend', true);
    return this.update();
  }

  protected abstract getExpressionValues(): {name: string, value: string, data: any}[];
  protected abstract getCopyNumberValues(): {name: string, value: string, data: any}[];

  protected getParameterFormDescs(): IFormSelectDesc[] {
    return [
      {
        type: FormElementType.SELECT,
        label: 'Expression',
        id: FORM_EXPRESSION_SUBTYPE_ID,
        options: {
          optionsData: this.getExpressionValues()
        },
        useSession: false
      },
      {
        type: FormElementType.SELECT,
        label: 'Copy Number',
        id: FORM_COPYNUMBER_SUBTYPE_ID,
        options: {
          optionsData: this.getCopyNumberValues()
        },
        useSession: false
      }
    ];
  }

  parameterChanged(name: string) {
    super.parameterChanged(name);
    this.color.domain([]); // reset colors
    this.update(true);
  }

  selectionChanged() {
    super.selectionChanged();
    this.update();
  }

  /**
   * Filter expression values with 0, because log scale cannot handle log(0)
   * @param rows
   * @returns {any}
   */
  private filterZeroValues(rows: IDataFormatRow[]) {
    const rows2 = rows.filter((d) => d.expression !== 0 && d.expression !== undefined);
    console.log(`filtered ${rows.length - rows2.length} zero values`);
    return rows2;
  }

  private update(updateAll = false) {
    this.setBusy(true);

    const that = this;
    const ids = this.selection.range.dim(0).asList();
    const idtype = this.selection.idtype;

    const data: IDataFormat[] = ids.map((id) => {
      return {id, geneName: '', rows: []};
    });

    const $ids = this.$node.selectAll('div.ids').data<IDataFormat>(<any>data, (d) => d.id.toString());
    const $idsEnter = $ids.enter().append('div').classed('ids', true);

    // decide whether to load data for newly added items
    // or to reload the data for all items (e.g. due to parameter change)
    const enterOrUpdateAll = (updateAll) ? $ids : $idsEnter;

    enterOrUpdateAll.each(function (this: HTMLElement, d) {
      const $id = d3.select(this);
      const promise = resolveId(idtype, d.id, that.idType)
        .then((name) => Promise.all([that.loadData(name),that.loadFirstName(name)]));

      // on error
      promise.catch(showErrorModalDialog)
        .catch((error) => {
          console.error(error);
          that.setBusy(false);
        });

      // on success
      promise.then((input: any[]) => {
        d.rows = that.filterZeroValues(input[0]);
        d.geneName = input[1];

        //console.log('loaded data for', d.geneName);

        that.initChart($id);
        that.resizeChart($id);
        that.updateChartData($id);

        that.setBusy(false);
      });
    });

    $ids.exit().remove()
      .each(function (d) {
        that.setBusy(false);
      });
  }

  protected abstract loadData(ensg: string): Promise<IDataFormatRow[]>;

  protected abstract loadFirstName(ensg: string): Promise<string>;

  private initChart($parent: d3.Selection<any>) {
    // already initialized svg node -> skip this part
    if ($parent.select('svg').size() > 0) {
      return;
    }

    const svg = $parent.append('svg')
      .append('g')
      .attr('transform', 'translate(' + this.margin.left + ',' + this.margin.top + ')');

    svg.append('g')
      .attr('class', 'title')
      .attr('transform', 'translate(0,' + this.height + ')');

    svg.append('text')
      .attr('class', 'title')
      .style('text-anchor', 'middle');

    svg.append('g')
      .attr('class', 'x axis')
      .attr('transform', 'translate(0,' + this.height + ')');

    svg.append('text')
      .attr('class', 'x label')
      .style('text-anchor', 'middle')
      .text(this.getParameter(FORM_COPYNUMBER_SUBTYPE_ID).name);

    svg.append('g')
      .attr('class', 'y axis');

    svg.append('text')
      .attr('class', 'y label')
      .attr('transform', 'rotate(-90)')
      .attr('dy', '1em')
      .style('text-anchor', 'middle')
      .text(this.getParameter(FORM_EXPRESSION_SUBTYPE_ID).name);
  }

  private resizeChart($parent: d3.Selection<any>) {
    this.x.range([0, this.width]);
    this.y.range([this.height, 0]);

    const svg = $parent.select('svg')
      .attr('width', this.width + this.margin.left + this.margin.right)
      .attr('height', this.height + this.margin.top + this.margin.bottom);

    svg.select('text.title').attr('transform', 'translate(' + (this.width / 2) + ' ,' + -0.25 * this.margin.top + ')');

    svg.select('g.x.axis').call(this.xAxis);
    svg.select('g.y.axis').call(this.yAxis);

    svg.select('text.x.label').attr('transform', 'translate(' + (this.width / 2) + ' ,' + (this.height + 0.75 * this.margin.bottom) + ')');
    svg.select('text.y.label').attr('y', 0 - this.margin.left).attr('x', 0 - (this.height / 2));

    // shift also the points on resizing
    // causes the d3 error: `<circle> attribute cx: Expected length, "NaN".`
    /*svg.selectAll('.mark')
     .transition().attr({
     cx: (d) => this.x(d.expression),
     cy: (d) => this.y(d.cn),
     });*/
  }

  private updateChartData($parent: d3.Selection<any>) {

    const data: IDataFormat = $parent.datum();
    const geneName = data.geneName;
    const rows = data.rows.slice();

    // sort missing colors to the front
    rows.sort((a, b) => a.color === b.color ? 0 : (a.color === null ? -1 : (b.color === null ? 1 : 0)));

    this.x.domain([0, d3.max(rows, (d) => d.cn)]);
    this.y.domain([1, d3.max(rows, (d) => d.expression)]).clamp(true);
    integrateColors(this.color, rows.map((d) => d.color));
    legend(<HTMLElement>this.$legend.node(), this.color);

    const $g = $parent.select('svg g');

    $g.select('text.x.label').text(this.getParameter(FORM_COPYNUMBER_SUBTYPE_ID).name);
    $g.select('text.y.label').text(this.getParameter(FORM_EXPRESSION_SUBTYPE_ID).name);

    $g.select('g.x.axis').call(this.xAxis);
    $g.select('g.y.axis').call(this.yAxis);

    let title = 'No data for ' + geneName;
    if (rows[0]) {
      title = geneName;
    }
    $g.select('text.title').text(title);


    const marks = $g.selectAll('.mark').data(rows);
    marks.enter().append('circle')
      .classed('mark', true)
      .attr('r', 2)
      .on('click', (d) => {
        const target: EventTarget = (<Event>d3.event).target;

        const selectOperation = toSelectOperation(<MouseEvent>d3.event);
        const oldSelection = this.getItemSelection();
        const id: number = d._id;
        const newSelection = integrateSelection(oldSelection.range, [id], selectOperation);

        if (selectOperation === SelectOperation.SET) {
            d3.selectAll('circle.mark.clicked').classed('clicked', false);
        }
        d3.select(target).classed('clicked', selectOperation !== SelectOperation.REMOVE);
        this.select(newSelection);
      }).append('title');

    marks.attr('data-id', (d) => d._id);
    marks.attr('data-color', (d) => String(d.color));
    marks.select('title').text((d) => `${d.samplename} (${this.getParameter(FORM_COPYNUMBER_SUBTYPE_ID).name}: ${d.cn}, ${this.getParameter(FORM_EXPRESSION_SUBTYPE_ID).name}: ${d.expression}, color: ${d.color})`);
    marks.transition().attr({
      cx: (d) => this.x(d.cn),
      cy: (d) => this.y(d.expression),
    }).style('fill', (d) => d.color ? this.color(d.color) : null);

    marks.exit().remove();
  }

  protected abstract select(r: Range): void;

}
export default AExpressionVsCopyNumber;

export interface IDataFormatRow {
  samplename: string;
  expression: number;
  color?: string;
  cn: number;
  _id: number;
}

export interface IDataFormat {
  id: number;
  geneName: string;
  rows: IDataFormatRow[];
}

