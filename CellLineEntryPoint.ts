/**
 * Created by Holger Stitz on 10.08.2016.
 */

import {IPluginDesc} from '../caleydo_core/plugin';
import {IEntryPointList, AEntryPointList} from '../targid2/StartMenu';
import {chooseDataSource} from './Common';


/**
 * Entry point list from all species and LineUp named sets (aka stored LineUp sessions)
 */
class CellLineEntryPointList extends AEntryPointList {

  /**
   * Set the idType and the default data and build the list
   * @param parent
   * @param desc
   * @param options
   */
  constructor(protected parent: HTMLElement, public desc: IPluginDesc, protected options:any) {
    super(parent, desc, options);

    // read species
    const sample = chooseDataSource(desc);

    this.data = sample.species.map((d) => ({ type: 'species', v: d}));
    this.data.unshift({type: 'all', v: 'All'});

    this.idType = sample.idType;

    this.build();
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
