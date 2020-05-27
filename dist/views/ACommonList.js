/**
 * Created by sam on 06.03.2017.
 */
import { AStartList } from 'tdp_core/src/views/AStartList';
import { getTDPDesc, getTDPFilteredRows } from 'tdp_core/src/rest';
import { SpeciesUtils, Species } from '../common/common';
export class ACommonList extends AStartList {
    constructor(context, selection, parent, dataSource, options) {
        super(context, selection, parent, Object.assign({
            additionalScoreParameter: dataSource,
            itemName: dataSource.name,
            itemIDType: dataSource.idType,
            subType: {
                key: Species.SPECIES_SESSION_KEY,
                value: SpeciesUtils.getSelectedSpecies()
            }
        }, options));
        this.dataSource = dataSource;
        if (!this.namedSet && options) {
            this.search = options.search;
        }
    }
    loadColumnDesc() {
        return getTDPDesc(this.dataSource.db, this.dataSource.base);
    }
    buildFilter() {
        const filter = {
            [Species.SPECIES_SESSION_KEY]: SpeciesUtils.getSelectedSpecies()
        };
        Object.assign(filter, this.buildNamedSetFilters(`namedset4${(this.dataSource.namedSetEntityName || this.dataSource.entityName)}`, (key) => this.isValidFilter(key)));
        if (this.search) {
            filter[this.dataSource.entityName] = this.search.ids;
        }
        return filter;
    }
    loadRows() {
        return getTDPFilteredRows(this.dataSource.db, this.dataSource.base, {}, this.buildFilter());
    }
    isValidFilter(key) {
        return key !== '';
    }
}
//# sourceMappingURL=ACommonList.js.map