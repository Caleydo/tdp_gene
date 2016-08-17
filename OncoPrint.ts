/**
 * Created by Samuel Gratzl on 27.04.2016.
 */
/// <reference path="../../tsd.d.ts" />

import ajax = require('../caleydo_core/ajax');
import {IViewContext, ISelection, AView} from '../targid2/View';
import {all_types, dataSources, copyNumberVariations, mutationStatus, gene, ParameterFormIds} from './Common';
import {FormBuilder, FormElementType, IFormSelectDesc} from '../targid2/FormBuilder';

export class OncoPrint extends AView {

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
    return this.update();
  }

  private build() {
    const $legend = this.$node
      .classed('oncoPrint', true)
      .append('ul').classed('legend', true);

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

  //celllinename, max(cn) as cn, max(log2fpkm) as expr, max(dna_mutated) as dna_mutated
  private updateChart(rows: {id: string, name: string, cn: string, expr: number, dna_mutated: string, symbol: string}[]) {
    // first: group the rows by different keys
    const data2 = d3.nest()
      .key((d:any) => d.symbol).sortKeys(d3.ascending)
      .key((d:any) => d.id).sortKeys(d3.ascending)
      .key((d:any) => d.cn).sortKeys((a:string, b:string) => {
        //console.log(a, b, a == 0, b != 0);
        // sort decending, but put everything with `0` to the end (e.g., [2, -2, 0])
        return (parseInt(a, 10) === 0 && parseInt(b, 10) !== 0) ? 1 : -1;
      })
      .key((d:any) => d.dna_mutated).sortKeys(d3.descending)
      .entries(rows);

    // second: flatten the nested array structure
    const flat = data2.map((d) => {
      // symbol
      return d.values.map((e) => {
        // id
        let values2 = e.values.map((f) => {
          // cn
          return f.values.map((g) => {
            // dna_mutated
            return g.values;

          }).reduce((d1, d2) => d1.concat(d2), []);

        }).reduce((d1, d2) => d1.concat(d2), []);

        return {key: d.key, values: values2};
      });

    }).reduce((d1, d2) => d1.concat(d2), []);

    // data binding
    const marks = this.$node.selectAll('.gene').data(flat);

    // enter
    marks.enter()
      .append('div').classed('gene', true)
      .append('div').classed('geneLabel', true);

    // update
    //marks.style('transform', (d,i) => `translate(0px, ${i* (this.cellHeight + this.cellPadding)}px)`);
    marks.select('.geneLabel').html((d:any) => `${d.values[0].symbol} <span>${d.values[0].id}</span>`);

    const cells = marks.selectAll('.cell').data((d:any) => d.values);
    cells.enter().append('div')
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

    cells
      .style('background-color', (d:any) => this.c(d.cn))
      .style('border', (d:any) => '1px solid ' + this.cBorder(d.cn));
      //.style('box-shadow', (d:any) => 'inset 0 0 0 ' + this.cellPadding + 'px ' + this.cBor(d.expr >= 2 ? 't' : 'f'));

    cells.select('.mut')
      .style('background-color', (d:any) => this.cMut(d.dna_mutated));

    cells.exit().remove();

    // exit
    marks.exit().remove();
  }

  changeSelection(selection:ISelection) {
    this.selection = selection;
    return this.update();
  }

  private update() {
    const idtype = this.selection.idtype;
    this.setBusy(true);

    return this.resolveIds(idtype, this.selection.range, gene.idType).then((names) => {
      return ajax.getAPIJSON(`/targid/db/${this.getParameter(ParameterFormIds.DATA_SOURCE).db}/onco_print${this.getParameter(ParameterFormIds.TUMOR_TYPE) === all_types ? '_all' : ''}`, {
        ensgs: '\''+names.join('\',\'')+'\'',
        tumortype : this.getParameter(ParameterFormIds.TUMOR_TYPE)
      });
    }).then((rows) => {
      this.updateChart(rows);
      this.setBusy(false);
    });
  }

}

export function create(context:IViewContext, selection: ISelection, parent:Element, options?) {
  return new OncoPrint(context, selection, parent, options);
}


