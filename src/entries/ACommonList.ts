/**
 * Created by sam on 06.03.2017.
 */

import {ICommonDBConfig} from './ACommonEntryPointList';
import {INamedSet, ENamedSetType} from 'ordino/src/storage';
import {getAPIJSON} from 'phovea_core/src/ajax';
import * as session from 'phovea_core/src/session';
import {IViewContext, ISelection} from 'ordino/src/View';
import {ALineUpView2} from 'ordino/src/LineUpView';
import {FormBuilder, IFormSelectDesc, FormElementType} from 'ordino/src/FormBuilder';


export interface IACommonListOptions {
  namedSet?: INamedSet;
  search?: ISearchResult;
}

interface ISearchResult {
  ids: string[];
  type: string;
}

export abstract class ACommonList extends ALineUpView2 {

  /**
   * Initialize LineUp view with named set
   * Override in constructor of extended class
   */
  private namedSet : INamedSet;
  private search: ISearchResult;

  /**
   * Parameter UI form
   */
  private paramForm:FormBuilder;

  constructor(context:IViewContext, selection: ISelection, parent:Element, private dataSource: ICommonDBConfig, options: IACommonListOptions) {
    super(context, selection, parent, options);

    //this.idAccessor = (d) => d._id;
    this.additionalScoreParameter = dataSource;
    this.namedSet = options.namedSet;
    if(!this.namedSet) { this.search = options.search; }
  }

  /**
   * Get sub type for named sets
   * @returns {{key: string, value: string}}
   */
  protected getSubType() {
    return {
      key: this.namedSet.subTypeKey,
      value: this.namedSet.subTypeValue
    };
  }

  protected loadColumnDesc() {
    return getAPIJSON(`/targid/db/${this.dataSource.db}/${this.dataSource.base}/desc`);
  }

  protected abstract defineColumns(desc: any) : any[];

  protected initColumns(desc) {
    super.initColumns(desc);

    const columns = this.defineColumns(desc);

    this.build([], columns);
    return columns;
  }

  protected loadRows() {
    const param: any = {};

    if(this.namedSet) {
      switch(this.namedSet.type) {
        case ENamedSetType.NAMEDSET:
          param['filter_namedset4' + this.dataSource.entityName] = this.namedSet.id;
          break;
        case ENamedSetType.PANEL:
          param.filter_panel = this.namedSet.id;
          break;
      }
      if(this.namedSet.subTypeKey && this.namedSet.subTypeKey !== '' && this.namedSet.subTypeValue !== 'all') {
        if(this.namedSet.subTypeFromSession) {
          param['filter_' + this.namedSet.subTypeKey] = session.retrieve(this.namedSet.subTypeKey, this.namedSet.subTypeValue);
        } else {
          param['filter_' + this.namedSet.subTypeKey] = this.namedSet.subTypeValue;
        }
      }
    } else if(this.search) {
      param['filter_' + this.dataSource.entityName] = this.search.ids;
    }
    return getAPIJSON(`/targid/db/${this.dataSource.db}/${this.dataSource.base}/filter`, param);
  }

  getItemName(count) {
    return (count === 1) ? this.dataSource.name.toLowerCase() : this.dataSource.name.toLowerCase() + 's';
  }
}
export default ACommonList;
