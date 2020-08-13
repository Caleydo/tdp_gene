/**
 * Created by Holger Stitz on 06.12.2016.
 */

import {ProxyView} from 'tdp_core';
import {SpeciesUtils} from '../common/common';
import {IFormSelectOption} from 'tdp_core';

/**
 * helper view for proxying an existing external website
 */
export class GeneProxyView extends ProxyView {

  protected getSelectionSelectData(ensgs: string[]): Promise<IFormSelectOption[]> {
    return SpeciesUtils.createOptions(ensgs, this.selection, this.idType);
  }

  protected updateProxyView() {
    const extra: any = this.options.extra;
    extra.species = SpeciesUtils.getSelectedSpecies();
    super.updateProxyView();
  }
}
