/**
 * Created by Marc Streit on 26.07.2016.
 */
/// <reference path='../../tsd.d.ts' />

import ajax = require('../caleydo_core/ajax');
import idtypes = require('../caleydo_core/idtype');
import plugins = require('../caleydo_core/plugin');
import {IViewContext, ISelection} from '../targid2/View';
import {ALineUpView, stringCol, numberCol2, useDefaultLayout, categoricalCol} from '../targid2/LineUpView';
import {dataSources, all_types, expression, copyNumber, mutation, mutationCat, ParameterFormIds, IDataTypeConfig, convertLog2ToLinear} from './Common';
import {FormBuilder, FormElementType, IFormSelectDesc} from '../targid2/FormBuilder';
import {showErrorModalDialog} from '../targid2/Dialogs';

class RawDataTable extends ALineUpView {

  private lineupPromise:Promise<any>;

  private dataType:IDataTypeConfig;

  private paramForm:FormBuilder;
  private paramDesc:IFormSelectDesc[];

  constructor(context:IViewContext, private selection:ISelection, parent:Element, dataType:IDataTypeConfig, options?) {
    super(context, parent, options);
    this.dataType = dataType;
  }

  /**
   * Override the pushScore function to give DataSource to InvertedAggregatedScore factory method
   * @param scorePlugin
   * @param ranking
   */
  pushScore(scorePlugin:plugins.IPlugin, ranking = this.lineup.data.getLastRanking()) {
    //TODO clueify
    Promise.resolve(scorePlugin.factory(scorePlugin.desc, this.getParameter(ParameterFormIds.DATA_SOURCE))) // open modal dialog
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

  changeSelection(selection:ISelection) {
    this.selection = selection;
    return this.update();
  }

  private update() {

    this.setBusy(true);

    const promise1 = Promise.all([
      this.lineupPromise,
      this.resolveIds(this.selection.idtype, this.selection.range, 'Ensembl')
    ]);

    // on error
    promise1.catch(showErrorModalDialog)
      .catch((error) => {
        console.error(error);
        this.setBusy(false);
      });

    // on success
    const promise2 = promise1.then((args) => {
        const genes = args[1];

        return Promise.all([
          ajax.getAPIJSON(`/targid/db/${this.getParameter(ParameterFormIds.DATA_SOURCE).db}/raw_data_table${this.getParameter(ParameterFormIds.TUMOR_TYPE) === all_types ? '_all' : ''}`, {
            ensgs: '\'' + genes.join('\',\'') + '\'',
            schema: this.getParameter(ParameterFormIds.DATA_SOURCE).schema,
            entity_name: this.getParameter(ParameterFormIds.DATA_SOURCE).entityName,
            table_name: this.dataType.tableName,
            data_subtype: this.getParameter(ParameterFormIds.DATA_SUBTYPE).id,
            tumortype: this.getParameter(ParameterFormIds.TUMOR_TYPE)
          }),
          //resolve Ensembl IDs to gene object containing id and symbol
          ajax.getAPIJSON(`/targid/db/${this.getParameter(ParameterFormIds.DATA_SOURCE).db}/gene_map_ensgs`, {
            ensgs: '\'' + genes.join('\',\'') + '\''
          })
        ]);

      });

    // on error
    promise2.catch(showErrorModalDialog)
      .catch((error) => {
        console.error(error);
        this.setBusy(false);
      });

    // on success
    promise2.then((args) => {
        this.updateData(args);
      });

    return promise2;
  }

  private updateData(args) {
    var rows = args[0];
    const mapping = args[1];

    if (this.getParameter(ParameterFormIds.DATA_SUBTYPE).id.indexOf('log2') !== -1) {
      rows = convertLog2ToLinear(rows, 'score');
    }

    // show or hide no data message
    this.$nodata.classed('hidden', rows.length > 0);

    //console.log(rows.length, rows);
    if(rows.length === 0) {
      console.warn('no data --> create a new (empty) LineUp');
      this.lineup.destroy();
      this.build();
      this.lineupPromise.then((d) => {
        this.setBusy(false);
      });

    } else {
      var names = d3.set();
      var symbols = d3.map<string>();

      // fill names and symbols with mapping data
      mapping.forEach((d) => {
        names.add(d.id);
        symbols.set(d.id, d.symbol);
      });

      const data = d3.nest().key((d: any) => d.id).rollup((values: any[]) => {
        const base = values[0];
        values.forEach((row) => {
          base['score_' + row.ensg] = row.score;
        });
        return base;
      }).entries(rows).map((d) => d.values);

      this.withoutTracking(() => {
        var lineup = this.replaceLineUpData(data);
        const ranking = lineup.data.getRankings()[0];
        const usedCols = ranking.flatColumns.filter((d) => /score_.*/.test(d.desc.column));
        const colIds = usedCols.map((d) => d.desc.column);
        const colors = d3.scale.category10().range().slice();
        // remove old colums
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
          var label = symbols.get(d);
          if(!label) {
            label = d;
          }

          var desc;
          if (this.dataType === mutation) {
            desc = categoricalCol('score_' + d, mutationCat.map((d) => d.value), label);
          } else {
            desc = numberCol2('score_' + d, -3, 3, label);
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
  }

  private build() {
    this.setBusy(true);

    this.lineupPromise = Promise.resolve(ajax.getAPIJSON(`/targid/db/${this.getParameter(ParameterFormIds.DATA_SOURCE).db}/${this.getParameter(ParameterFormIds.DATA_SOURCE).base}/desc`))
      .then((desc) => {
        const columns = [
          stringCol('id', 'Name'),
          categoricalCol('species', desc.columns.species.categories),
          categoricalCol('organ', desc.columns.organ.categories),
          categoricalCol('gender', desc.columns.gender.categories)
        ];

        var lineup = this.buildLineUp([], columns, idtypes.resolve(this.getParameter(ParameterFormIds.DATA_SOURCE).idType), (d) => d._id);
        var r = lineup.data.pushRanking();

        lineup.data.push(r, columns[0]);

        useDefaultLayout(lineup);

        lineup.update();
        this.initializedLineUp();
        return lineup;
      });
  }

  getItemName(count: number) {
    return (count === 1) ? this.getParameter(ParameterFormIds.DATA_SOURCE).name.toLowerCase() : this.getParameter(ParameterFormIds.DATA_SOURCE).name.toLowerCase() + 's';
  }
}

export function createExpressionTable(context:IViewContext, selection:ISelection, parent:Element, options?) {
  return new RawDataTable(context, selection, parent, expression, options);
}

export function createCopyNumberTable(context:IViewContext, selection:ISelection, parent:Element, options?) {
  return new RawDataTable(context, selection, parent, copyNumber, options);
}

export function createMutationTable(context:IViewContext, selection:ISelection, parent:Element, options?) {
  return new RawDataTable(context, selection, parent, mutation, options);
}
