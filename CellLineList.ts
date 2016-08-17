/**
 * Created by Samuel Gratzl on 29.01.2016.
 */

import ajax = require('../caleydo_core/ajax');
import idtypes = require('../caleydo_core/idtype');
import {IViewContext, ISelection} from '../targid2/View';
import {ALineUpView, stringCol, categoricalCol, useDefaultLayout} from '../targid2/LineUpView';
import {chooseDataSource, IDataSourceConfig} from './Common';

class CellLineList extends ALineUpView {
  private species : string = null;

  private sample: IDataSourceConfig;

  constructor(context:IViewContext, selection: ISelection, parent:Element, options?) {
    super(context, parent, options);
    this.sample = chooseDataSource(context.desc);
    this.species = options && options.species ? options.species : null;
    this.build();
  }

  private build() {
    //generate random data
    this.setBusy(true);
    const data = this.species === null ? ajax.getAPIJSON(`/targid/db/${this.sample.db}/${this.sample.base}`): ajax.getAPIJSON(`/targid/db/${this.sample.db}/${this.sample.base}_filtered`, {species : this.species});
    Promise.all([ajax.getAPIJSON(`/targid/db/${this.sample.db}/${this.sample.base}/desc`), data]).then((args) => {
      const desc = args[0];
      const rows : any[] = args[1];
      const columns = [
        stringCol('id', 'Name'),
        categoricalCol('species', desc.columns.species.categories, 'Species'),
        categoricalCol('tumortype', desc.columns.tumortype.categories, 'Tumor Type'),
        categoricalCol('organ', desc.columns.organ.categories, 'Organ'),
        categoricalCol('gender', desc.columns.gender.categories, 'Gender')
      ];
      var lineup = this.buildLineUp(rows, columns, idtypes.resolve(this.sample.idType),(d) => d._id);
      useDefaultLayout(lineup);
      lineup.update();
      this.initializedLineUp();
      this.setBusy(false);
    });
  }

  getItemName(count) {
    return (count === 1) ? this.sample.name.toLowerCase() : this.sample.name.toLowerCase() + 's';
  }
}

export function createStart(context:IViewContext, selection: ISelection, parent:Element, options?) {
  return new CellLineList(context, selection, parent, options);
}
