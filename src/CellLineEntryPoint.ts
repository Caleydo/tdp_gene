/**
 * Created by Holger Stitz on 10.08.2016.
 */

import {IPluginDesc} from '../caleydo_core/plugin';
import {IEntryPointList} from '../targid2/StartMenu';
import {chooseDataSource} from './Common';
import {ACommonEntryPointList, IACommonListOptions, ACommonList} from './ACommonEntryPointList';
import {IViewContext, ISelection} from '../targid2/View';
import {stringCol, categoricalCol} from '../targid2/LineUpView';


/**
 * Entry point list from all species and LineUp named sets (aka stored LineUp sessions)
 */
class CellLineEntryPointList extends ACommonEntryPointList {

  /**
   * Set the idType and the default data and build the list
   * @param parent
   * @param desc
   * @param options
   */
  constructor(protected parent: HTMLElement, public desc: IPluginDesc, protected options:any) {
    super(parent, desc, chooseDataSource(desc), options);
  }
}

class CellLineList extends ACommonList {

  constructor(context:IViewContext, selection: ISelection, parent:Element, options: IACommonListOptions) {
    super(context, selection, parent, chooseDataSource(context.desc), options);
  }

  protected defineColumns(desc: any) {
    return [
      stringCol('id', 'Name', true, 120),
      //categoricalCol('species', desc.columns.species.categories, 'Species', true),
      categoricalCol('tumortype', desc.columns.tumortype.categories, 'Tumor Type', true),
      categoricalCol('organ', desc.columns.organ.categories, 'Organ', true),
      categoricalCol('gender', desc.columns.gender.categories, 'Gender', true)
    ];
  }
}


/**
 * Create a list for main navigation from all species and LineUp named sets (aka stored LineUp sessions)
 * @param parent
 * @param desc
 * @param options
 * @returns {function(): any}
 */
export function createStartFactory(parent: HTMLElement, desc: IPluginDesc, options:any):IEntryPointList {
  return new CellLineEntryPointList(parent, desc, options);
}


export function createStart(context:IViewContext, selection: ISelection, parent:Element, options: IACommonListOptions) {
  return new CellLineList(context, selection, parent, options);
}