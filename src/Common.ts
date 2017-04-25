/**
 * Created by Samuel Gratzl on 11.05.2016.
 */

import * as session from 'phovea_core/src/session';
import IDType from 'phovea_core/src/idtype/IDType';
import {IFormSelectOption} from 'ordino/src/FormBuilder';
import {ISelection} from 'ordino/src/View';


import {GENE_IDTYPE} from './constants';

// hast to work for all data sources (gene, tissue, cell line)
export const availableSpecies = [
  {name: 'Human', value: 'human'},
  //{ name: 'Rat', value: 'rat' },
  { name: 'Mouse', value: 'mouse' }
];

export const defaultSpecies = availableSpecies[0].value;
export const DEFAULT_ENTITY_TYPE = 'Ensembl';

export const SPECIES_SESSION_KEY = 'species';

export function getSelectedSpecies() {
  return session.retrieve(SPECIES_SESSION_KEY, defaultSpecies);
}

/**
 * selects a human readable idtype for a given one that can be mapped
 * @param idType
 * @returns {Promise<any>}
 */
export async function selectReadableIDType(idType: IDType): Promise<IDType|null> {
  if (idType.id === GENE_IDTYPE) {
    const targetMapping = 'GeneSymbol';
    const species = getSelectedSpecies();
    const mapsTo = await idType.getCanBeMappedTo();
    let target = mapsTo.find((d) => d.name === targetMapping + '_' + species);
    if (!target) {
      target = mapsTo.find((d) => d.name === targetMapping);
    }
    return target;
  }
  // TODO is there a nicer name for cell lines?
  return null;
}


export function createOptions(ensgs: string[], selection: ISelection): Promise<IFormSelectOption[]> {
  if (ensgs === null || ensgs.length === 0) {
    return Promise.resolve([]);
  }
  const idType = selection.idtype;
  return selectReadableIDType(idType).then((target) => {
    if (!target) {
      return ensgs.map((ensg) => ({value: ensg, name: ensg, data: ensg}));
    }
    // map and use names
    return idType.mapToFirstName(selection.range, target).then((names) => {
      return names.map((name, i) => ({
        value: ensgs[i],
        name: name ? `${name} (${ensgs[i]})` : ensgs[i],
        data: ensgs[i]
      }));
    });
  });
}
