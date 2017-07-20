//redeclare to avoid dependency
import {getAPIJSON} from 'phovea_core/src/ajax';
import {getSelectedSpecies} from '../Common';

export interface IResult {
  readonly id: string;
  readonly text: string;
}

export interface ISearchProvider {
  search(query: string, page: number, pageSize: number): Promise<{ more: boolean, results: IResult[] }>;

  validate(query: string[]): Promise<IResult[]>;

  format?(item: IResult): string;
}

export default class SearchProvider implements ISearchProvider {

  constructor(protected readonly dataSource: { db: string, base: string, entityName: string }) {

  }

  get searchUrl() {
    return `/targid/db/${this.dataSource.db}/${this.dataSource.base}_items/lookup`;
  }

  get verifyUrl() {
    return `/targid/db/${this.dataSource.db}/${this.dataSource.base}_items_verfiy/filter`;
  }

  protected mapItems(result: any): IResult {
    return Object.assign(result, {id: result.targidid, extra: result.id});
  }

  search(query: string, page: number, pageSize: number): Promise<{ more: boolean, results: IResult[] }> {
    return getAPIJSON(this.searchUrl, {
      column: this.dataSource.entityName,
      species: getSelectedSpecies(),
      query,
      page,
      limit: pageSize
    }).then((data) => {
      return {
        results: data.items.map(this.mapItems.bind(this)),
        more: data.more
      };
    });
  }


  validate(query: string[]): Promise<IResult[]> {
    return getAPIJSON(this.verifyUrl, {
      column: this.dataSource.entityName,
      species: getSelectedSpecies(),
      [`filter_${this.dataSource.entityName}`]: query,
    }).then((data) => data.map(this.mapItems.bind(this)));
  }
}
