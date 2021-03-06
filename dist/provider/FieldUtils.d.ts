/**
 * Created by sam on 29.05.2017.
 */
import { RangeLike } from 'phovea_core';
import { INamedSet } from 'tdp_core';
import { IDType } from 'phovea_core';
export declare class FieldUtils {
    /**
     * converts the field in the given array 2^<value>
     * @param rows
     * @param field
     * @returns {[any,any,any,any,any]}
     */
    static convertLog2ToLinear(rows: any[], field: string): any[];
    /**
     * limit the number of score rows if it doesn't exceed some criteria
     */
    static limitScoreRows(param: any, ids: RangeLike, idTypeOfIDs: IDType, entity: string, maxDirectRows: number, namedSet?: INamedSet): void;
}
