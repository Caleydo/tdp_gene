//redeclare to avoid dependency
import { SpeciesUtils } from '../common/common';
import { getTDPData, getTDPLookup } from 'tdp_core/src/rest';
export class SearchProvider {
    constructor(dataSource) {
        this.dataSource = dataSource;
    }
    get searchView() {
        return `${this.dataSource.base}_items`;
    }
    get verifyView() {
        return `${this.dataSource.base}_items_verify`;
    }
    static mapItems(result) {
        return result;
    }
    search(query, page, pageSize) {
        return getTDPLookup(this.dataSource.db, this.searchView, {
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
    validate(query) {
        return getTDPData(this.dataSource.db, `${this.verifyView}/filter`, {
            column: this.dataSource.entityName,
            species: SpeciesUtils.getSelectedSpecies(),
            [`filter_${this.dataSource.entityName}`]: query,
        }).then((data) => data.map(SearchProvider.mapItems));
    }
}
//# sourceMappingURL=SearchProvider.js.map