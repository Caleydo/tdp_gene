/**
 * Created by Samuel Gratzl on 27.04.2016.
 */

import './style.scss';

import * as ajax from 'phovea_core/src/ajax';
import {IViewContext, ISelection, AView, IView} from '../targid2/View';
import {all_types, dataSources, copyNumberCat, mutationCat, gene, ParameterFormIds, getSelectedSpecies} from './Common';
import {FormBuilder, FormElementType, IFormSelectDesc} from '../targid2/FormBuilder';
import {showErrorModalDialog} from '../targid2/Dialogs';

const unknownMutationValue = mutationCat[mutationCat.length-1].value;
const unknownCopyNumberValue = copyNumberCat[copyNumberCat.length-1].value;

export class OncoPrint extends AView {

  private $table:d3.Selection<IView>;

  private color = d3.scale.ordinal<string>()
    .domain(copyNumberCat.map((d) => String(d.value)))
    .range(copyNumberCat.map((d) => d.color));

  private colorBorder = d3.scale.ordinal<string>()
    .domain(copyNumberCat.map((d) => String(d.value)))
    .range(copyNumberCat.map((d) => d.border));

  private colorMut = d3.scale.ordinal<string>()
    .domain(mutationCat.map((d) => d.value))
    .range(mutationCat.map((d) => d.color));

  private cellHeight = 25;
  private cellWidth = 7;
  private cellPadding = 2;
  private cellMutation = 8;

  private sampleList = [];
  //private sampleListSortIndex = 0;

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
    // load sample list with all available ids, then update the onco print
    this.loadSampleList().then(this.update.bind(this, false));
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
    this.loadSampleList().then(this.update.bind(this,true));
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

    copyNumberCat.forEach((d) => {
      let $li = $legend.append('li').classed('cnv', true);
      $li.append('span').style('background-color', d.color).style('border', '1px solid ' + d.border);
      $li.append('span').text(d.name);
    });

    mutationCat
      //.filter((d) => d.value !=='f')
      .forEach((d) => {
        let $li = $legend.append('li').classed('mut', true);
        $li.append('span').style('background-color', d.color);
        $li.append('span').text(d.name);
      });
  }

  private loadSampleList() {
    const url = `/targid/db/${this.getParameter(ParameterFormIds.DATA_SOURCE).db}/onco_print_sample_list${this.getParameter(ParameterFormIds.TUMOR_TYPE) === all_types ? '_all' : ''}`;
    const param = {
      schema: this.getParameter(ParameterFormIds.DATA_SOURCE).schema,
      entity_name: this.getParameter(ParameterFormIds.DATA_SOURCE).entityName,
      table_name: this.getParameter(ParameterFormIds.DATA_SOURCE).tableName,
      tumortype : this.getParameter(ParameterFormIds.TUMOR_TYPE),
      species: getSelectedSpecies()
    };

    return ajax.getAPIJSON(url, param)
      .then((rows) => {
        this.sampleList = rows.map((r) => r.id);
      });
  }

  private update(updateAll = false) {
    this.setBusy(true);

    const that = this;
    const ids = this.selection.range.dim(0).asList();
    const idtype = this.selection.idtype;

    const data:IDataFormat[] = ids.map((id) => {
      return {id: id, geneName: '', ensg: '', alterationFreq: 0, rows: []};
    });

    const $ids = this.$table.selectAll('tr.gene').data<IDataFormat>(<any>data, (d) => d.id.toString());
    const $ids_enter = $ids.enter().append('tr').classed('gene', true);

    // decide whether to load data for newly added items
    // or to reload the data for all items (e.g. due to parameter change)
    const enterOrUpdateAll = (updateAll) ? $ids : $ids_enter;

    enterOrUpdateAll.each(function(d) {
      const promise = that.resolveId(idtype, d.id, gene.idType)
        .then((name) => {
          return Promise.all([
            d3.select(this),
            name,
            ajax.getAPIJSON(`/targid/db/${that.getParameter(ParameterFormIds.DATA_SOURCE).db}/onco_print${that.getParameter(ParameterFormIds.TUMOR_TYPE) === all_types ? '_all' : ''}`, {
              ensgs: '\''+name+'\'',
              schema: that.getParameter(ParameterFormIds.DATA_SOURCE).schema,
              entity_name: that.getParameter(ParameterFormIds.DATA_SOURCE).entityName,
              table_name: that.getParameter(ParameterFormIds.DATA_SOURCE).tableName,
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
          d.geneName = input[3][0].symbol;
          d.rows = input[2];
          d.ensg = input[1];
          const $id = input[0];

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

  private updateChartData($parent: d3.Selection<IDataFormat>) {

    const data:IDataFormat = $parent.datum();
    //console.log(data.geneName);
    var rows = data.rows;
    rows = this.alignData(rows);
    rows = this.sortData(rows);
    // count amplification/deletions and divide by total nmber of rows
    data.alterationFreq = rows.filter((r) => ((<any>r.cn) !== null && (<any>r.cn) !== 0)).length / rows.length;

    const $th = $parent.selectAll('th.geneLabel').data([data]);
    $th.enter().append('th').classed('geneLabel', true);
    $th.html((d:any) => `<span class="alterationFreq">${d3.format('.0%')(d.alterationFreq)}</span> ${d.geneName} <span class="ensg">${d.ensg}</span>`);
    $th.exit().remove();

    const $cells = $parent.selectAll('td.cell').data(rows);
    $cells.enter().append('td')
      .classed('cell', true)
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
      .attr('data-title', (d:any) => d.name)
      .style('background-color', (d:any) => this.color(d.cn))
      .style('border', (d:any) => '1px solid ' + this.colorBorder(d.cn));
      //.style('box-shadow', (d:any) => 'inset 0 0 0 ' + this.cellPadding + 'px ' + this.cBor(d.expr >= 2 ? 't' : 'f'));

    $cells.select('.mut')
      .style('background-color', (d:any) => this.colorMut(d.dna_mutated || unknownMutationValue));

    $cells.exit().remove();
  }

  private alignData(rows) {
    // build hash map first for faster access
    var hash = {};
    rows.forEach((r) => hash[r.name] = r);

    // align items --> fill missing values up to match sample list
    return this.sampleList.map((sample) => {
      var r = hash[sample];
      // no data found --> add unknown sample
      if (!r) {
        r = {
          id: -1,
          name: sample,
          symbol: '',
          cn: unknownCopyNumberValue, // unknown --> see Common.
          expr: 0,
          dna_mutated: unknownMutationValue // unknown
        };
        //console.log('added sample', sample);
      }
      return r;
    });
  }

  private sortData(rows) {
    return rows;
    /*var sorted = rows2.slice(0, this.sampleListSortIndex);
    const toSort = rows2.slice(this.sampleListSortIndex, rows2.length);

    const toSortDone = copyNumberVariations.map((cn) => cn.value) // get cn values
      .map((cn) => toSort.filter((d) => d.cn === cn)) // filter rows for each cn value
      .reduce((d1, d2) => d1.concat(d2), []); // flatten array to plain list

    toSortDone.forEach((r) => {
      // shift only amplification and deletions
      if(r.cn !== null && r.cn !== 0) {
        this.arrayMove(this.sampleList, this.sampleList.indexOf(r.name), this.sampleListSortIndex);
        this.sampleListSortIndex++;
      }
    });

    return sorted.concat(toSortDone);*/
  }

  /**
   * Moves an element in the given array from an index to another index
   * @param arr
   * @param fromIndex
   * @param toIndex
   */
  //private arrayMove(arr, fromIndex, toIndex) {
  //  var element = arr[fromIndex];
  //  arr.splice(fromIndex, 1);
  //  arr.splice(toIndex, 0, element);
  //}


  //celllinename, max(cn) as cn, max(log2fpkm) as expr, max(dna_mutated) as dna_mutated
  /*private updateChart2(rows: {id: string, name: string, cn: string, expr: number, dna_mutated: string, symbol: string}[]) {
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
      .style('background-color', (d:any) => this.color(d.cn))
      .style('border', (d:any) => '1px solid ' + this.cBorder(d.cn));
      //.style('box-shadow', (d:any) => 'inset 0 0 0 ' + this.cellPadding + 'px ' + this.cBor(d.expr >= 2 ? 't' : 'f'));

    cells.select('.mut')
      .style('background-color', (d:any) => this.cMut(d.dna_mutated));

    cells.exit().remove();

    // exit
    marks.exit().remove();
  }*/

  /*private update2() {
    const idtype = this.selection.idtype;
    this.setBusy(true);

    return this.resolveIds(idtype, this.selection.range, gene.idType).then((names) => {
      return ajax.getAPIJSON(`/targid/db/${this.getParameter(ParameterFormIds.DATA_SOURCE).db}/onco_print${this.getParameter(ParameterFormIds.TUMOR_TYPE) === all_types ? '_all' : ''}`, {
        ensgs: '\''+names.join('\',\'')+'\'',
        tumortype : this.getParameter(ParameterFormIds.TUMOR_TYPE)
      });
    }).then((rows) => {
      this.updateChart2(rows);
      this.setBusy(false);
    });
  }
  */
}

interface IDataFormat {
  id:number;
  geneName: string;
  ensg: string;
  alterationFreq: number;
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


