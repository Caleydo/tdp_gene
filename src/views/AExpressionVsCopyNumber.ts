/**
 * Created by Holger Stitz on 21.07.2016.
 */
import '../style.scss';

import bindTooltip from 'phovea_d3/src/tooltip';
import * as idtypes from 'phovea_core/src/idtype';
import {IViewContext, ISelection, ASmallMultipleView} from 'ordino/src/View';
import {Range} from 'phovea_core/src/range';
import {gene, expression, copyNumber, ParameterFormIds} from '../Common';
import {FormBuilder, FormElementType, IFormSelectDesc} from 'ordino/src/FormBuilder';
import {showErrorModalDialog} from 'ordino/src/Dialogs';
import * as d3 from 'd3';


export abstract class AExpressionVsCopyNumber extends ASmallMultipleView {

  private x = d3.scale.linear();
  private y = d3.scale.log();
  private xAxis = d3.svg.axis().orient('bottom').scale(this.x);
  private yAxis = d3.svg.axis().orient('left').scale(this.y).tickFormat(this.y.tickFormat(2, '.1f'));

  private paramForm: FormBuilder;

  constructor(context: IViewContext, private selection: ISelection, parent: Element, options?) {
    super(context, selection, parent, options);
  }

  init() {
    super.init();
    this.$node.classed('expressionVsCopyNumber', true);
    this.update();
  }

  buildParameterUI($parent: d3.Selection<any>, onChange: (name: string, value: any) => Promise<any>) {
    this.paramForm = new FormBuilder($parent);

    const paramDesc = this.buildParameterDescs();
    // map FormElement change function to provenance graph onChange function
    paramDesc.forEach((p) => {
      p.options.onChange = (selection, formElement) => onChange(formElement.id, selection.value);
    });

    this.paramForm.build(paramDesc);

    // add other fields
    super.buildParameterUI($parent, onChange);
  }

  protected buildParameterDescs(): IFormSelectDesc[] {
    return [
      {
        type: FormElementType.SELECT,
        label: 'Expression',
        id: ParameterFormIds.EXPRESSION_SUBTYPE,
        options: {
          optionsData: expression.dataSubtypes.map((ds) => {
            return {name: ds.name, value: ds.id, data: ds};
          })
        },
        useSession: false
      },
      {
        type: FormElementType.SELECT,
        label: 'Copy Number',
        id: ParameterFormIds.COPYNUMBER_SUBTYPE,
        options: {
          optionsData: copyNumber.dataSubtypes.map((ds) => {
            return {name: ds.name, value: ds.id, data: ds};
          })
        },
        useSession: false
      }
    ];
  }

  getParameter(name: string): any {
    return this.paramForm.getElementById(name).value.data;
  }

  setParameter(name: string, value: any) {
    this.paramForm.getElementById(name).value = value;
    this.update(true);
  }

  changeSelection(selection: ISelection) {
    this.selection = selection;
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

    enterOrUpdateAll.each(function (d) {
      const $id = d3.select(this);
      const promise = that.resolveId(idtype, d.id, gene.idType)
        .then((name) => Promise.all([this.loadData(name),this.loadFirstName(name)]));

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
      .text(this.getParameter(ParameterFormIds.COPYNUMBER_SUBTYPE).name);

    svg.append('g')
      .attr('class', 'y axis');

    svg.append('text')
      .attr('class', 'y label')
      .attr('transform', 'rotate(-90)')
      .attr('dy', '1em')
      .style('text-anchor', 'middle')
      .text(this.getParameter(ParameterFormIds.EXPRESSION_SUBTYPE).name);
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
    const rows = data.rows;

    this.x.domain([0, d3.max(rows, (d) => d.cn)]);
    this.y.domain([1, d3.max(rows, (d) => d.expression)]).clamp(true);

    const $g = $parent.select('svg g');

    $g.select('text.x.label').text(this.getParameter(ParameterFormIds.COPYNUMBER_SUBTYPE).name);
    $g.select('text.y.label').text(this.getParameter(ParameterFormIds.EXPRESSION_SUBTYPE).name);

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
      .attr('title', (d) => d.samplename)
      .on('click', (d) => {
        console.log('selected', d);
        const r = new Range();
        r.dim(0).setList((<any>[d.samplename]));
        this.setItemSelection({
          idtype: idtypes.resolve(this.getParameter(ParameterFormIds.DATA_SOURCE).idType),
          range: r
        });
      })
      .call(bindTooltip((d: any) => d.samplename));

    marks.transition().attr({
      cx: (d) => this.x(d.cn),
      cy: (d) => this.y(d.expression),
    });

    marks.exit().remove();
  }

}
export default AExpressionVsCopyNumber;

export interface IDataFormatRow {
  samplename: string;
  expression: number;
  cn: number;
}

export interface IDataFormat {
  id: number;
  geneName: string;
  rows: IDataFormatRow[];
}

