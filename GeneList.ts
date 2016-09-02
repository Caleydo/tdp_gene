/**
 * Created by Samuel Gratzl on 29.01.2016.
 */

import ajax = require('../caleydo_core/ajax');
import idtypes = require('../caleydo_core/idtype');
import {IViewContext, ISelection} from '../targid2/View';
import {ALineUpView, useDefaultLayout, stringCol, categoricalCol} from '../targid2/LineUpView';
import {gene, IDataSourceConfig} from './Common';
import {showErrorModalDialog} from '../targid2/Dialogs';
import {INamedSet} from '../targid2/storage';

class GeneList extends ALineUpView {
  private namedSet : INamedSet;

  private dataSource: IDataSourceConfig;

  constructor(context:IViewContext, selection: ISelection, parent:Element, options?) {
    super(context, parent, options);
    this.dataSource = gene;
    this.namedSet = options.namedSet;
    this.build();
  }

  /**
   * Get sub type for named sets
   * @returns {{key: string, value: string}}
   */
  protected getSubType() {
    return {
      key: this.namedSet.subTypeKey,
      value: this.namedSet.subTypeValue
    };
  }

  private build() {
    this.setBusy(true);

    var dataPromise;

    if(this.namedSet.subTypeKey && this.namedSet.subTypeKey !== '') {
      const param = {};
      param[this.namedSet.subTypeKey] = this.namedSet.subTypeValue;
      dataPromise = ajax.getAPIJSON(`/targid/db/${this.dataSource.db}/${this.dataSource.base}_filtered`, param);

    } else {
      dataPromise = ajax.getAPIJSON(`/targid/db/${this.dataSource.db}/${this.dataSource.base}`);
    }

    const promise = Promise.all([
        ajax.getAPIJSON(`/targid/db/${this.dataSource.db}/${this.dataSource.base}/desc`),
        dataPromise
      ]);

    // on success
    promise.then((args) => {
      const desc = args[0];
      var rows : any[] = args[1];
      const columns = [
        stringCol('symbol', 'Symbol'),
        stringCol('id', 'Ensembl'),
        stringCol('chromosome', 'Chromosome'),
        categoricalCol('species', desc.columns.species.categories, 'Species'),
        categoricalCol('strand_cat', ['reverse strand', 'forward strand'], 'Strand'),
        categoricalCol('biotype', desc.columns.biotype.categories, 'Biotype'),
        stringCol('seqregionstart', 'Seq Region Start'),
        stringCol('seqregionend', 'Seq Region End')
      ];
      rows.forEach((r) => r.strand_cat = r.strand === -1 ? 'reverse strand' : 'forward strand');

      // if ids filter is set, filter the rows
      if(this.namedSet.ids && this.namedSet.ids.length > 0) {
        rows = this.filterRowsByIds(rows, this.namedSet.ids);
      }

      var lineup = this.buildLineUp(rows, columns, idtypes.resolve(desc.idType),(d) => d._id);

      var r = lineup.data.pushRanking();

      //Show first 6 columns and the rest will only show up in the list of columns that the user can manually add
      columns.slice(0,6).forEach((d) => {
        lineup.data.push(r, d);
      });

      useDefaultLayout(lineup);
      r = lineup.data.getLastRanking().children;
      r[1].setWidth(75);
      r[2].setWidth(75);
      r[3].setWidth(120);
      lineup.update();
      this.initializedLineUp();
      this.setBusy(false);
    });

    // on error
    promise.catch(showErrorModalDialog)
      .catch((error) => {
        console.error(error);
        this.setBusy(false);
      });
  }

  getItemName(count) {
    return (count === 1) ? this.dataSource.name.toLowerCase() : this.dataSource.name.toLowerCase() + 's';
  }
}

export function createStart(context:IViewContext, selection: ISelection, parent:Element, options?) {
  return new GeneList(context, selection, parent, options);
}
