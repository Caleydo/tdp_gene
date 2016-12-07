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
export class GeneProxyView extends ProxyView {

  constructor(context:IViewContext, selection: ISelection, parent:Element, options:any, plugin: IPluginDesc) {
    super(context, selection, parent, options, plugin);
  }

  protected getSelectionDropDownLabels(names:string[]):Promise<{id:string, label:string}[]> {
    return ajax.getAPIJSON(`/targid/db/${gene.db}/gene_map_ensgs`, {
        ensgs: `'${names.join('\',\'')}'`,
        species: getSelectedSpecies()
      })
      .then((mapping) => {
        // resolve ensg to gene name
        return mapping.map((d) => {
          return {id: d.id, label: `${d.symbol} (${d.id})`};
        });
      });
  }

}

export function create(context:IViewContext, selection: ISelection, parent:Element, options, plugin: IPluginDesc) {
  return new GeneProxyView(context, selection, parent, options, plugin);
}
