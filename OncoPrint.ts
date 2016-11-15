/**
 * Created by Samuel Gratzl on 27.04.2016.
 */
/// <reference path="../../tsd.d.ts" />

import ajax = require('../caleydo_core/ajax');
import {IViewContext, ISelection, AView, IView} from '../targid2/View';
import {all_types, dataSources, copyNumberCat, mutationCat, gene, ParameterFormIds, getSelectedSpecies} from './Common';
import {FormBuilder, FormElementType, IFormSelectDesc} from '../targid2/FormBuilder';
import {showErrorModalDialog} from '../targid2/Dialogs';


const unknownMutationValue = mutationCat[mutationCat.length-1].value;
const unknownCopyNumberValue = copyNumberCat[copyNumberCat.length-1].value;


interface IDataFormatRow {
  name: string;
  symbol: string;
  cn: number;
  expr: number;
  dna_mutated: boolean;
}

interface IDataFormat {
  id:number;
  geneName: string;
  ensg: string;
  alterationFreq: number;
  promise: Promise<IDataFormatRow[]>;
  rows: IDataFormatRow[];
}

function unknownSample(sample: string) {
  return {
    name: sample,
    symbol: '',
    cn: unknownCopyNumberValue, // unknown --> see Common.
    expr: 0,
    dna_mutated: unknownMutationValue // unknown
  };
}


function computeAlterationFrequency(rows: IDataFormatRow[]) {
  if (rows.length === 0) {
    return 0;
  }
  const isMutated = (r: IDataFormatRow) => r.dna_mutated === true;
  const isCopyNumberAltered = (r: IDataFormatRow) => r.cn !== null && r.cn !== 0;
  const hasData = (r: IDataFormatRow) => r.dna_mutated !== null || r.cn !== null;
  // reduce and compute both
  // amplified += 1 if isMutated or isCopyNumberAltered
  // total += if hasData
  const [amplified, total] = rows.reduce(([amplified, total], r) => [amplified + ((isMutated(r) || isCopyNumberAltered(r)) ? 1 : 0), total + (hasData(r) ? 1 : 0)], [0, 0]);
  return amplified / total;
}

const FIRST_IS_NULL = -1;

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

function compareExpression(a: number, b: number) {
  // order: bigger,smaller, NaN
  if (a === b) {
    return 0;
  }
  if (a === undefined || a === null || isNaN(a)) {
    return FIRST_IS_NULL;
  }
  if (b === undefined || b === null || isNaN(b)) {
    return -FIRST_IS_NULL;
  }
  return b - a;
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

function sort(sampleList: string[], ...rows: IDataFormatRow[][]) {
  const rowLookups : Map<string,IDataFormatRow>[] = rows.map((row) => {
    const r = new Map<string,IDataFormatRow>();
    row.forEach((d) => r.set(d.name, d));
    return r;
  });
  //sort such that missing values are in the end
  //hierarchy: cn, mut, expression
  function compare(a: string, b: string) {
    for (let row of rowLookups) {
      let a_row: IDataFormatRow = row.get(a);
      let b_row: IDataFormatRow = row.get(b);
      { // undefined
        if (a_row === b_row) { //e.g. both undefined
          continue;
        }
        if (a_row === undefined || a_row === null) {
          return FIRST_IS_NULL; //for a not defined -> bigger
        }
        if (b_row === undefined || b_row === null) {
          return -FIRST_IS_NULL;
        }
      }
      if (a_row.cn !== b_row.cn) {
        return compareCNV(a_row.cn, b_row.cn);
      }
      if (a_row.dna_mutated !== b_row.dna_mutated) {
        return compareMutation(a_row.dna_mutated, b_row.dna_mutated);
      }
      if (a_row.expr !== b_row.expr) {
        return compareExpression(a_row.expr, b_row.expr);
      }
    }
    // fallback to the name
    return a.localeCompare(b);
  }
  return sampleList.slice().sort(compare);
}

export class OncoPrint extends AView {

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

    cell: {
      height: 25,
      width: 7,
      padding: 2,
      mutation: 8
    }
  };

  private sampleListPromise: Promise<string[]> = null;

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
    const ds = this.getParameter(ParameterFormIds.DATA_SOURCE);
    const tumorType = this.getParameter(ParameterFormIds.TUMOR_TYPE);
    const url = `/targid/db/${ds.db}/onco_print_sample_list${tumorType === all_types ? '_all' : ''}`;
    const param = {
      schema: ds.schema,
      entity_name: ds.entityName,
      table_name: ds.tableName,
      tumortype : tumorType,
      species: getSelectedSpecies()
    };

    return this.sampleListPromise = ajax.getAPIJSON(url, param)
      .then((rows) => rows.map((r) => r.id));
  }

  private loadRows(ensg: string): Promise<IDataFormatRow[]> {
    const ds = this.getParameter(ParameterFormIds.DATA_SOURCE);
    const tumorType = this.getParameter(ParameterFormIds.TUMOR_TYPE);
    return ajax.getAPIJSON(`/targid/db/${ds.db}/onco_print${tumorType === all_types ? '_all' : ''}`, {
      ensgs: '\'' + ensg + '\'',
      schema: ds.schema,
      entity_name: ds.entityName,
      table_name: ds.tableName,
      tumortype: tumorType,
      species: getSelectedSpecies()
    });
  }

  private loadFirstName(ensg: string): Promise<string> {
    const ds = this.getParameter(ParameterFormIds.DATA_SOURCE);
    return ajax.getAPIJSON(`/targid/db/${ds.db}/gene_map_ensgs`, {
      ensgs: '\'' + ensg + '\'',
      species: getSelectedSpecies()
    }).then((r) => r[0].symbol);
  }

  private logErrorAndMarkReady(error: any) {
    console.error(error);
    this.setBusy(false);
  }

  private update(updateAll = false) {
    this.setBusy(true);

    const ids = this.selection.range.dim(0).asList();
    const idtype = this.selection.idtype;

    const data:IDataFormat[] = ids.map((id) => {
      return {id: id, geneName: '', ensg: '', alterationFreq: 0, rows: [], promise: null};
    });

    const $ids = this.$table.selectAll('tr.gene').data(data, (d) => d.id.toString());
    const $ids_enter = $ids.enter().append('tr').classed('gene', true);

    // decide whether to load data for newly added items
    // or to reload the data for all items (e.g. due to parameter change)
    const enterOrUpdateAll = (updateAll) ? $ids : $ids_enter;

    const renderRow = ($id: d3.Selection<IDataFormat>, d: IDataFormat) => {
      console.log(d);
      const promise = this.resolveId(idtype, d.id, gene.idType)
        .then((ensg: string) => {
          d.ensg = ensg;
          return Promise.all<any>([
            this.loadRows(ensg),
            this.loadFirstName(ensg),
            this.sampleListPromise
          ]);
        });

      // on error
      promise.catch(showErrorModalDialog)
        .catch(this.logErrorAndMarkReady.bind(this));

      // on success
      promise.then((input) => {
        d.rows = input[0];
        d.geneName = input[1];
        const samples = input[2];

        this.updateChartData(d, $id, samples);
        this.setBusy(false);
      });
      d.promise = promise;
    };

    enterOrUpdateAll.each(function(d: IDataFormat) {
      renderRow(d3.select(this), d);
    });

    $ids.exit().remove().each(() => this.setBusy(false));
  }

  private updateChartData(data: IDataFormat, $parent: d3.Selection<IDataFormat>, samples: string[]) {
    const style = OncoPrint.STYLE;
    //console.log(data.geneName);
    var rows: IDataFormatRow[] = data.rows;
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
      // TODO extract to CSS
      .style({
        width: style.cell.width + style.cell.padding + 'px',
        height: style.cell.height + style.cell.padding + 'px',
      })
      .append('div')
      .classed('mut', true)
      .style('height', style.cell.mutation + 'px');

    $cells
      .attr('data-title', (d:any) => d.name)
      .style('background-color', (d:any) => style.color(d.cn))
      // TODO extract to CSS except for border-color
      .style('border', (d:any) => '1px solid ' + style.colorBorder(d.cn));
      //.style('box-shadow', (d:any) => 'inset 0 0 0 ' + this.cellPadding + 'px ' + this.cBor(d.expr >= 2 ? 't' : 'f'));

    $cells.select('.mut')
      .style('background-color', (d:any) => style.colorMut(d.dna_mutated || unknownMutationValue));

    $cells.exit().remove();
  }

  private sortCells(sortedSamples: string[]) {
    //name to index
    const lookup = new Map<string, number>();
    sortedSamples.forEach(lookup.set.bind(lookup));

    const $genes = this.$table.selectAll('tr.gene');
    $genes.selectAll('td.cell').sort((a: IDataFormatRow, b: IDataFormatRow) => {
      const a_i = lookup.get(a.name);
      const b_i = lookup.get(b.name);
      // assume both exist
      return a_i - b_i;
    });
  }

  private alignData(rows: IDataFormatRow[], samples: string[]) {
    // build hash map first for faster access
    const hash = new Map<String,IDataFormatRow>();
    rows.forEach((r) => hash.set(r.name, r));

    // align items --> fill missing values up to match sample list
    return samples.map((sample) => {
      // no data found --> add unknown sample
      if (!hash.has(sample)) {
        return unknownSample(sample);
      }
      return hash.get(sample);
    });
  }
}

export function create(context:IViewContext, selection: ISelection, parent:Element, options?) {
  return new OncoPrint(context, selection, parent, options);
}


