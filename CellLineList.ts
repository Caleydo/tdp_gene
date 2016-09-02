/**
 * Created by Samuel Gratzl on 29.01.2016.
 */

import ajax = require('../caleydo_core/ajax');
import idtypes = require('../caleydo_core/idtype');
import plugins = require('../caleydo_core/plugin');
import {IViewContext, ISelection} from '../targid2/View';
import {ALineUpView, stringCol, categoricalCol, useDefaultLayout} from '../targid2/LineUpView';
import {chooseDataSource, IDataSourceConfig} from './Common';
import {showErrorModalDialog} from '../targid2/Dialogs';

class CellLineList extends ALineUpView {
  private species : string = null;

  private dataSource: IDataSourceConfig;

  constructor(context:IViewContext, selection: ISelection, parent:Element, options?) {
    super(context, parent, options);
    this.dataSource = chooseDataSource(context.desc);
    this.species = options && options.species ? options.species : null;
    this.build();
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

  private build() {
    //generate random data
    this.setBusy(true);
    const data = this.species === null ? ajax.getAPIJSON(`/targid/db/${this.dataSource.db}/${this.dataSource.base}`): ajax.getAPIJSON(`/targid/db/${this.dataSource.db}/${this.dataSource.base}_filtered`, {species : this.species});
    const promise = Promise.all([
        ajax.getAPIJSON(`/targid/db/${this.dataSource.db}/${this.dataSource.base}/desc`),
        data
      ]);

    // on success
    promise.then((args) => {
      const desc = args[0];
      const rows : any[] = args[1];
      const columns = [
        stringCol('id', 'Name'),
        categoricalCol('species', desc.columns.species.categories, 'Species'),
        categoricalCol('tumortype', desc.columns.tumortype.categories, 'Tumor Type'),
        categoricalCol('organ', desc.columns.organ.categories, 'Organ'),
        categoricalCol('gender', desc.columns.gender.categories, 'Gender')
      ];
      var lineup = this.buildLineUp(rows, columns, idtypes.resolve(this.dataSource.idType),(d) => d._id);
      useDefaultLayout(lineup);
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
  return new CellLineList(context, selection, parent, options);
}
