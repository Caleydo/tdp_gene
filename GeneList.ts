/**
 * Created by Samuel Gratzl on 29.01.2016.
 */

import ajax = require('../caleydo_core/ajax');
import idtypes = require('../caleydo_core/idtype');
import {IViewContext, ISelection} from '../targid2/View';
import {ALineUpView, useDefaultLayout, stringCol, categoricalCol} from '../targid2/LineUpView';
import {gene} from './Common';

class GeneList extends ALineUpView {
  private species : string = null;

  constructor(context:IViewContext, selection: ISelection, parent:Element, options?) {
    super(context, parent, options);
    this.species = options && options.species ? options.species : null;
    this.build();
  }

  private build() {
    this.setBusy(true);
    const data = this.species === null ? ajax.getAPIJSON(`/targid/db/${gene.db}/${gene.base}`): ajax.getAPIJSON(`/targid/db/${gene.db}/${gene.base}_filtered`, {species : this.species});
    Promise.all([ajax.getAPIJSON(`/targid/db/${gene.db}/${gene.base}/desc`), data]).then((args) => {
      const desc = args[0];
      const rows : any[] = args[1];
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
  }

  getItemName(count) {
    return (count === 1) ? gene.name.toLowerCase() : gene.name.toLowerCase() + 's';
  }
}

export function createStart(context:IViewContext, selection: ISelection, parent:Element, options?) {
  return new GeneList(context, selection, parent, options);
}
