/**
 * Created by Holger Stitz on 21.07.2016.
 */
/// <reference path='../../tsd.d.ts' />

import ajax = require('../caleydo_core/ajax');
import tooltip = require('../caleydo_d3/tooltip');
import idtypes = require('../caleydo_core/idtype');
import {IViewContext, ISelection, ASmallMultipleView} from '../targid2/View';
import {Range} from '../caleydo_core/range';
import {all_types, dataSources, gene, ParameterFormIds} from './Common';
import {FormBuilder, FormElementType, IFormSelectDesc} from '../targid2/FormBuilder';
import {showErrorModalDialog} from '../targid2/Dialogs';


export class ExpressionVsCopyNumber extends ASmallMultipleView {

  private x = d3.scale.linear();
  private y = d3.scale.linear();
  private xAxis = d3.svg.axis().orient('bottom').scale(this.x);
  private yAxis = d3.svg.axis().orient('left').scale(this.y);

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
              tumortype: that.getParameter(ParameterFormIds.TUMOR_TYPE)
            }),
            ajax.getAPIJSON(`/targid/db/${that.getParameter(ParameterFormIds.DATA_SOURCE).db}/gene_map_ensgs`, {
              ensgs: '\''+name+'\''
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
        d.rows = input[0];

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
      .text('Copy Number');

    svg.append('g')
      .attr('class', 'y axis');

    svg.append('text')
      .attr('class', 'y label')
      .attr('transform', 'rotate(-90)')
      .attr('dy', '1em')
      .style('text-anchor', 'middle')
      .text('Expression');
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
    this.y.domain([0, d3.max(rows, (d) => d.expression)]);

    const $g = $parent.select('svg g');

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
      .call(tooltip.bind((d:any) => d.celllinename));

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

