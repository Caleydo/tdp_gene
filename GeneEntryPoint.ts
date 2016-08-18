/**
 * Created by Holger Stitz on 10.08.2016.
 */

import {IPluginDesc} from '../caleydo_core/plugin';
import {IEntryPointList, AEntryPointList} from '../targid2/StartMenu';
import {gene} from './Common';

/**
 * Entry point list from all species and LineUp named sets (aka stored LineUp sessions)
 */
class GeneEntryPointList extends AEntryPointList {

  /**
   * Set the idType and the default data and build the list
   * @param parent
   * @param desc
   * @param options
   */
  constructor(protected parent: HTMLElement, public desc: IPluginDesc, protected options:any) {
    super(parent, desc, options);

    this.idType = 'Ensembl';

    // read species
    this.data = gene.species.map((d) => ({ type: 'species', v: d}));
    this.data.unshift({type: 'all', v: 'All'});

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
  return new GeneEntryPointList(parent, desc, options);
}