/**
 * Created by Samuel Gratzl on 27.04.2016.
 */

import '../style.scss';

import {IViewContext, ISelection, AView, IView} from 'ordino/src/View';
import {copyNumberCat, mutationCat, unknownCopyNumberValue, unknownMutationValue} from '../constants';
import {FormBuilder, IFormSelectDesc} from 'ordino/src/FormBuilder';
import {showErrorModalDialog} from 'ordino/src/Dialogs';
import * as d3 from 'd3';
import {toSelectOperation} from 'phovea_core/src/idtype/IIDType';
import {SelectOperation} from 'phovea_core/src/idtype';
import IDType from 'phovea_core/src/idtype/IDType';
import Range from 'phovea_core/src/range/Range';
import {none, list as rlist} from 'phovea_core/src/range';
import * as $ from 'jquery';
import 'jquery-ui/ui/widgets/sortable';
import {IFormSerializedElement} from 'ordino/src/form/interfaces';

export interface ISample {
  name: string;
  id: number;
}

export interface IDataFormatRow {
  name: string;
  cn: number;
  expr: number;
  aa_mutated: boolean;
  sampleId: number;
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

function unknownSample(sample: string, sampleId: number): IDataFormatRow {
  return {
    name: sample,
    sampleId,
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

  private sampleListPromise: Promise<ISample[]> = null;

  private paramForm:FormBuilder;

  /**
   * flag if the user specified the gene sorting order
   * @type {boolean}
   */
  private manuallyResorted: boolean = false;

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

  getAllParameters():IFormSerializedElement[] {
    return this.paramForm.getSerializedElements();
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

    this.$node.append('div').attr('class', 'alert alert-info alert-dismissible').attr('role', 'alert').html(`
      <button type="button" class="close" data-dismiss="alert" aria-label="Close"><span aria-hidden="true">&times;</span></button>
      <p>Please note:</p> 
      <ul>
         <li>The indicated copy number states are only estimates, which can be affected by sample purity, ploidy, and other factors.</li>
         <li>The indicated alteration prevalences are only estimates, which can be affected by incomplete data and small sample numbers.</li>
      </ul>
    `);
  }

  protected abstract loadSampleList(): Promise<ISample[]>;
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
      const lookup = new Map<number, IDataFormat>();
      old.forEach((d) => lookup.set(d.id, d));
      if (this.manuallyResorted) {
        //different strategy if already resorted try to keep the original sorting as good as possible
        //keep old + newly added ones
        const existing = old.filter((d) => ids.indexOf(d.id) >= 0);
        const added = ids.filter((id) => !lookup.has(id)).map((id) => empty(id));
        return existing.concat(added);
      }
      return ids.map((id) => lookup.get(id) || empty(id));
    };

    const data:IDataFormat[] = merge(ids, this.$table.selectAll('tr.gene').data());

    const $ids = this.$table.selectAll('tr.gene').data(data, (d) => String(d.id));
    const $idsEnter = $ids.enter().append('tr').classed('gene', true);

    // decide whether to load data for newly added items
    // or to reload the data for all items (e.g. due to parameter change)
    const enterOrUpdateAll = (updateAll) ? $ids : $idsEnter;

    const renderRow = ($id: d3.Selection<IDataFormat>, d: IDataFormat) => {
      const promise = (d.ensg ? Promise.resolve(d.ensg) : this.resolveId(idtype, d.id, this.idType))
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
      const samples : string[] = result.shift().map((d) => d.name);
      const rows =<IDataFormat[]>result;
      if (!this.manuallyResorted) {
        rows.sort(byAlterationFrequency);
      }
      const sortedSamples = sort(samples, rows.map((r) => r.rows));
      const $genes = this.sortCells(sortedSamples);
      if (!this.manuallyResorted) {
        //sort genes=row by frequency
        $genes.sort(byAlterationFrequency);
      }
    });

    $ids.exit().remove().each(() => this.setBusy(false));

    //sortable
    $(this.$table.node()) // jquery
      .sortable({
        handle: 'th.geneLabel',
        axis: 'y',
        items: '> :not(.nodrag)',
        update: () => {
          this.manuallyResorted = true;
          //order has changed trigger a resort
          this.sampleListPromise.then((samples) => {
            const rows = <IDataFormat[]>this.$table.selectAll('tr.gene').data();
            const sortedSamples = sort(samples.map((d) => d.name), rows.map((r) => r.rows));

            this.sortCells(sortedSamples);
          });
        }
    });
  }

  private updateChartData(data: IDataFormat, $parent: d3.Selection<IDataFormat>, samples: ISample[]) {
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
      .on('click', (row) => {
        this.selectSample(row.sampleId, toSelectOperation(<MouseEvent>d3.event));
      })
      .append('div')
      .classed('mut', true);

    $cells
      .attr('data-title', (d) => d.name) //JSON.stringify(d))
      .attr('data-id', (d) => d.sampleId)
      .style('background-color', (d) => style.color(String(d.cn)))
      .style('border-color',(d) => style.colorBorder(String(d.cn)))
      .classed('selected', (d) => this.isSampleSelected(d.sampleId));
      //.style('box-shadow', (d:any) => 'inset 0 0 0 ' + this.cellPadding + 'px ' + this.cBor(d.expr >= 2 ? 't' : 'f'));

    $cells.select('.mut')
      .style('background-color', (d) => style.colorMut(String(isMissingMutation(d.aa_mutated) ? unknownMutationValue : d.aa_mutated)))
      .style('border-color', (d) => style.colorMutBorder(String(isMissingMutation(d.aa_mutated) ? unknownMutationValue : d.aa_mutated)));

    $cells.exit().remove();

    if(rows.length === 0) {
      $parent.append('td').classed('cell', true);
    }
  }

  private isSampleSelected(sampleId: number) {
    const {range} = this.getItemSelection();
    return range.dim(0).contains(sampleId);
  }

  private selectSample(sampleId: number, op: SelectOperation) {
    const {range} = this.getItemSelection();
    const current = range.dim(0);
    let newSelection: Range = null;
    const single = rlist([sampleId]);
    switch(op) {
      case SelectOperation.SET:
        if (current.contains(sampleId)) {
          newSelection = none();
        } else {
          newSelection = single;
        }
        break;
      case SelectOperation.REMOVE:
        newSelection = range.without(single);
        break;
      case SelectOperation.ADD:
        newSelection = range.union(single);
        break;
    }
    this.updateSelectionHighlight(newSelection);
    this.setItemSelection({range: newSelection, idtype: this.getSampleIdType()});
  }

  get itemIDType() {
    return this.getSampleIdType();
  }

  protected updateSelectionHighlight(range: Range) {
    //use plain version to avoid data binding issues
    const table = <HTMLTableElement>this.$table.node();
    if (range.isAll) {
      Array.from(table.querySelectorAll('td.cell')).forEach((c) => c.classList.add('selected'));
      return;
    }

    Array.from(table.querySelectorAll('td.cell')).forEach((c) => c.classList.remove('selected'));
    range.dim(0).forEach((sampleId: number) => {
      Array.from(table.querySelectorAll(`td.cell[data-id="${sampleId}"]`)).forEach((c) => c.classList.add('selected'));
    });
  }

  protected abstract getSampleIdType(): IDType;

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
    return $genes;
  }

  private alignData(rows: IDataFormatRow[], samples: ISample[]) {
    // build hash map first for faster access
    const hash : any= {};
    rows.forEach((r) => hash[r.name] = r);

    // align items --> fill missing values up to match sample list
    return samples.map((sample) => {
      // no data found --> add unknown sample
      if (!(sample.name in hash)) {
        return unknownSample(sample.name, sample.id);
      }
      const r = hash[sample.name];
      r.sampleId = sample.id;
      return r;
    });
  }
}

export default AOncoPrint;


