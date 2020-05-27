
import {IPluginDesc} from 'phovea_core';
import {INamedSet} from 'tdp_core/src/storage/interfaces';
import {IStartMenuSectionOptions} from 'ordino/src/extensions';

export {IStartMenuSectionOptions} from 'ordino/src/extensions';

export const EXTENSION_POINT_STARTMENU_SUBSECTION = 'ordinoStartMenuSubSection';

export interface IStartMenuSubSectionDesc extends IPluginDesc {
  readonly id: string;
  readonly name: string;
  readonly cssClass: string;
  readonly idType: string;
  readonly description: string;

  load(): Promise<IStartMenuSubSectionPlugin>;
}

interface IStartMenuSubSectionPlugin {
  desc: IStartMenuSubSectionDesc;

  factory(parent: HTMLElement, desc: IStartMenuSubSectionDesc, options: IStartMenuSectionOptions): IStartMenuSubSection;
}

export interface IStartMenuSubSection {
  push(namedSet: INamedSet): boolean;
  update(): void;
}
