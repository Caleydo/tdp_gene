/**
 * Created by sam on 29.05.2017.
 */
import {convertRow2MultiMap} from 'tdp_core/src/form';
import {encodeParams, getAPIJSON} from 'phovea_core/src/ajax';
import {RangeLike, parse} from 'phovea_core/src/range';
import {INamedSet, ENamedSetType} from 'tdp_core/src/storage';
import IDType from 'phovea_core/src/idtype/IDType';
import {getTDPCount} from 'tdp_core/src/rest';

/**
 * converts the field in the given array 2^<value>
 * @param rows
 * @param field
 * @returns {[any,any,any,any,any]}
 */
export function convertLog2ToLinear(rows: any[], field: string) {
  console.log('convert log2 score to linear scale');
  return rows.map((row) => {
    row[field] = Math.pow(2, row[field]);
    return row;
  });
}

/**
 * converts the given filter object to request params
 * @param param target object
 * @param filter input filter
 */
export function toFilter(param: any, filter: any) {
  const clean = (v: any) => {
    if (Array.isArray(v)) {
      return v.map(clean);
    }
    if (typeof v === 'object' && v.id !== undefined && v.text !== undefined) {
      return v.id;
    }
    return v;
  };
  Object.keys(filter).forEach((k) => {
    const v = filter[k];
    param['filter_' + k] = clean(filter[k]);
  });
}

export function toFilterString(filter: any, key2name?: Map<string, string>) {
  const keys = Object.keys(filter);
  if (keys.length === 0) {
    return '<None>';
  }
  const toString = (v: any) => {
    if (typeof v === 'object' && v.id !== undefined && v.text !== undefined) {
      return v.text;
    }
    return v.toString();
  };
  return keys.map((d) => {
    const v = filter[d];
    const label = key2name && key2name.has(d) ? key2name.get(d) : d;
    const vn = Array.isArray(v) ? '["' + v.map(toString).join('","') + '"]' : '"' + toString(v) + '"';
    return `${label}=${vn}`;
  }).join(' & ');}

/**
 * generator for a FormMap compatible badgeProvider based on the given database url
 */
export function previewFilterHint(database: string, view: string, extraParams?: ()=>any) {
  let total: Promise<number> = null;
  const cache = new Map<string, Promise<number>>();


  return (rows: any[]) => {
    if (total === null) { // compute all by no setting any filter
      total = getTDPCount(database, view, (extraParams ? extraParams() : {}));
    }
    if (!rows) { //if no filter is set return all
      return total.then((count: number) => `${count} / ${count}`);
    }
    //compute filtered ones
    const filter = convertRow2MultiMap(rows);
    const param: any = {};
    if (extraParams) {
      Object.assign(param, extraParams());
    }
    toFilter(param, filter);
    const key = encodeParams(param);
    if (!cache.has(key)) {
      cache.set(key, getTDPCount(database, view, param));
    }
    return Promise.all([total, cache.get(key)]).then((results: number[]) => {
      return `${results[1]} / ${results[0]}`;
    }, () => {
      // ignore error and return dunno
      return `? / ?`;
    });
  };
}


/**
 * limit the number of score rows if it doesn't exceed some criteria
 */
export function limitScoreRows(param: any, ids: RangeLike, idTypeOfIDs: IDType, entity: string, maxDirectRows: number, namedSet?: INamedSet) {
  const range = parse(ids);
  if (range.dim(0).length < maxDirectRows) {
    param[`filter_rangeOf${idTypeOfIDs.id}4${entity}`] = range.toString();
    return;
  }
  if (namedSet) {
    // propagate named sets
    switch(namedSet.type) {
      case ENamedSetType.PANEL:
        param[`filter_panel_${entity}`] = namedSet.id;
        break;
      case ENamedSetType.NAMEDSET:
        param[`filter_namedset4${entity}`] = namedSet.id;
        break;
    }
  }
}
