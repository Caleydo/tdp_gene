/**
 * Created by Holger Stitz on 10.08.2016.
 */

import {IPluginDesc} from 'phovea_core/src/plugin';
import {IEntryPointList, IEntryPointOptions} from 'ordino/src/StartMenu';
import {gene} from './Common';
import {ACommonEntryPointList, IACommonListOptions, ACommonList} from './ACommonEntryPointList';
import {IViewContext, ISelection} from 'ordino/src/View';
import {stringCol, categoricalCol} from 'ordino/src/LineUpView';

/**
 * Entry point list from all species and LineUp named sets (aka stored LineUp sessions)
 */
class GeneEntryPointList extends ACommonEntryPointList {

  /**
   * Set the idType and the default data and build the list
   * @param parent
   * @param desc
   * @param options
   */
  constructor(parent: HTMLElement, desc: IPluginDesc, options:IEntryPointOptions) {
    super(parent, desc, gene, options);
  }
}


class GeneList extends ACommonList {

  constructor(context:IViewContext, selection: ISelection, parent:Element, options: IACommonListOptions) {
    super(context, selection, parent, gene, options);
  }

  protected defineColumns(desc: any) {
    return [
      stringCol('symbol', 'Symbol', true, 100),
      stringCol('id', 'Ensembl', true, 120),
      stringCol('chromosome', 'Chromosome', true, 150),
      //categoricalCol('species', desc.columns.species.categories, 'Species', true),
      categoricalCol('strand', [{ label: 'reverse strand', name:String(-1)}, { label: 'forward strand', name:String(1)}], 'Strand', true),
      categoricalCol('biotype', desc.columns.biotype.categories, 'Biotype', true),
      stringCol('seqregionstart', 'Seq Region Start', false),
      stringCol('seqregionend', 'Seq Region End', false)
    ];
  }
}


/**
 * Create a list for main navigation from all species and LineUp named sets (aka stored LineUp sessions)
 * @param parent
 * @param desc
 * @param options
 * @returns {function(): any}
 */
export function createStartFactory(parent: HTMLElement, desc: IPluginDesc, options:IEntryPointOptions):IEntryPointList {
  return new GeneEntryPointList(parent, desc, options);
}


export function createStart(context:IViewContext, selection: ISelection, parent:Element, options: IACommonListOptions) {
  return new GeneList(context, selection, parent, options);
}
