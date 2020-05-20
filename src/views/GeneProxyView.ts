/**
 * Created by Holger Stitz on 06.12.2016.
 */

import {ProxyView} from 'tdp_core/src/views/ProxyView';
import {createOptions, getSelectedSpecies} from '../common';
import {IFormSelectOption} from 'tdp_core/src/form';

/**
 * helper view for proxying an existing external website
 */
export class GeneProxyView extends ProxyView {

  protected getSelectionSelectData(ensgs: string[]): Promise<IFormSelectOption[]> {
    return createOptions(ensgs, this.selection, this.idType);
  }

  protected updateProxyView() {
    const extra: any = this.options.extra;
    extra.species = getSelectedSpecies();
    super.updateProxyView();
  }
}
