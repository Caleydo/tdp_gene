/**
 * Created by Holger Stitz on 10.08.2016.
 */
import { Species } from '../common/common';
import { IStartMenuSubSection, IStartMenuSubSectionDesc } from '../common/extensions';
import { IStartMenuSectionOptions } from 'ordino';
import { NamedSetList } from 'tdp_core';
import { INamedSet } from 'tdp_core';
import { ICommonDBConfig } from '../views/ACommonList';
export declare abstract class ACommonSubSection implements IStartMenuSubSection {
    readonly desc: IStartMenuSubSectionDesc;
    protected readonly dataSource: ICommonDBConfig;
    protected readonly options: IStartMenuSectionOptions;
    protected readonly data: NamedSetList;
    private readonly idType;
    /**
     * Set the idType and the default data and build the list
     */
    constructor(parent: HTMLElement, desc: IStartMenuSubSectionDesc, dataSource: ICommonDBConfig, options: IStartMenuSectionOptions);
    update(): void;
    push(namedSet: INamedSet): boolean;
    private static panel2NamedSet;
    protected loadPanels(): Promise<INamedSet[]>;
    protected searchOptions(): any;
    protected getDefaultSessionValues(): {
        species: string;
    };
    private addSearchField;
    private static createButton;
}
