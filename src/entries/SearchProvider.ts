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

  constructor(private readonly dataSource: { db: string, base: string, entityName: string }) {

  }

  search(query: string, page: number, pageSize: number): Promise<{ more: boolean, results: IResult[] }> {
    return getAPIJSON(`/targid/db/${this.dataSource.db}/${this.dataSource.base}_items/lookup`, {
      column: this.dataSource.entityName,
      species: getSelectedSpecies(),
      query,
      page: page + 1, //required to start with 1 instead of 0
      limit: pageSize
    }).then((data) => {
      return {
        results: data.items.map((d) => Object.assign(d, {id: d.targidid, extra: d.id})),
        more: data.more
      };
    });
  }


  validate(query: string[]): Promise<IResult[]> {
    //TODO
    return Promise.resolve([]);
  }
}
