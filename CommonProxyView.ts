/**
 * Created by Holger Stitz on 06.12.2016.
 */

import ajax = require('../caleydo_core/ajax');
import {IViewContext, ISelection} from '../targid2/View';
import {ProxyView} from '../targid2/ProxyView';
import {IPluginDesc} from '../caleydo_core/plugin';
import {gene, getSelectedSpecies} from './Common';

/**
 * helper view for proxying an existing external website
 */
export class CommonProxyView extends ProxyView {

  constructor(context:IViewContext, selection: ISelection, parent:Element, options:any, plugin: IPluginDesc) {
    super(context, selection, parent, options, plugin);
  }


  /**
   * Override to filter names by specific rules
   * @param names
   * @returns {string[]}
   */
  protected filterSelectedNames(names:string[]):string[] {
    //FIXME HACK for UnitProt
    //filter 'AO*' UnitPort IDs that are not valid for external canSAR database
    return names.filter(d => d.indexOf('A0') !== 0);
  }

  protected getSelectionDropDownLabels(names:string[]):Promise<string[]> {
    return ajax.getAPIJSON(`/targid/db/${gene.db}/gene_map_ensgs`, {
        ensgs: `'${names.join('\',\'')}'`,
        species: getSelectedSpecies()
      })
      .then((mapping) => {
        // resolve ensg to gene name
        return mapping.map((d, i) => `${d.symbol} (${names[i]})`);
      });
  }

}

export function create(context:IViewContext, selection: ISelection, parent:Element, options, plugin: IPluginDesc) {
  return new CommonProxyView(context, selection, parent, options, plugin);
}
