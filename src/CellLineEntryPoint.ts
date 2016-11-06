/**
 * Created by Holger Stitz on 10.08.2016.
 */

import {IPluginDesc} from 'phovea_core/src/plugin';
import {IEntryPointList, AEntryPointList} from '../targid2/StartMenu';
import {chooseDataSource, ParameterFormIds} from './Common';
import {INamedSet} from '../targid2/storage';


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
    const dataSource = chooseDataSource(desc);
    this.idType = dataSource.idType;

    // convert species to namedset
    this.data.unshift(<INamedSet>{
      name: 'All',
      description: '',
      idType: '',
      ids: '',
      subTypeKey: ParameterFormIds.SPECIES,
      subTypeValue: '',
      subTypeFromSession: true,
      creator: ''
    });

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
