/**
 * Created by Holger Stitz on 10.08.2016.
 */

import {IPluginDesc} from '../caleydo_core/plugin';
import {IEntryPointList} from '../targid2/StartMenu';
import {chooseDataSource} from './Common';
import APanelAbleEntryPointList from './APanelAbleEntryPoint';


/**
 * Entry point list from all species and LineUp named sets (aka stored LineUp sessions)
 */
class CellLineEntryPointList extends APanelAbleEntryPointList {

  /**
   * Set the idType and the default data and build the list
   * @param parent
   * @param desc
   * @param options
   */
  constructor(protected parent: HTMLElement, public desc: IPluginDesc, protected options:any) {
    super(parent, desc, chooseDataSource(desc).idType, options);
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
