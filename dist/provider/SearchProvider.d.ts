import { IResult, ISearchProvider } from 'tdp_core/src/public/search/SearchProviderInterfaces';
export declare class SearchProvider implements ISearchProvider {
    protected readonly dataSource: {
        db: string;
        base: string;
        entityName: string;
    };
    constructor(dataSource: {
        db: string;
        base: string;
        entityName: string;
    });
    get searchView(): string;
    get verifyView(): string;
    protected static mapItems(result: any): IResult;
    search(query: string, page: number, pageSize: number): any;
    validate(query: string[]): Promise<IResult[]>;
}
