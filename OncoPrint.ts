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

    const that = this;
    const ids = this.selection.range.dim(0).asList();
    const idtype = this.selection.idtype;

    const data:IDataFormat[] = ids.map((id) => {
      return {id: id, geneName: '', ensg: '', alterationFreq: 0, rows: []};
    });

    const $ids = this.$table.selectAll('tr.gene').data(data, (d) => d.id.toString());
    const $ids_enter = $ids.enter().append('tr').classed('gene', true);

    // decide whether to load data for newly added items
    // or to reload the data for all items (e.g. due to parameter change)
    const enterOrUpdateAll = (updateAll) ? $ids : $ids_enter;

    enterOrUpdateAll.each(function(d: IDataFormat, i: number) {
      const $id = d3.select(this);
      const promise = that.resolveId(idtype, d.id, gene.idType)
        .then((ensg: string) => {
          d.ensg = ensg;
          const loadedData = that.loadRows(ensg);
          return Promise.all<any>([
            loadedData,
            that.loadFirstName(ensg),
            this.sampleListPromise
          ]);
        });

      // on error
      promise.catch(showErrorModalDialog)
        .catch(that.logErrorAndMarkReady.bind(this));

      // on success
      promise.then((input) => {
        d.rows = input[0];
        d.geneName = input[1];
        const sortedSamples = input[2];

        //console.log('loaded data for', d);
        that.updateChartData(d, $id, sortedSamples);
        that.setBusy(false);
      });
    });


    $ids.exit().remove().each(() => this.setBusy(false));
  }

  private static computeAlterationFrequency(rows: IDataFormatRow[]) {
    const isMutated = (r: IDataFormatRow) => r.dna_mutated === true;
    const isCopyNumberAltered = (r: IDataFormatRow) => r.cn !== null && r.cn !== 0;
    const hasData = (r: IDataFormatRow) => r.dna_mutated !== null || r.cn !== null;
    // reduce and compute both
    // amplified += 1 if isMutated or isCopyNumberAltered
    // total += if hasData
    const [amplified, total] = rows.reduce(([amplified, total], r) => [amplified + ((isMutated(r) || isCopyNumberAltered(r)) ? 1 : 0), total + (hasData(r) ? 1 : 0)], [0, 0]);
    return amplified / total;
  }

  private updateChartData(data: IDataFormat, $parent: d3.Selection<IDataFormat>, samples: string[]) {

    //console.log(data.geneName);
    var rows: IDataFormatRow[] = data.rows;
    rows = this.alignData(rows, samples);

    // count amplification/deletions and divide by total number of rows
    data.alterationFreq = OncoPrint.computeAlterationFrequency(rows);

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

  private alignData(rows: IDataFormatRow[], samples: string[]) {
    // build hash map first for faster access
    var hash = {};
    rows.forEach((r) => hash[r.name] = r);

    // align items --> fill missing values up to match sample list
    return samples.map((sample) => {
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
}

interface IDataFormatRow {
  id: string;
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
  rows: IDataFormatRow[];
}

export function create(context:IViewContext, selection: ISelection, parent:Element, options?) {
  return new OncoPrint(context, selection, parent, options);
}


