/**
 * Created by Holger Stitz on 06.12.2016.
 */

import {IViewContext, ISelection} from 'ordino/src/View';
import {ProxyView} from 'ordino/src/ProxyView';
import {IPluginDesc} from 'phovea_core/src/plugin';
import {createOptions} from '../Common';
import {IFormSelectOption} from 'ordino/src/FormBuilder';
import {getSelectedSpecies} from '../Common';

/**
 * helper view for proxying an existing external website
 */
export default class GeneProxyView extends ProxyView {

  protected getSelectionSelectData(ensgs: string[]): Promise<IFormSelectOption[]> {
    return createOptions(ensgs, this.selection, this.idType);
  }

  protected updateProxyView() {
    const extra: any = this.options.extra;
    extra.species = getSelectedSpecies();
    super.updateProxyView();
  }
}

export function create(context: IViewContext, selection: ISelection, parent: Element, options, plugin: IPluginDesc) {
  return new GeneProxyView(context, selection, parent, options, plugin);
}
