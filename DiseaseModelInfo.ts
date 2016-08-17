/**
 * Created by Samuel Gratzl on 27.04.2016.
 */
/// <reference path="../../tsd.d.ts" />

import {AView, IViewContext, ISelection} from '../targid2/View';

export class DiseaseModelInfo extends AView {
  constructor(context: IViewContext, selection: ISelection, parent: Element, options?) {
    super(context, parent, options);
    this.$node.classed('disease-model-info', true);

    this.changeSelection(selection);

  }

  changeSelection(selection: ISelection) {
    this.setBusy(true);
  }
}



export function create(context:IViewContext, selection: ISelection, parent:Element, options?) {
  return new DiseaseModelInfo(context, selection, parent, options);
}


