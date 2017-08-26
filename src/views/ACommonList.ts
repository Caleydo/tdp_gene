/**
 * Created by sam on 06.03.2017.
 */

import {AStartList, IAStartListOptions} from 'tdp_core/src/views/AStartList';
import {ISelection, IViewContext} from 'tdp_core/src/views';
import {getTDPDesc, getTDPFilteredRows, IParams} from 'tdp_core/src/rest';
import {ICommonDBConfig} from '../menu/ACommonSubSection';

export interface IACommonListOptions extends IAStartListOptions {
  search?: ISearchResult;
}

interface ISearchResult {
  ids: string[];
  type: string;
}

export abstract class ACommonList extends AStartList {
  private search: ISearchResult;

  constructor(context:IViewContext, selection: ISelection, parent:HTMLElement, private readonly dataSource: ICommonDBConfig, options: Partial<IACommonListOptions>) {
    super(context, selection, parent, Object.assign({
      additionalScoreParameter: dataSource,
      itemName: dataSource.name
    }, options));

    if(!this.namedSet) {
      this.search = options.search;
    }
  }

  protected loadColumnDesc() {
    return getTDPDesc(this.dataSource.db, this.dataSource.base);
  }

  protected buildFilter(): IParams {
    const filter: IParams = {};

    Object.assign(filter, this.buildNamedSetFilters(`namedset4${((<any>this.dataSource).namedSetEntityName || this.dataSource.entityName)}`, (key) => this.isValidFilter(key)));
    if(this.search) {
      filter[this.dataSource.entityName] = this.search.ids;
    }
    return filter;
  }

  protected loadRows() {
    return getTDPFilteredRows(this.dataSource.db, this.dataSource.base, {}, this.buildFilter());
  }

  protected isValidFilter(key: string) {
    return key !== '';
  }
}

export default ACommonList;