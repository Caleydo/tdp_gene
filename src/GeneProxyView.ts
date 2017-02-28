/**
 * Created by Holger Stitz on 06.12.2016.
 */

import * as ajax from 'phovea_core/src/ajax';
import {IViewContext, ISelection} from 'ordino/src/View';
import {ProxyView} from 'ordino/src/ProxyView';
import {IPluginDesc} from 'phovea_core/src/plugin';
import {gene, getSelectedSpecies} from './Common';

/**
 * helper view for proxying an existing external website
 */
export class GeneProxyView extends ProxyView {

  constructor(context:IViewContext, selection: ISelection, parent:Element, options:any, plugin: IPluginDesc) {
    super(context, selection, parent, options, plugin);
  }

  protected async getSelectionSelectData(names:string[]):Promise<{value:string, name:string, data:any}[]> {
    if(names === null) {
      return Promise.resolve([]);
    }

    const mapping: {id: string, symbol: string}[] = await ajax.getAPIJSON(`/targid/db/${gene.db}/gene_map_ensgs`, {
        ensgs: `'${names.join('\',\'')}'`,
        species: getSelectedSpecies()
      });
    // resolve ensg to gene name
    return mapping.map((d) => {
      return {
          value: d.id,
          name: (d.symbol) ? `${d.symbol} (${d.id})` : d.id,
          data: d
        };
    });
  }

}

export function create(context:IViewContext, selection: ISelection, parent:Element, options, plugin: IPluginDesc) {
  return new GeneProxyView(context, selection, parent, options, plugin);
}
