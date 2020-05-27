/**
 * Created by Samuel Gratzl on 11.05.2016.
 */
import IDType from 'phovea_core/src/idtype/IDType';
import { IFormSelectOption } from 'tdp_core/src/form';
import { ISelection } from 'tdp_core/src/views/interfaces';
interface IAvailableSpecies {
    name: string;
    value: string;
    iconClass?: string;
}
interface ISpeciesFilterObject {
    species: string;
    [key: string]: any;
}
export declare module Species {
    const availableSpecies: IAvailableSpecies[];
    const defaultSpecies: string;
    const DEFAULT_ENTITY_TYPE = "Ensembl";
    const SPECIES_SESSION_KEY = "species";
}
export interface IPostProcessor {
    process: (importResults: {
        [key: string]: any;
    }, data: string[][]) => Promise<string[][]>;
}
export declare class SpeciesUtils {
    static getSelectedSpecies(): string;
    /**
     * selects a human readable idtype for a given one that can be mapped
     * @param idType
     * @returns {Promise<any>}
     */
    static selectReadableIDType(idType: IDType): Promise<IDType | null>;
    static mapToId(selection: ISelection, target?: IDType): import("phovea_core/src/range").Range | Promise<import("phovea_core/src/range").Range>;
    static createOptions(ensgs: string[], selection: ISelection, base: IDType): Promise<IFormSelectOption[]>;
    /**
     * Creates a converter to use GeneSymbols, translate them to Ensembl IDs, add these IDs and change the previously detected options (e.g. add a new header, change IDType, ...)
     */
    static convertGeneSymbolToEnsembl(): IPostProcessor;
    /**
     * Filters elements containing the selected species from the given data array by using the provided accessor function
     * @param filter Object
     * @returns Boolean
     */
    static filterSpecies(filter: ISpeciesFilterObject): boolean;
}
export {};
