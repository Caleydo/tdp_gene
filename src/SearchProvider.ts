//redeclare to avoid dependency
import {getSelectedSpecies} from './common';
import {IResult, ISearchProvider} from 'dTiles/src/extensions';
import {getTDPData, getTDPLookup} from 'tdp_core/src/rest';

export {IResult} from 'dTiles/src/extensions';

export default class SearchProvider implements ISearchProvider {

  constructor(protected readonly dataSource: { db: string, base: string, entityName: string }) {

  }

  get searchView() {
    return `${this.dataSource.base}_items`;
  }

  get verifyView() {
    return `${this.dataSource.base}_items_verify`;
  }

  protected static mapItems(result: any): IResult {
    return result;
  }

  search(query: string, page: number, pageSize: number) {
    return getTDPLookup(this.dataSource.db, this.searchView , {
      column: this.dataSource.entityName,
      species: getSelectedSpecies(),
      query,
      page,
      limit: pageSize
    }).then((data) => {
      return {
        items: data.items.map(SearchProvider.mapItems),
        more: data.more
      };
    });
  }


  validate(query: string[]): Promise<IResult[]> {
    return getTDPData(this.dataSource.db, `${this.verifyView}/filter`, {
      column: this.dataSource.entityName,
      species: getSelectedSpecies(),
      [`filter_${this.dataSource.entityName}`]: query,
    }).then((data) => data.map(SearchProvider.mapItems));
  }
}
