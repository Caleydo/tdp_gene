/**
 * Created by Holger Stitz on 21.07.2016.
 */
import './style.scss';

import * as ajax from 'phovea_core/src/ajax';
import bindTooltip from 'phovea_d3/src/tooltip';
import * as idtypes from 'phovea_core/src/idtype';
import {IViewContext, ISelection, ASmallMultipleView} from 'targid2/src/View';
import {Range} from 'phovea_core/src/range';
import {all_types, dataSources, gene, expression, copyNumber, ParameterFormIds, getSelectedSpecies} from './Common';
import {FormBuilder, FormElementType, IFormSelectDesc} from 'targid2/src/FormBuilder';
import {showErrorModalDialog} from 'targid2/src/Dialogs';
import * as d3 from 'd3';


export class ExpressionVsCopyNumber extends ASmallMultipleView {

  private x = d3.scale.linear();
  private y = d3.scale.log();
  private xAxis = d3.svg.axis().orient('bottom').scale(this.x);
  private yAxis = d3.svg.axis().orient('left').scale(this.y).tickFormat(this.y.tickFormat(2, '.1f'));

  private paramForm:FormBuilder;
  private paramDesc:IFormSelectDesc[] = [
    {
      type: FormElementType.SELECT,
      label: 'Data Source',
      id: ParameterFormIds.DATA_SOURCE,
      options: {
        optionsData: dataSources.map((ds) => {
          return {name: ds.name, value: ds.name, data: ds};
        })
      },
      useSession: true
    },
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
    },
    {
      type: FormElementType.SELECT,
      label: 'Tumor Type',
      id: ParameterFormIds.TUMOR_TYPE,
      dependsOn: [ParameterFormIds.DATA_SOURCE],
      options: {
        optionsFnc: (selection) => selection[0].data.tumorTypesWithAll,
        optionsData: []
      },
      useSession: true
    }
  ];

  constructor(context:IViewContext, private selection: ISelection, parent:Element, options?) {
    super(context, selection, parent, options);
  }

  init() {
    super.init();
    this.$node.classed('expressionVsCopyNumber', true);
    this.update();
  }

  buildParameterUI($parent: d3.Selection<any>, onChange: (name: string, value: any)=>Promise<any>) {
    this.paramForm = new FormBuilder($parent);

    // map FormElement change function to provenance graph onChange function
    this.paramDesc.forEach((p) => {
      p.options.onChange = (selection, formElement) => onChange(formElement.id, selection.value);
    });

    this.paramForm.build(this.paramDesc);

    // add other fields
    super.buildParameterUI($parent, onChange);
  }

  getParameter(name: string): any {
    return this.paramForm.getElementById(name).value.data;
  }

  setParameter(name: string, value: any) {
    this.paramForm.getElementById(name).value = value;
    this.update(true);
  }

  changeSelection(selection:ISelection) {
    this.selection = selection;
    this.update();
  }

  /**
   * Filter expression values with 0, because log scale cannot handle log(0)
   * @param rows
   * @returns {any}
   */
  private filterZeroValues(rows) {
    const rows2 = rows.filter((d) => d.expression !== 0 && d.expression !== undefined);
    console.log(`filtered ${rows.length-rows2.length} zero values`);
    return rows2;
  }

  private update(updateAll = false) {
    this.setBusy(true);

    const that = this;
    const ids = this.selection.range.dim(0).asList();
    const idtype = this.selection.idtype;

    const data:IDataFormat[] = ids.map((id) => {
      return {id: id, geneName: '', rows: []};
    });

    const $ids = this.$node.selectAll('div.ids').data<IDataFormat>(<any>data, (d) => d.id.toString());
    const $ids_enter = $ids.enter().append('div').classed('ids', true);

    // decide whether to load data for newly added items
    // or to reload the data for all items (e.g. due to parameter change)
    const enterOrUpdateAll = (updateAll) ? $ids : $ids_enter;

    enterOrUpdateAll.each(function(d) {
      const $id = d3.select(this);
      const promise = that.resolveId(idtype, d.id, gene.idType)
        .then((name) => {
          return Promise.all([
            ajax.getAPIJSON(`/targid/db/${that.getParameter(ParameterFormIds.DATA_SOURCE).db}/expression_vs_copynumber${that.getParameter(ParameterFormIds.TUMOR_TYPE) === all_types ? '_all' : ''}`, {
              ensg: name,
              schema: that.getParameter(ParameterFormIds.DATA_SOURCE).schema,
              entity_name: that.getParameter(ParameterFormIds.DATA_SOURCE).entityName,
              expression_subtype: that.getParameter(ParameterFormIds.EXPRESSION_SUBTYPE).id,
              copynumber_subtype: that.getParameter(ParameterFormIds.COPYNUMBER_SUBTYPE).id,
              tumortype: that.getParameter(ParameterFormIds.TUMOR_TYPE),
              species: getSelectedSpecies()
            }),
            ajax.getAPIJSON(`/targid/db/${that.getParameter(ParameterFormIds.DATA_SOURCE).db}/gene_map_ensgs`, {
              ensgs: '\''+name+'\'',
              species: getSelectedSpecies()
            })
          ]);
        });

      // on error
      promise.catch(showErrorModalDialog)
        .catch((error) => {
          console.error(error);
          that.setBusy(false);
        });

      // on success
      promise.then((input) => {
        d.geneName = input[1][0].symbol;
        d.rows = that.filterZeroValues(input[0]);

        //console.log('loaded data for', d.geneName);

        that.initChart($id);
        that.resizeChart($id);
        that.updateChartData($id);

        that.setBusy(false);
      });
    });

    $ids.exit().remove()
      .each(function(d) {
        that.setBusy(false);
      });
  }

  private initChart($parent) {
    // already initialized svg node -> skip this part
    if($parent.select('svg').size() > 0) {
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

  private resizeChart($parent) {
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

  private updateChartData($parent) {

    const data:IDataFormat = $parent.datum();
    const geneName = data.geneName;
    const rows = data.rows;

    this.x.domain([0, d3.max(rows, (d) => d.cn)]);
    this.y.domain([1, d3.max(rows, (d) => d.expression)]).clamp(true);

    const $g = $parent.select('svg g');

    $g.select('text.x.label').text(this.getParameter(ParameterFormIds.COPYNUMBER_SUBTYPE).name);
    $g.select('text.y.label').text(this.getParameter(ParameterFormIds.EXPRESSION_SUBTYPE).name);

    $g.select('g.x.axis').call(this.xAxis);
    $g.select('g.y.axis').call(this.yAxis);

    var title = 'No data for ' + geneName;
    if(rows[0]) {
      title = geneName;
    }
    $g.select('text.title').text(title);

    const marks = $g.selectAll('.mark').data(rows);
    marks.enter().append('circle')
      .classed('mark', true)
      .attr('r', 2)
      .attr('title', (d) => d.celllinename)
      .on('click', (d) => {
        console.log('selected', d);
        const r = new Range();
        r.dim(0).setList((<any>[d.celllinename]));
        this.setItemSelection({idtype: idtypes.resolve(this.getParameter(ParameterFormIds.DATA_SOURCE).idType), range: r});
      })
      .call(bindTooltip((d:any) => d.celllinename));

    marks.transition().attr({
      cx: (d) => this.x(d.cn),
      cy: (d) => this.y(d.expression),
    });

    marks.exit().remove();
  }

}

interface IDataFormat {
  id:number;
  geneName: string;
  rows: {
    id: string,
    symbol: string,
    celllinename: string,
    expression: number,
    cn: number
  }[];
}

export function create(context:IViewContext, selection:ISelection, parent:Element, options?) {
  return new ExpressionVsCopyNumber(context, selection, parent, options);
}


