/**
 * Created by sam on 29.05.2017.
 */
import { ParseRangeUtils } from 'phovea_core';
import { ENamedSetType } from 'tdp_core';
export class FieldUtils {
    /**
     * converts the field in the given array 2^<value>
     * @param rows
     * @param field
     * @returns {[any,any,any,any,any]}
     */
    static convertLog2ToLinear(rows, field) {
        console.log('convert log2 score to linear scale');
        return rows.map((row) => {
            row[field] = Math.pow(2, row[field]);
            return row;
        });
    }
    /**
     * limit the number of score rows if it doesn't exceed some criteria
     */
    static limitScoreRows(param, ids, idTypeOfIDs, entity, maxDirectRows, namedSet) {
        const range = ParseRangeUtils.parseRangeLike(ids);
        if (range.dim(0).length < maxDirectRows) {
            param[`filter_rangeOf${idTypeOfIDs.id}4${entity}`] = range.toString();
            return;
        }
        if (namedSet) {
            // propagate named sets
            switch (namedSet.type) {
                case ENamedSetType.PANEL:
                    param[`filter_panel_${entity}`] = namedSet.id;
                    break;
                case ENamedSetType.NAMEDSET:
                    param[`filter_namedset4${entity}`] = namedSet.id;
                    break;
            }
        }
    }
}
//# sourceMappingURL=FieldUtils.js.map