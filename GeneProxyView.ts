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

  protected getSelectionSelectData(names:string[]):Promise<{value:string, name:string, data:any}[]> {
    if(names === null) {
      return Promise.resolve([]);
    }

    return ajax.getAPIJSON(`/targid/db/${gene.db}/gene_map_ensgs`, {
        ensgs: `'${names.join('\',\'')}'`,
        species: getSelectedSpecies()
      })
      .then((mapping) => {
        // resolve ensg to gene name
        return mapping.map((d) => {
          return {
              value: d.id,
              name: (d.symbol) ? `${d.symbol} (${d.id})` : d.id,
              data: d
            };
        });
      });
  }

}

export function create(context:IViewContext, selection: ISelection, parent:Element, options, plugin: IPluginDesc) {
  return new GeneProxyView(context, selection, parent, options, plugin);
}
