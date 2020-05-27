//redeclare to avoid dependency
import {SpeciesUtils} from '../common/common';
import {IResult, ISearchProvider} from 'tdp_core/src/public/search/SearchProviderInterfaces';
import {getTDPData, getTDPLookup} from 'tdp_core/src/rest';

export class SearchProvider implements ISearchProvider {

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
      species: SpeciesUtils.getSelectedSpecies(),
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
      species: SpeciesUtils.getSelectedSpecies(),
      [`filter_${this.dataSource.entityName}`]: query,
    }).then((data) => data.map(SearchProvider.mapItems));
  }
}
