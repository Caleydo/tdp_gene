/**
 * Created by Holger Stitz on 10.08.2016.
 */

import {IPluginDesc} from '../caleydo_core/plugin';
import {AEntryPointList} from '../targid2/StartMenu';
import {ParameterFormIds, defaultSpecies} from './Common';
import {INamedSet, ENamedSetType} from '../targid2/storage';


export abstract class APanelAbleEntryPointList extends AEntryPointList {

  /**
   * Set the idType and the default data and build the list
   * @param parent
   * @param desc
   * @param options
   */
  constructor(protected parent: HTMLElement, public desc: IPluginDesc, idType: string, protected options: any) {
    super(parent, desc, options);

    this.idType = idType;

    // convert species to namedset
    this.data.unshift(<INamedSet>{
      name: 'All',
      type: ENamedSetType.CUSTOM,
      subTypeKey: ParameterFormIds.SPECIES,
      subTypeFromSession: true,
      subTypeValue: defaultSpecies,
      description: '',
      idType: '',
      ids: '',
      creator: ''
    });

    this.build();
  }

  protected getNamedSets(): Promise<INamedSet[]> {
    return super.getNamedSets();
  }
}

export default APanelAbleEntryPointList;
