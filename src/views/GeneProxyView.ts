/**
 * Created by Holger Stitz on 06.12.2016.
 */

import {IViewContext, ISelection} from 'ordino/src/View';
import {ProxyView} from 'ordino/src/ProxyView';
import {IPluginDesc} from 'phovea_core/src/plugin';
import {selectReadableIDType} from '../Common';
import {IFormSelectOption} from 'ordino/src/FormBuilder';

/**
 * helper view for proxying an existing external website
 */
export default class GeneProxyView extends ProxyView {

  protected getSelectionSelectData(ensgs: string[]): Promise<IFormSelectOption[]> {
    if (ensgs === null || ensgs.length === 0) {
      return Promise.resolve([]);
    }
    const idType = this.selection.idtype;
    return selectReadableIDType(idType).then((target) => {
      if (!target) {
        return ensgs.map((ensg) => ({value: ensg, name: ensg, data: ensg}));
      }
      // map and use names
      return idType.mapToFirstName(this.selection.range, target).then((names) => {
        return names.map((name, i) => ({
          value: ensgs[i],
          name: name ? `${name} (${ensgs[i]})` : ensgs[i],
          data: ensgs[i]
        }));
      });
    });
  }
}

export function create(context: IViewContext, selection: ISelection, parent: Element, options, plugin: IPluginDesc) {
  return new GeneProxyView(context, selection, parent, options, plugin);
}
