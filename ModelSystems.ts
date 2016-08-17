/**
 * Created by Samuel Gratzl on 27.04.2016.
 */
/// <reference path="../../tsd.d.ts" />

//import datas = require('../caleydo_core/data');
//import tables = require('../caleydo_core/table');
import {IViewContext, ISelection} from '../targid2/View';
import {ALineUpView} from '../targid2/LineUpView';


export class ModelSystems extends ALineUpView {
  //private lineupPromise : Promise<any>;

  constructor(context:IViewContext, selection: ISelection, parent:Element, options?) {
    super(context, parent, options);

    this.build(selection);
  }

  changeSelection(selection: ISelection) {
    //TODO
  }

  private build(selection: ISelection) {
    //generate random data
    this.setBusy(true);
  }
}

export function create(context:IViewContext, selection: ISelection, parent:Element, options?) {
  return new ModelSystems(context, selection, parent, options);
}


