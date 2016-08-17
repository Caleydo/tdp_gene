/**
 * Created by Samuel Gratzl on 27.04.2016.
 */
/// <reference path='../../tsd.d.ts' />

import ajax = require('../caleydo_core/ajax');
import {IScore} from '../targid2/LineUpView';
import idtypes = require('../caleydo_core/idtype');
import ranges = require('../caleydo_core/range');
import dialogs = require('../caleydo_bootstrap_fontawesome/dialogs');

import {all_types, gene} from './Common';

class ExpressionScore implements IScore<number> {
  constructor(private parameter: { score:string, biotype:string, aggregation: string}) {

  }

  createDesc() {
    return {
      type: 'number',
      label: `${this.parameter.aggregation} ${this.parameter.score} @ ${this.parameter.biotype}`,
      domain: [-3, 3],
      missingValue: NaN
    };
  }

  compute(ids:ranges.Range, idtype:idtypes.IDType):Promise<{ [id:string]:number }> {
    return ajax.getAPIJSON(`/targid/db/${gene.db}/expression_score_inverted${this.parameter.biotype===all_types ? '_all' : ''}`, {
      score: this.parameter.score,
      biotype: this.parameter.biotype,
      agg: this.parameter.aggregation
    }).then((rows:any[]) => {
      const r:{ [id:string]:number } = {};
      rows.forEach((row) => {
        r[row._id] = row.score;
      });
      return r;
    });
  }
}

export function create() {
  const bioTypes = gene.bioTypesWithAll.map((d) => `<option value="${d}">${d}</option>`);

  return new Promise((resolve) => {
    const dialog = dialogs.generateDialog('Add Score', 'Add');

    dialog.body.innerHTML = `<form><div class="form-group">
        <label for="tumorSample">Bio Type</label>
        <select class="form-control" id="bioType">
        ${bioTypes}    
        </select>
      </div>
      <div class="form-group">
        <label for="score">Score</label>
        <select class="form-control" id="score">
           <option value="log2fpkm" selected="selected">log2fpkm</option><option value="log2tpm">log2tpm</option><option value="counts">
           raw counts</option>   
        </select>
      </div>
      <div class="form-group">
        <label for="agg">Aggregation</label>
        <select class="form-control" id="agg">
           <option value="avg" selected="selected">AVG</option><option value="min">MIN</option><option value="max">MAX</option>  
        </select>
      </div></form>`;

    dialog.onSubmit(() => {
      const bioType = (<HTMLSelectElement>dialog.body.querySelector('#bioType')).value;
      const score = (<HTMLSelectElement>dialog.body.querySelector('#score')).value;
      const agg = (<HTMLSelectElement>dialog.body.querySelector('#agg')).value;
      const s = new ExpressionScore({ score: score, biotype: bioType, aggregation: agg});
      dialog.hide();
      resolve(s);
      return false;
    });

    dialog.onHide(() => {
      dialog.destroy();
    });

    dialog.show();
  });
}


