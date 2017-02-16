/**
 * Created by Samuel Gratzl on 27.04.2016.
 */

import './style.scss';

import {IViewContext, ISelection, AView, IView} from 'ordino/src/View';
import {allTypes, dataSources, copyNumberCat, mutationCat, gene, ParameterFormIds, getSelectedSpecies, unknownCopyNumberValue, unknownMutationValue} from '../Common';
import {FormBuilder, FormElementType, IFormSelectDesc} from 'ordino/src/FormBuilder';
import {showErrorModalDialog} from 'ordino/src/Dialogs';
import * as d3 from 'd3';


export interface IDataFormatRow {
  name: string;
  symbol: string;
  cn: number;
  expr: number;
  aa_mutated: boolean;
}

export interface IDataFormat {
  id:number;
  geneName: string;
  ensg: string;
  alterationFreq: number;
  //with loaded rows
  promise: Promise<IDataFormat>;
  rows: IDataFormatRow[];
}

function unknownSample(sample: string): IDataFormatRow {
  return {
    name: sample,
    symbol: '',
    cn: unknownCopyNumberValue, // unknown --> see Common.
    expr: 0,
    aa_mutated: unknownMutationValue // unknown
  };
}

function isMissingMutation(v : boolean) {
  return v === null || v === unknownMutationValue;
}

function isMissingCNV(v : number) {
  return v === null || v === unknownCopyNumberValue;
}

function computeAlterationFrequency(rows: IDataFormatRow[]) {
  if (rows.length === 0) {
    return 0;
  }
  const isMutated = (r: IDataFormatRow) => !isMissingMutation(r.aa_mutated) && r.aa_mutated === true;
  const isCopyNumberAltered = (r: IDataFormatRow) => !isMissingCNV(r.cn) && r.cn !== 0;
  const hasData = (r: IDataFormatRow) => !isMissingMutation(r.aa_mutated) || !isMissingCNV(r.cn);
  // reduce and compute both
  // amplified += 1 if isMutated or isCopyNumberAltered
  // total += if hasData
  const [amplified, total] = rows.reduce(([amplified, total], r) => [amplified + ((isMutated(r) || isCopyNumberAltered(r)) ? 1 : 0), total + (hasData(r) ? 1 : 0)], [0, 0]);
  //console.log(amplified, total);
  return (total === 0) ? 0 : amplified / total; // handle division by 0
}

const FIRST_IS_NULL = 1; //null at the end

function compareCNV(a: number, b: number) {
  // order: >0, <0, 0, NaN
  if (a === b) {
    return 0;
  }
  if (a === undefined || a === null || isNaN(a)) {
    return FIRST_IS_NULL;
  }
  if (b === undefined || b === null || isNaN(b)) {
    return -FIRST_IS_NULL;
  }
  if (a > 0) { // b is 0 or < 0
    return -1;
  }
  if (b > 0) { // a is 0 or < 0
    return 1;
  }
  if (a < 0) { // b is 0
    return -1;
  }
  if (b < 0) { // a is 0
    return 1;
  }
  return 0;
}

function compareMutation(a: boolean, b: boolean) {
  // order: true, false, null
  if (a === b) {
    return 0;
  }
  if (a === undefined || a === null) {
    return FIRST_IS_NULL;
  }
  if (b === undefined || b === null) {
    return -FIRST_IS_NULL;
  }
  return a ? -1 : +1;
}

function sort(sampleList: string[], rows: IDataFormatRow[][]) {
  const rowLookups : any[] = rows.map((row) => {
    const r = {};
    row.forEach((d) => r[d.name] = d);
    return r;
  });
  //sort such that missing values are in the end
  //hierarchy: cn, mut, expression
  function compare(a: string, b: string) {
    for (const row of rowLookups) {
      const aRow: IDataFormatRow = row[a];
      const bRow: IDataFormatRow = row[b];
      { // undefined
        if (aRow === bRow) { //e.g. both undefined
          continue;
        }
        if (aRow === undefined || aRow === null) {
          return FIRST_IS_NULL; //for a not defined -> bigger
        }
        if (bRow === undefined || bRow === null) {
          return -FIRST_IS_NULL;
        }
      }
      //first condition can be false positive, null vs 'null', so if both are missing don't compare
      if (aRow.cn !== bRow.cn && !(isMissingCNV(aRow.cn) && isMissingCNV(bRow.cn))) {
        return compareCNV(aRow.cn, bRow.cn);
      }
      if (aRow.aa_mutated !== bRow.aa_mutated && !(isMissingMutation(aRow.aa_mutated) && isMissingMutation(bRow.aa_mutated))) {
        return compareMutation(aRow.aa_mutated, bRow.aa_mutated);
      }
      // ignore not encoded expression value
      // if (a_row.expr !== b_row.expr) {
      //  return compareExpression(a_row.expr, b_row.expr);
      //}
    }
    // fallback to the name
    return a.localeCompare(b);
  }
  return sampleList.slice().sort(compare);
}

function byAlterationFrequency(a: IDataFormat, b: IDataFormat) {
  const aFrequency = a && a.alterationFreq !== undefined ? a.alterationFreq : 0;
  const bFrequency = b && b.alterationFreq !== undefined ? b.alterationFreq : 0;
  return bFrequency - aFrequency;
}

export abstract class AOncoPrint extends AView {

  private $table:d3.Selection<IView>;

  private static STYLE = {
    color: d3.scale.ordinal<string>()
      .domain(copyNumberCat.map((d) => String(d.value)))
      .range(copyNumberCat.map((d) => d.color)),
    colorBorder: d3.scale.ordinal<string>()
      .domain(copyNumberCat.map((d) => String(d.value)))
      .range(copyNumberCat.map((d) => d.border)),
    colorMut: d3.scale.ordinal<string>()
      .domain(mutationCat.map((d) => d.value))
      .range(mutationCat.map((d) => d.color)),
    colorMutBorder: d3.scale.ordinal<string>()
      .domain(mutationCat.map((d) => String(d.value)))
      .range(mutationCat.map((d) => d.border))
  };

  private sampleListPromise: Promise<string[]> = null;

  private paramForm:FormBuilder;

  constructor(context:IViewContext, private selection: ISelection, parent:Element, options?) {
    super(context, parent, options);
  }

  init() {
    super.init();
    this.build();
    // load sample list with all available ids, then update the onco print
    this.sampleListPromise = this.loadSampleList();
    this.sampleListPromise.then(this.update.bind(this, false));
  }

  buildParameterUI($parent: d3.Selection<any>, onChange: (name: string, value: any)=>Promise<any>) {
    this.paramForm = new FormBuilder($parent);

    const paramDesc = this.buildParameterConfig();
    // map FormElement change function to provenance graph onChange function
    paramDesc.forEach((p) => {
      p.options.onChange = (selection, formElement) => onChange(formElement.id, selection.value);
    });

    this.paramForm.build(paramDesc);

    // add other fields
    super.buildParameterUI($parent, onChange);
  }

  protected abstract buildParameterConfig(): IFormSelectDesc[];

  getParameter(name: string): any {
    return this.paramForm.getElementById(name).value.data;
  }

  setParameter(name: string, value: any) {
    this.paramForm.getElementById(name).value = value;
    this.sampleListPromise = this.loadSampleList();
    this.sampleListPromise.then(this.update.bind(this,true));
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

    const $legend = this.$node.append('div').classed('legend', true);

    const $cnLegend = $legend.append('ul');
    $cnLegend.append('li').classed('title', true).text('Copy Number');

    copyNumberCat.forEach((d) => {
      const $li = $cnLegend.append('li').classed('cnv', true);
      $li.append('span').style('background-color', d.color).style('border', '1px solid ' + d.border);
      $li.append('span').text(d.name);
    });

    const $mutLegend = $legend.append('ul');
    $mutLegend.append('li').classed('title', true).text('Mutation');

    mutationCat
      //.filter((d) => d.value !=='f')
      .forEach((d) => {
        const $li = $mutLegend.append('li').classed('mut', true);
        $li.append('span').style('background-color', d.color).style('border', '1px solid ' + d.border);
        $li.append('span').text(d.name);
      });
  }

  protected abstract loadSampleList(): Promise<string[]>;
  protected abstract loadRows(ensg: string): Promise<IDataFormatRow[]>;

  protected abstract loadFirstName(ensg: string): Promise<string>;

  private logErrorAndMarkReady(error: any) {
    console.error(error);
    this.setBusy(false);
  }

  private update(updateAll = false) {
    this.setBusy(true);

    const ids = this.selection.range.dim(0).asList();
    const idtype = this.selection.idtype;

    const empty = (id) => ({id, geneName: '', ensg: '', alterationFreq: 0, rows: [], promise: null});
    // merge the old rows with the current selection
    const merge = (ids: number[], old: IDataFormat[]) => {
      if (old.length === 0) {
        return ids.map(empty);
      }
      const lookup: any = {};
      old.forEach((d) => lookup[d.id] = d);
      return ids.map((id) => lookup[id] || empty(id));
    };

    const data:IDataFormat[] = merge(ids, this.$table.selectAll('tr.gene').data());

    const $ids = this.$table.selectAll('tr.gene').data(data, (d) => String(d.id));
    const $idsEnter = $ids.enter().append('tr').classed('gene', true);

    // decide whether to load data for newly added items
    // or to reload the data for all items (e.g. due to parameter change)
    const enterOrUpdateAll = (updateAll) ? $ids : $idsEnter;

    const renderRow = ($id: d3.Selection<IDataFormat>, d: IDataFormat) => {
      const promise = (d.ensg ? Promise.resolve(d.ensg) : this.resolveId(idtype, d.id, gene.idType))
        .then((ensg: string) => {
          d.ensg = ensg;
          return Promise.all<any>([
            this.loadRows(ensg), // load always may have changed
            d.geneName || this.loadFirstName(ensg),
            this.sampleListPromise
          ]);
        });

      // on error
      promise.catch(showErrorModalDialog)
        .catch(this.logErrorAndMarkReady.bind(this));

      // on success
      d.promise = promise.then((input) => {
        d.rows = input[0];
        d.geneName = input[1];
        const samples = input[2];

        this.updateChartData(d, $id, samples);
        this.setBusy(false);
        return d;
      });
    };

    enterOrUpdateAll.each(function(d: IDataFormat) {
      renderRow(d3.select(this), d);
    });

    //assume that all data will have a promise
    // wait for all data and then sort the things
    Promise.all([<Promise<any>>this.sampleListPromise].concat(data.map((d) => d.promise))).then((result: any[]) => {
      const samples : string[] = result.shift();
      const rows =<IDataFormat[]>result;
      rows.sort(byAlterationFrequency);
      const sortedSamples = sort(samples, rows.map((r) => r.rows));
      this.sortCells(sortedSamples);
    });

    $ids.exit().remove().each(() => this.setBusy(false));
  }

  private updateChartData(data: IDataFormat, $parent: d3.Selection<IDataFormat>, samples: string[]) {
    const style = AOncoPrint.STYLE;
    //console.log(data.geneName);
    let rows: IDataFormatRow[] = data.rows;
    rows = this.alignData(rows, samples);

    // count amplification/deletions and divide by total number of rows
    data.alterationFreq = computeAlterationFrequency(rows);

    const $th = $parent.selectAll('th.geneLabel').data([data]);
    $th.enter().append('th').classed('geneLabel', true);
    $th.html((d:any) => `<span class="alterationFreq">${d3.format('.0%')(d.alterationFreq)}</span> ${d.geneName} <span class="ensg">${d.ensg}</span>`);
    $th.exit().remove();

    const $cells = $parent.selectAll('td.cell').data(rows);
    $cells.enter().append('td')
      .classed('cell', true)
      .append('div')
      .classed('mut', true);

    $cells
      .attr('data-title', (d:any) => d.name) //JSON.stringify(d))
      .style('background-color', (d:any) => style.color(d.cn))
      .style('border-color', (d:any) => style.colorBorder(d.cn));
      //.style('box-shadow', (d:any) => 'inset 0 0 0 ' + this.cellPadding + 'px ' + this.cBor(d.expr >= 2 ? 't' : 'f'));

    $cells.select('.mut')
      .style('background-color', (d:any) => style.colorMut(String(isMissingMutation(d.aa_mutated) ? unknownMutationValue : d.aa_mutated)))
      .style('border-color', (d:any) => style.colorMutBorder(String(isMissingMutation(d.aa_mutated) ? unknownMutationValue : d.aa_mutated)));

    $cells.exit().remove();

    if(rows.length === 0) {
      $parent.append('td').classed('cell', true);
    }
  }

  private sortCells(sortedSamples: string[]) {
    //name to index
    const lookup : any= {};
    sortedSamples.forEach((d,i) => lookup[d] = i);

    const $genes = this.$table.selectAll('tr.gene');
    $genes.selectAll('td.cell').sort((a: IDataFormatRow, b: IDataFormatRow) => {
      const aIndex = lookup[a.name];
      const bIndex = lookup[b.name];
      // assume both exist
      return aIndex - bIndex;
    });
    $genes.sort(byAlterationFrequency);
  }

  private alignData(rows: IDataFormatRow[], samples: string[]) {
    // build hash map first for faster access
    const hash : any= {};
    rows.forEach((r) => hash[r.name] = r);

    // align items --> fill missing values up to match sample list
    return samples.map((sample) => {
      // no data found --> add unknown sample
      if (!(sample in hash)) {
        return unknownSample(sample);
      }
      return hash[sample];
    });
  }
}

export default AOncoPrint;


