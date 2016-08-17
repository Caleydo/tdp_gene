/**
 * Created by Samuel Gratzl on 27.04.2016.
 */
/// <reference path="../../tsd.d.ts" />

import ajax = require('../caleydo_core/ajax');
import {IViewContext, ISelection, AView, IView} from '../targid2/View';
import {all_types, dataSources, copyNumberVariations, mutationStatus, gene, ParameterFormIds} from './Common';
import {FormBuilder, FormElementType, IFormSelectDesc} from '../targid2/FormBuilder';

export class OncoPrint extends AView {

  private $table:d3.Selection<IView>;

  //private c = d3.scale.category10().domain(alteration_types);
  private c = d3.scale.ordinal<string>().domain(copyNumberVariations.map((d) => String(d.value))).range(copyNumberVariations.map((d) => d.color));
  private cBorder = d3.scale.ordinal<string>().domain(copyNumberVariations.map((d) => String(d.value))).range(copyNumberVariations.map((d) => d.border));
  private cMut = d3.scale.ordinal<string>().domain(mutationStatus.map((d) => d.value)).range(mutationStatus.map((d) => d.color));
  //private cBor = d3.scale.ordinal<string>().domain(['t', 'f']).range(['#ff0000','#0000ff']);

  private cellHeight = 25;
  private cellWidth = 7;
  private cellPadding = 2;
  private cellMutation = 8;

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
    super(context, parent, options);
  }

  init() {
    super.init();
    this.build();
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
    return this.update();
  }

  private build() {

    this.$node.classed('oncoPrint', true);

    this.$table = this.$node
      .append('div').classed('geneTableWrapper', true)
      .append('table')
      .append('tbody');

    const $legend = this.$node.append('ul').classed('legend', true);

    $legend.append('li').classed('title', true).text('Genetic Alteration:');

    copyNumberVariations.forEach((d) => {
      let $li = $legend.append('li').classed('cnv', true);
      $li.append('span').style('background-color', d.color).style('border', '1px solid ' + d.border);
      $li.append('span').text(d.name);
    });

    mutationStatus
      .filter((d) => d.value !=='f')
      .forEach((d) => {
        let $li = $legend.append('li').classed('mut', true);
        $li.append('span').style('background-color', d.color);
        $li.append('span').text(d.name);
      });
  }

  private update(updateAll = false) {
    this.setBusy(true);

    const that = this;
    const ids = this.selection.range.dim(0).asList();
    const idtype = this.selection.idtype;

    const data:IDataFormat[] = ids.map((id) => {
      return {id: id, geneName: '', ensg: '', rows: []};
    });

    const $ids = this.$table.selectAll('tr.gene').data<IDataFormat>(<any>data, (d) => d.id.toString());
    const $ids_enter = $ids.enter().append('tr').classed('gene', true);

    // decide whether to load data for newly added items
    // or to reload the data for all items (e.g. due to parameter change)
    const enterOrUpdateAll = (updateAll) ? $ids : $ids_enter;

    enterOrUpdateAll.each(function(d) {
      const $id = d3.select(this);
      return that.resolveId(idtype, d.id, gene.idType)
        .then((name) => {
          return Promise.all([
            name,
            ajax.getAPIJSON(`/targid/db/${that.getParameter(ParameterFormIds.DATA_SOURCE).db}/onco_print${that.getParameter(ParameterFormIds.TUMOR_TYPE) === all_types ? '_all' : ''}`, {
              ensgs: '\''+name+'\'',
              tumortype: that.getParameter(ParameterFormIds.TUMOR_TYPE)
            }),
            ajax.getAPIJSON(`/targid/db/${that.getParameter(ParameterFormIds.DATA_SOURCE).db}/gene_map_ensgs`, {
              ensgs: '\''+name+'\''
            })
          ]);
        })
        .catch((error) => {
          console.error(error);
          that.setBusy(false);
        })
        .then((input) => {
          d.geneName = input[2][0].symbol;
          d.rows = input[1];
          d.ensg = input[0];

          //console.log('loaded data for', d);
          that.updateChartData($id);
          that.setBusy(false);
        });
      });

    $ids.exit().remove()
      .each(function(d) {
        that.setBusy(false);
      });
  }

  private updateChartData($parent) {

    const data:IDataFormat = $parent.datum();
    const rows = data.rows;

    const $th = $parent.selectAll('th.geneLabel').data([data]);
    $th.enter().append('th').classed('geneLabel', true);
    $th.html((d:any) => `${d.geneName} <span>${d.ensg}</span>`);
    $th.exit().remove();

    const $cells = $parent.selectAll('td.cell').data(rows);
    $cells.enter().append('td')
      .classed('cell', true)
      .attr('data-title', (d:any) => d.name)
      .style({
        width: this.cellWidth + this.cellPadding + 'px',
        height: this.cellHeight + this.cellPadding + 'px',
      })
      .append('div')
      .classed('mut', true)
      .style({
        height: this.cellMutation + 'px'
      });

    $cells
      .style('background-color', (d:any) => this.c(d.cn))
      .style('border', (d:any) => '1px solid ' + this.cBorder(d.cn));
      //.style('box-shadow', (d:any) => 'inset 0 0 0 ' + this.cellPadding + 'px ' + this.cBor(d.expr >= 2 ? 't' : 'f'));

    $cells.select('.mut')
      .style('background-color', (d:any) => this.cMut(d.dna_mutated));

    $cells.exit().remove();
  }

}

interface IDataFormat {
  id:number;
  geneName: string;
  ensg: string;
  rows: {
    id: string,
    name: string,
    symbol: string,
    cn: string,
    expr: number,
    dna_mutated: string
  }[];
}

export function create(context:IViewContext, selection: ISelection, parent:Element, options?) {
  return new OncoPrint(context, selection, parent, options);
}


