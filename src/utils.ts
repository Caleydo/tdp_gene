/**
 * Created by sam on 29.05.2017.
 */
import {convertRow2MultiMap} from 'ordino/src/form/internal/FormMap';
import {encodeParams, getAPIJSON} from 'phovea_core/src/ajax';

export function convertLog2ToLinear(rows: any[], field: string) {
  console.log('convert log2 score to linear scale');
  return rows.map((row) => {
    row[field] = Math.pow(2, row[field]);
    return row;
  });
}

export function toFilter(param: any, filter: any) {
  Object.keys(filter).forEach((k) => {
    const v = filter[k];
    param['filter_' + k] = filter[k];
  });
}

export function previewFilterHint(baseUrl: string) {
  let total: Promise<number> = null;
  const cache = new Map<string, Promise<number>>();
  return (rows: any[]) => {
    if (total === null) { // compute all by no setting any filter
      total = getAPIJSON(baseUrl+'/count',  {});
    }
    if (!rows) { //if no filter is set return all
      return total.then((count: number) => `${count} / ${count}`);
    }
    //compute filtered ones
    const filter = convertRow2MultiMap(rows);
    const param : any = {};
    toFilter(param, filter);
    const key = encodeParams(param);
    if (!cache.has(key)) {
      cache.set(key, getAPIJSON(baseUrl+'/count', param));
    }
    return Promise.all([total, cache.get(key)]).then((results: number[]) => {
      return `${results[1]} / ${results[0]}`;
    }, () => {
      return `? / ?`;
    });
  };
}
