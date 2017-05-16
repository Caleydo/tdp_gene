/**
 * Created by Samuel Gratzl on 11.05.2016.
 */

import * as session from 'phovea_core/src/session';
import IDType from 'phovea_core/src/idtype/IDType';
import {IFormSelectOption} from 'ordino/src/FormBuilder';
import {ISelection} from 'ordino/src/View';
import {resolve} from 'phovea_core/src/idtype';
import {GENE_IDTYPE} from './constants';

// hast to work for all data sources (gene, tissue, cell line)
interface IAvailableSpecies {
  name: string;
  value: string;
  iconClass?: string;
}

export const availableSpecies: IAvailableSpecies[] = [
  { name: 'Human', value: 'human', iconClass: 'fa-male' },
  //{ name: 'Rat', value: 'rat' },
  { name: 'Mouse', value: 'mouse', iconClass: 'mouse-icon' }
];

export const defaultSpecies = availableSpecies[0].value;
export const DEFAULT_ENTITY_TYPE = 'Ensembl';

export const SPECIES_SESSION_KEY = 'species';

export function getSelectedSpecies() {
  return session.retrieve(SPECIES_SESSION_KEY, defaultSpecies);
}

export interface IPostProcessor {
  process: (importResults: {[key: string]: any}, data: string[][]) => Promise<string[][]>;
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

/**
 * Creates a converter to use GeneSymbols, translate them to Ensembl IDs, add these IDs and change the previously detected options (e.g. add a new header, change IDType, ...)
 */
export function convertGeneSymbolToEnsembl(): IPostProcessor {
  return {
   process: async function process(importResults: {[key: string]: any}, data: string[][]): Promise<string[][]> {
     if(importResults.idType.includes('GeneSymbol')) {
       const idType = resolve(importResults.idType);

       const geneSymbols = data.map((row) => row[importResults.idColumn]);
       const systemIDs = await idType.map(geneSymbols);
       const ensgs = await idType.mapToName(systemIDs, GENE_IDTYPE);

       // append converted ENSGs to each row
       // ensgs is an Array of Arrays
       // if a 1:1 mapping is found, only 1 row is added
       // if a 1:n mapping is found, multiple rows are added with different Ensembl IDs
       const newData = [];
       data.forEach((row, i) => {
         if(ensgs[i] && ensgs[i].length > 0) {
           ensgs[i].forEach((mapping) => {
             newData.push([...row, mapping]);
           });
         } else {
           newData.push([...row, '']);
         }
       });

       // TODO: return newConfig instead of changing it by reference?
       const newConfig = importResults;

       delete newConfig.columns[newConfig.idColumn].idType;

       // add new column header
       newConfig.columns.push({
         color: '#DDDDDD',
         column: newConfig.columns.length,
         idType: GENE_IDTYPE,
         label: GENE_IDTYPE,
         type: 'string'
       });

       newConfig.idType = GENE_IDTYPE;
       newConfig.idColumn = newConfig.columns.length - 1;
       newConfig.notes.push('The column Ensembl was added based on the detected Gene Symbols. 1:n mappings between Gene Symbols and Ensembl IDs were resolved by showing all possible combinations.');

       return newData;
     } else {
       return data;
     }
   }
  };
}

/**
 * Filters elements containing the selected species from the given data array by using the provided accessor function
 * @param data
 * @param accessor
 * @returns {{[p: string]: any}[]}
 */
export function filterSpecies(data: {[key: string]: any}[], accessor: (x) => string) {
  return data.filter((datum) => accessor(datum) === getSelectedSpecies());
}
