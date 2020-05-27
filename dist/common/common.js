/**
 * Created by Samuel Gratzl on 11.05.2016.
 */
import { UserSession } from 'phovea_core';
import { IDTypeManager } from 'phovea_core';
import { Categories } from './constants';
import { Range } from 'phovea_core';
export var Species;
(function (Species) {
    Species.availableSpecies = [
        { name: 'Human', value: 'human', iconClass: 'fa-male' },
        //{ name: 'Rat', value: 'rat' },
        { name: 'Mouse', value: 'mouse', iconClass: 'mouse-icon' }
    ];
    Species.defaultSpecies = Species.availableSpecies[0].value;
    Species.DEFAULT_ENTITY_TYPE = Categories.GENE_IDTYPE;
    Species.SPECIES_SESSION_KEY = 'species';
})(Species || (Species = {}));
export class SpeciesUtils {
    static getSelectedSpecies() {
        return UserSession.getInstance().retrieve(Species.SPECIES_SESSION_KEY, Species.defaultSpecies);
    }
    /**
     * selects a human readable idtype for a given one that can be mapped
     * @param idType
     * @returns {Promise<any>}
     */
    static async selectReadableIDType(idType) {
        if (idType.id === Categories.GENE_IDTYPE) {
            const targetMapping = 'GeneSymbol';
            const species = SpeciesUtils.getSelectedSpecies();
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
    static mapToId(selection, target = null) {
        if (target === null || selection.idtype.id === target.id) {
            // same just unmap to name
            return selection.range;
        }
        // assume mappable
        return selection.idtype.mapToFirstID(selection.range, target).then((r) => Range.list(r));
    }
    static createOptions(ensgs, selection, base) {
        if (ensgs === null || ensgs.length === 0 || selection.range.isNone) {
            return Promise.resolve([]);
        }
        return Promise.all([SpeciesUtils.mapToId(selection, base), SpeciesUtils.selectReadableIDType(base)]).then((results) => {
            const ids = results[0];
            const target = results[1];
            if (!target) {
                return ensgs.map((ensg) => ({ value: ensg, name: ensg, data: [ensg, ensg] }));
            }
            // map and use names
            return base.mapToFirstName(ids, target).then((names) => {
                return names.map((name, i) => ({
                    value: ensgs[i],
                    name: name ? `${name} (${ensgs[i]})` : ensgs[i],
                    data: [ensgs[i], name]
                }));
            });
        });
    }
    /**
     * Creates a converter to use GeneSymbols, translate them to Ensembl IDs, add these IDs and change the previously detected options (e.g. add a new header, change IDType, ...)
     */
    static convertGeneSymbolToEnsembl() {
        return {
            process: async function process(importResults, data) {
                if (importResults.idType.includes('GeneSymbol')) {
                    const idType = IDTypeManager.getInstance().resolveIdType(importResults.idType);
                    const geneSymbols = data.map((row) => row[importResults.idColumn]);
                    const ensgs = await idType.mapNameToName(geneSymbols, Categories.GENE_IDTYPE);
                    // append converted ENSGs to each row
                    // ensgs is an Array of Arrays
                    // if a 1:1 mapping is found, only 1 row is added
                    // if a 1:n mapping is found, multiple rows are added with different Ensembl IDs
                    const newData = [];
                    data.forEach((row, i) => {
                        if (ensgs[i] && ensgs[i].length > 0) {
                            ensgs[i].forEach((mapping) => {
                                newData.push([...row, mapping]);
                            });
                        }
                        else {
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
                        idType: Categories.GENE_IDTYPE,
                        label: Categories.GENE_IDTYPE,
                        type: 'string'
                    });
                    newConfig.idType = Categories.GENE_IDTYPE;
                    newConfig.idColumn = newConfig.columns.length - 1;
                    newConfig.notes.push('The column Ensembl was added based on the detected Gene Symbols. 1:n mappings between Gene Symbols and Ensembl IDs were resolved by showing all possible combinations.');
                    return newData;
                }
                else {
                    return data;
                }
            }
        };
    }
    /**
     * Filters elements containing the selected species from the given data array by using the provided accessor function
     * @param filter Object
     * @returns Boolean
     */
    static filterSpecies(filter) {
        return !filter.species || filter.species === SpeciesUtils.getSelectedSpecies();
    }
}
//# sourceMappingURL=common.js.map