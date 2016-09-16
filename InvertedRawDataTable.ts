/**
 * Created by Marc Streit on 28.07.2016.
 */
/// <reference path='../../tsd.d.ts' />

import ajax = require('../caleydo_core/ajax');
import idtypes = require('../caleydo_core/idtype');
import plugins = require('../caleydo_core/plugin');
import {IViewContext, ISelection} from '../targid2/View';
import {ALineUpView, stringCol, numberCol2, useDefaultLayout, categoricalCol} from '../targid2/LineUpView';
import {all_bio_types, gene, expression, copyNumber, mutation, mutationCat, IDataSourceConfig, IDataTypeConfig, chooseDataSource, ParameterFormIds, convertLog2ToLinear} from './Common';
import {FormBuilder, FormElementType, IFormSelectDesc} from '../targid2/FormBuilder';
import {showErrorModalDialog} from '../targid2/Dialogs';

class InvertedRawDataTable extends ALineUpView {

  private lineupPromise : Promise<any>;

  private dataSource: IDataSourceConfig;
  private dataType:IDataTypeConfig;

  private paramForm:FormBuilder;
  private paramDesc:IFormSelectDesc[];

  constructor(context:IViewContext, private selection:ISelection, parent:Element, dataType:IDataTypeConfig, options?) {
    super(context, parent, options);

    this.dataSource = chooseDataSource(context.desc);
    this.dataType = dataType;
  }

  /**
   * Override the pushScore function to give DataSource to InvertedAggregatedScore factory method
   * @param scorePlugin
   * @param ranking
   */
  pushScore(scorePlugin:plugins.IPlugin, ranking = this.lineup.data.getLastRanking()) {
    //TODO clueify
    Promise.resolve(scorePlugin.factory(scorePlugin.desc, this.dataSource)) // open modal dialog
      .then((scoreImpl) => { // modal dialog is closed and score created
        this.startScoreComputation(scoreImpl, scorePlugin, ranking);
      });
  }

  init() {
    this.build();
    this.update();
  }

  buildParameterUI($parent: d3.Selection<any>, onChange: (name: string, value: any)=>Promise<any>) {
    this.paramForm = new FormBuilder($parent);

    this.paramDesc = [
      {
        type: FormElementType.SELECT,
        label: 'Data Subtype',
        id: ParameterFormIds.DATA_SUBTYPE,
        options: {
          optionsData: this.dataType.dataSubtypes.map((ds) => {
            return {name: ds.name, value: ds.id, data: ds};
          })
        },
        useSession: true
      },
      {
        type: FormElementType.SELECT,
        label: 'Bio Type',
        id: ParameterFormIds.BIO_TYPE,
        options: {
          optionsData: gene.bioTypesWithAll
        },
        useSession: true
      }
    ];

    // map FormElement change function to provenance graph onChange function
    this.paramDesc.forEach((p) => {
      p.options.onChange = (selection, formElement) => onChange(formElement.id, selection.value);
    });

    this.paramForm.build(this.paramDesc);

    // add other fields
    super.buildParameterUI($parent.select('form'), onChange);
  }

  getParameter(name: string): any {
    return this.paramForm.getElementById(name).value.data;
  }

  setParameter(name: string, value: any) {
    this.paramForm.getElementById(name).value = value;
    return this.update();
  }

  changeSelection(selection: ISelection) {
    this.selection = selection;
    return this.update();
  }

  private update() {
    const idtype = this.selection.idtype;

    this.setBusy(true);

    const promise1 = Promise.all([
        this.lineupPromise,
        this.resolveIds(idtype, this.selection.range, this.dataSource.idType)
      ]);

    // on error
    promise1.catch(showErrorModalDialog)
      .catch((error) => {
        console.error(error);
        this.setBusy(false);
      });

    // on success
    const promise2 = promise1.then((args) => {
        const names = args[1];
        return ajax.getAPIJSON(`/targid/db/${this.dataSource.db}/raw_data_table_inverted${this.getParameter(ParameterFormIds.BIO_TYPE) === all_bio_types ? '_all' : ''}`, {
          names: '\''+names.join('\',\'')+'\'',
          schema: this.dataSource.schema,
          entity_name: this.dataSource.entityName,
          table_name: this.dataType.tableName,
          data_subtype: this.getParameter(ParameterFormIds.DATA_SUBTYPE).id,
          biotype: this.getParameter(ParameterFormIds.BIO_TYPE)
        });
      });

    // on error
    promise2.catch(showErrorModalDialog)
      .catch((error) => {
        console.error(error);
        this.setBusy(false);
      });

    // on success
    promise2.then((rows) => { this.updateRows(rows); });

    return promise2;
  }

  private updateRows(rows) {
    // show or hide no data message
    this.$nodata.classed('hidden', rows.length > 0);

    if (this.getParameter(ParameterFormIds.DATA_SUBTYPE).useForAggregation.indexOf('log2') !== -1) {
      rows = convertLog2ToLinear(rows, 'score');
    }

    //console.log(rows.length, rows);
    if(rows.length === 0) {
      console.warn('no data --> create a new (empty) LineUp');
      this.lineup.destroy();
      this.build();
      this.lineupPromise.then((d) => {
        this.setBusy(false);
      });

      return;
    }

    var names = d3.set();

    const data = d3.nest().key((d: any) => d.id).rollup((values: any[]) => {
      const base = values[0];
      base.strand_cat = base.strand === -1 ? 'reverse strand' : 'forward strand';
      values.forEach((row) => {
        base['score_' + row.name] = row.score;
        names.add(row.name);
      });
      return base;
    }).entries(rows).map((d) => d.values);

    this.withoutTracking(() => {
      var lineup = this.replaceLineUpData(data);
      //const cols = lineup.data.getColumns().map((d) => d.column);
      const ranking = lineup.data.getRankings()[0];
      const usedCols = ranking.flatColumns.filter((d) => /score_.*/.test(d.desc.column));
      const colIds = usedCols.map((d) => d.desc.column);
      const colors = d3.scale.category10().range().slice();

      // remove old columns
      usedCols
        // remove colors that are already in use from the list
        .map((d) => {
          colors.splice(colors.indexOf(d.color), 1);
          return d;
        })
        .filter((d) => !names.has(d.desc.column.slice(6)))
        // remove columns
        .forEach((d) => {
          d.removeMe();
        });

      // add new columns
      names.values().filter((d) => colIds.indexOf('score_' + d) < 0).forEach((d, i) => {

        var desc;
        if (this.dataType === mutation) {
          desc = categoricalCol('score_' + d, mutationCat.map((d) => d.value), d);
        } else {
          desc = numberCol2('score_' + d, -3, 3, d);
        }

        desc.color = colors.shift(); // get and remove color from list
        lineup.data.pushDesc(desc);
        lineup.data.push(ranking, desc);
      });
      names.forEach((d) => {
        this.updateMapping('score_' + d, data);
      });
    });

    this.updateLineUpStats();
    this.setBusy(false);
  }

  private build() {
    //generate random data
    this.setBusy(true);
    this.lineupPromise = Promise.all([ajax.getAPIJSON(`/targid/db/${gene.db}/${gene.base}/desc`), this.resolveIds(this.selection.idtype, this.selection.range, this.dataSource.idType)]).then((args) => {
      const desc= args[0];
      const names = args[1];
      const columns = [
        stringCol('symbol', 'Symbol'),
        stringCol('id', 'Ensembl'), // BUG: will not be shown
        stringCol('chromosome', 'Chromosome'),
        categoricalCol('species', desc.columns.species.categories, 'Species'),
        categoricalCol('strand_cat', ['reverse strand', 'forward strand'], 'Strand'),
        categoricalCol('biotype', desc.columns.biotype.categories, 'Biotype'),
        stringCol('seqregionstart', 'Seq Region Start'),
        stringCol('seqregionend', 'Seq Region End')
      ];
      const defaultColLength = columns.length;
      names.forEach((d, i) => {
        columns[columns.length] = numberCol2('score_' + d, -3, 3, d);
      });

      var lineup = this.buildLineUp([], columns, idtypes.resolve(gene.idType), (d) => d._id);

      var r = lineup.data.pushRanking();
      //Show first 2 columns and the rest will only show up in the list of columns that the user can manually add
      columns.slice(0,2).forEach((d) => {
        lineup.data.push(r, d);
      });
      names.forEach((d,i) => lineup.data.push(r, columns[i+defaultColLength]));

      useDefaultLayout(lineup);
      r = lineup.data.getLastRanking().children;
      r[1].setWidth(75);
      r[2].setWidth(75);
      r[3].setWidth(120);
      lineup.update();
      this.initializedLineUp();

      return lineup;
    });
  }

  getItemName(count: number) {
    return (count === 1) ? gene.name.toLowerCase() : gene.name.toLowerCase() + 's';
  }
}

export function createExpressionTable(context:IViewContext, selection:ISelection, parent:Element, options?) {
  return new InvertedRawDataTable(context, selection, parent, expression, options);
}

export function createCopyNumberTable(context:IViewContext, selection:ISelection, parent:Element, options?) {
  return new InvertedRawDataTable(context, selection, parent, copyNumber, options);
}

export function createMutationTable(context:IViewContext, selection:ISelection, parent:Element, options?) {
  return new InvertedRawDataTable(context, selection, parent, mutation, options);
}
