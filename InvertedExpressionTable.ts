/**
 * Created by Marc Streit on 28.07.2016.
 */
/// <reference path='../../tsd.d.ts' />

import ajax = require('../caleydo_core/ajax');
import idtypes = require('../caleydo_core/idtype');
import {IViewContext, ISelection} from '../targid2/View';
import {ALineUpView, stringCol, numberCol2, useDefaultLayout, categoricalCol} from '../targid2/LineUpView';
import {all_types, gene, expression, IDataSourceConfig, chooseDataSource, ParameterFormIds} from './Common';
import {FormBuilder, FormElementType, IFormSelectDesc} from '../targid2/FormBuilder';

class ExpressionTable extends ALineUpView {

  private lineupPromise : Promise<any>;

  private dataSource: IDataSourceConfig;

  private paramForm:FormBuilder;
  private paramDesc:IFormSelectDesc[] = [
    {
      type: FormElementType.SELECT,
      label: 'Data Subtype',
      id: ParameterFormIds.DATA_SUBTYPE,
      options: {
        optionsData: expression.dataSubtypes.map((ds) => {
          return {name: ds.id, value: ds.id, data: ds};
        })
      },
      useSession: true
    },
    {
      type: FormElementType.SELECT,
      label: 'Bio Type',
      id: ParameterFormIds.BIO_TYPE,
      options: {
        optionsData: gene.bioTypes
      },
      useSession: true
    }
  ];

  constructor(context:IViewContext, private selection:ISelection, parent:Element, options?) {
    super(context, parent, options);

    this.dataSource = chooseDataSource(context.desc);
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
    return Promise.all([this.lineupPromise, this.resolveIds(idtype, this.selection.range, this.dataSource.idType)]).then((args) => {
      const names = args[1];
      return ajax.getAPIJSON(`/targid/db/${this.dataSource.db}/expression_table_inverted${this.getParameter(ParameterFormIds.BIO_TYPE) === all_types ? '_all' : ''}`, {
        names: '\''+names.join('\',\'')+'\'',
        data_subtype: this.getParameter(ParameterFormIds.DATA_SUBTYPE).id,
        biotype: this.getParameter(ParameterFormIds.BIO_TYPE)
      });
    }).then((rows) => {

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
          const cols = lineup.data.getColumns().map((d) => d.column);
          const ranking = lineup.data.getRankings()[0];
          const usedCols = ranking.flatColumns;
          //remove old columns
          usedCols.filter((d) => /score_.*/.test(d.desc.column)).filter((d) => !names.has(d.desc.column.slice(6))).forEach((d) => {
            d.removeMe();
          });
          //add new columns
          names.values().filter((d) => cols.indexOf('score_' + d) < 0).forEach((d) => {
            const desc = numberCol2('score_' + d, -3, 3, d);
            lineup.data.pushDesc(desc);
            lineup.data.push(ranking, desc);
          });
          names.forEach((d) => {
            this.updateMapping('score_' + d, data);
          });
        });

        this.setBusy(false);
      }
    });
  }

  private build() {
    //generate random data
    this.setBusy(true);
    this.lineupPromise = Promise.all([ajax.getAPIJSON(`/targid/db/${gene.db}/${gene.base}/desc`), this.resolveIds(this.selection.idtype, this.selection.range, this.dataSource.idType)]).then((args) => {
      const desc= args[0];
      const names = args[1];
      const columns = [
        stringCol('symbol', 'symbol'),
        categoricalCol('species', desc.columns.species.categories),
        categoricalCol('strand_cat', ['reverse strand', 'forward strand']),
        categoricalCol('biotype', desc.columns.biotype.categories)
      ];
      names.forEach((d, i) => {
        columns.push(numberCol2('score_' + d, -3, 3, d));
      });

      var lineup = this.buildLineUp([], columns, idtypes.resolve(gene.idType), (d) => d._id);
      var r = lineup.data.pushRanking();
      lineup.data.push(r, columns[0]);
      names.forEach((d,i) => lineup.data.push(r, columns[i+4]));
      useDefaultLayout(lineup);
      this.initializedLineUp();
      this.setBusy(false);
      return lineup;
    });
  }
}

export function createTable(context:IViewContext, selection: ISelection, parent:Element, options?) {
  return new ExpressionTable(context, selection, parent, options);
}
