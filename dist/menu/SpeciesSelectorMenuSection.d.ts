/**
 * Created by Holger Stitz on 27.07.2016.
 */
import { IPluginDesc } from 'phovea_core';
import '../scss/main.scss';
import { IStartMenuSection, IStartMenuSectionOptions } from 'ordino';
import { INamedSet } from 'tdp_core';
export declare class SpeciesSelectorMenuSection implements IStartMenuSection {
    private readonly parent;
    readonly desc: IPluginDesc;
    private readonly options;
    private readonly subSections;
    constructor(parent: HTMLElement, desc: IPluginDesc, options: IStartMenuSectionOptions);
    private build;
    push(namedSet: INamedSet): boolean;
    private buildSpeciesSelection;
    private buildEntityTypes;
    private buildEntityTypeSelection;
    private buildEntryPointList;
}
