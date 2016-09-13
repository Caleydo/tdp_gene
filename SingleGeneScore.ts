/**
 * Created by Samuel Gratzl on 27.04.2016.
 */
/// <reference path='../../tsd.d.ts' />

import ajax = require('../caleydo_core/ajax');
import {IScore} from '../targid2/LineUpView';
import idtypes = require('../caleydo_core/idtype');
import ranges = require('../caleydo_core/range');
import dialogs = require('../caleydo_bootstrap_fontawesome/dialogs');
import {IDataSourceConfig, gene, chooseDataSource} from './Common';
import {IPluginDesc} from '../caleydo_core/plugin';

class SingleGeneScore implements IScore<any> {
  constructor(private parameter: { gene: string, geneSymbol: string, score: string}, private sample: IDataSourceConfig) {

  }

  createDesc(): any {
    switch(this.parameter.score) {
      case 'cnv':
        return {
          type: 'number',
          label: `CNV of ${this.parameter.geneSymbol}`,
          domain: [-4, 4],
          missingValue: NaN
        };
      case 'gene_expression':
        return {
          type: 'number',
          label: `Gene Expression of ${this.parameter.geneSymbol}`,
          domain: [-4, 4],
          missingValue: NaN
        };
      default: // mutation
        return {
          type: 'string',
          label: `Mutation of ${this.parameter.geneSymbol}`
        };
    }
  }

  compute(ids:ranges.Range, idtype:idtypes.IDType, idMapper:(id:string) => number):Promise<{ [id:string]:any }> {
    let score;
    switch(this.parameter.score) {
      case 'cnv':
        score = 'copynumber';
        break;
      case 'gene_expression':
        score = 'expression';
        break;
      default: // mutation
        score = 'mutation';
    }
    return ajax.getAPIJSON(`/targid/db/${this.sample.db}/no_assigner/${this.sample.base}_gene_${score}` , {
      ensg: this.parameter.gene
    }).then((rows:any[]) => {
      const r:{ [id:string]:number } = {};
      rows.forEach((row) => {
        r[idMapper(row.id)] = row.score;
      });
      return r;
    });
  }
}

export function create(desc: IPluginDesc) {
  const sample = chooseDataSource(desc);
  return ajax.getAPIJSON(`/targid/db/${gene.db}/${gene.base}_simple`).then((data) => {
    const genes = data.map((d) => `<option value="${d.id}">${d.symbol}</option>`);

    return new Promise((resolve) => {
      const dialog = dialogs.generateDialog('Add Score', 'Add');

      dialog.body.innerHTML = `<form><div class="form-group">
          <label for="gene">Gene</label>
          <select class="form-control" id="gene">
          ${genes}    
          </select>
        </div><div class="form-group">
          <label for="score">Property</label>
          <select class="form-control" id="score">
          <option value="cnv">Relative Copy Number Value</option>
          <option value="mutation">Mutation</option>
          <option value="gene_expression">Gene Expression</option>
          </select>
        </div></form>`;

      dialog.onSubmit(() => {
        const gene = (<HTMLSelectElement>dialog.body.querySelector('#gene')).value;
        const score = (<HTMLSelectElement>dialog.body.querySelector('#score')).value;
        const s = new SingleGeneScore({ gene: gene, geneSymbol: data.filter((d) => d.id === gene)[0].symbol, score: score}, sample);
        dialog.hide();
        resolve(s);
        return false;
      });

      dialog.onHide(() => {
        dialog.destroy();
      });

      dialog.show();
    });
  });
}


