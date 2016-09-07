/**
 * Created by Samuel Gratzl on 27.04.2016.
 */
/// <reference path='../../tsd.d.ts' />

import ajax = require('../caleydo_core/ajax');
import ranges = require('../caleydo_core/range');
import dialogs = require('../caleydo_bootstrap_fontawesome/dialogs');
import {IPluginDesc} from '../caleydo_core/plugin';
import idtypes = require('../caleydo_core/idtype');
import {
  all_bio_types, dataTypes, IDataSourceConfig, IDataTypeConfig, IDataSubtypeConfig, ParameterFormIds,
  expression, copyNumber, mutation, gene, convertLog2ToLinear
} from './Common';
import {IScore} from '../targid2/LineUpView';
import {FormBuilder, FormElementType, IFormSelectDesc} from '../targid2/FormBuilder';


class InvertedAggregatedScore implements IScore<number> {
  constructor(private parameter: { data_source: IDataSourceConfig, data_type:IDataTypeConfig, data_subtype:IDataSubtypeConfig, bio_type:string, aggregation: string }, private dataSource: IDataSourceConfig) {

  }

  createDesc() {
    return {
      type: this.parameter.data_subtype.type,
      label: `${this.parameter.aggregation} ${this.parameter.data_subtype.name} @ ${this.parameter.bio_type}`,
      domain: this.parameter.data_subtype.domain,
      missingValue: this.parameter.data_subtype.missingValue
    };
  }

  compute(ids:ranges.Range, idtype:idtypes.IDType, idMapper:(id:string) => number):Promise<{ [id:string]:number }> {
    return ajax.getAPIJSON(`/targid/db/${this.dataSource.db}/no_assigner/aggregated_score_inverted${this.parameter.bio_type===all_bio_types ? '_all' : ''}`, {
      schema: this.dataSource.schema,
      entity_name: this.dataSource.entityName,
      table_name: this.parameter.data_type.tableName,
      data_subtype: this.parameter.data_subtype.useForAggregation,
      biotype: this.parameter.bio_type,
      agg: this.parameter.aggregation
    }).then((rows:any[]) => {

      if (this.parameter.data_subtype.useForAggregation.indexOf('log2') !== -1) {
        rows = convertLog2ToLinear(rows, 'score');
      }

      const r:{ [id:string]:number } = {};
      rows.forEach((row) => {
        r[idMapper(row.id)] = row.score;
      });
      return r;
    });
  }
}

/*class InvertedMutationFrequencyScore implements IScore<number> {
  constructor(private parameter: {tumor_type:string, comparison_operator: string, comparison_value: number}, private dataSource: IDataSourceConfig) {

  }

  createDesc() {
    return {
      type: 'number',
      label: `Mutation Frequency ${this.parameter.tumor_type === all_types ? '' : '@ '+this.parameter.tumor_type}`,
      domain: [0, 1],
      missingValue: 0,
      constantDomain: true
    };
  }

  compute(ids:ranges.Range, idtype:idtypes.IDType, idMapper:(id:string) => number):Promise<{ [id:string]:number }> {
    return ajax.getAPIJSON(`/targid/db/${this.dataSource.db}/no_assigner/mutation_frequency${this.parameter.tumor_type===all_types ? '_all' : ''}`, {
      tumortype: this.parameter.tumor_type
    }).then((rows:any[]) => {
      const r:{ [id:string]:number } = {};
      rows.forEach((row) => {
        r[idMapper(row.id)] = row.score;
      });
      return r;
    });
  }
}*/


/*class InvertedFrequencyScore implements IScore<number> {
  constructor(private parameter: { data_type:IDataTypeConfig, data_subtype:IDataSubtypeConfig, bio_type:string, comparison_operator: string, comparison_value: number}, private sample: IDataSourceConfig) {

  }

  createDesc() {
    return {
      type: 'number',
      label: `${this.parameter.data_subtype.name} ${this.parameter.comparison_operator} "${this.parameter.comparison_value}" Frequency ${this.parameter.bio_type === all_bio_types ? '' : '@ '+this.parameter.bio_type}`,
      domain: [0, 1],
      missingValue: 0,
      constantDomain: true
    };
  }

  compute(ids:ranges.Range, idtype:idtypes.IDType, idMapper:(id:string) => number):Promise<{ [id:string]:number }> {
    return ajax.getAPIJSON(`/targid/db/${this.sample.db}/no_assigner/frequency_score_inverted${this.parameter.bio_type===all_bio_types ? '_all' : ''}`, {
      table_name: this.parameter.data_type.table,
      data_subtype: this.parameter.data_subtype.id,
      biotype: this.parameter.bio_type,
      operator: this.parameter.comparison_operator,
      value: this.parameter.comparison_value
    }).then((rows:any[]) => {
      const r:{ [id:string]:number } = {};
      rows.forEach((row) => {
        r[idMapper(row.id)] = row.score;
      });
      return r;
    });
  }
}*/

export function create(desc: IPluginDesc, dataSource:IDataSourceConfig = gene) {
  // resolve promise when closing or submitting the modal dialog
  return new Promise((resolve) => {
    const dialog = dialogs.generateDialog('Add Aggregated Score', 'Add');

    const form:FormBuilder = new FormBuilder(d3.select(dialog.body));
    const formDesc:IFormSelectDesc[] = [
      {
        type: FormElementType.SELECT,
        label: 'Data Source',
        id: ParameterFormIds.DATA_SOURCE,
        visible: false,
        options: {
          optionsData: [dataSource].map((ds) => {
            return {name: ds.name, value: ds.name, data: ds};
          })
        },
        useSession: true
      },
      {
        type: FormElementType.SELECT,
        label: 'Bio Type',
        id: ParameterFormIds.BIO_TYPE,
        options: {
          optionsData: gene.bioTypesWithAll.map((d) => {
            return {name: d, value: d, data: d};
          })
        },
        useSession: true
      },
      {
        type: FormElementType.SELECT,
        label: 'Data Type',
        id: ParameterFormIds.DATA_TYPE,
        options: {
          optionsData: dataTypes.map((ds) => {
            return {name: ds.name, value: ds.id, data: ds};
          })
        },
        useSession: true
      },
      {
        type: FormElementType.SELECT,
        label: 'Data Subtype',
        id: ParameterFormIds.DATA_SUBTYPE,
        dependsOn: [ParameterFormIds.DATA_TYPE],
        options: {
          optionsFnc: (selection) => (<IDataTypeConfig>selection[0].data).dataSubtypes.map((ds) => {
            return {name: ds.name, value: ds.id, data: ds};
          }),
          optionsData: []
        },
        useSession: true
      },
      {
        type: FormElementType.SELECT,
        label: 'Aggregation',
        id: ParameterFormIds.AGGREGATION,
        dependsOn: [ParameterFormIds.DATA_TYPE],
        options: {
          optionsFnc: (selection) => {
            var r = [];
            if(selection[0].data === mutation) {
              r = [
                {name: 'Frequency', value: 'frequency', data: 'frequency'}
              ];

            } else {
              r = [
                {name: 'AVG', value: 'avg', data: 'avg'},
                {name: 'MIN', value: 'min', data: 'min'},
                {name: 'MAX', value: 'max', data: 'max'},
                {name: 'Frequency', value: 'frequency', data: 'frequency'}
              ];
            }
            return r;
          },
          optionsData: []
        },
        useSession: true
      },
      {
        type: FormElementType.SELECT,
        label: 'Comparison Operator',
        id: ParameterFormIds.COMPARISON_OPERATOR,
        dependsOn: [ParameterFormIds.DATA_TYPE, ParameterFormIds.AGGREGATION],
        showIf: (dependantValues) => // show form element for expression and copy number frequencies
          (dependantValues[1].value === 'frequency' && (dependantValues[0].data === expression || dependantValues[0].data === copyNumber)),
        options: {
          optionsData: [
            {name: '&lt; less than', value: '<', data: '<'},
            {name: '&lt;= less equal', value: '<=', data: '<='},
            {name: 'not equal to', value: '<>', data: '<>'},
            {name: '&gt;= greater equal', value: '>=', data: '>='},
            {name: '&gt; greater than', value: '>', data: '>'}
          ]
        },
        useSession: true
      },
      {
        type: FormElementType.INPUT_TEXT,
        label: 'Comparison Value',
        id: ParameterFormIds.COMPARISON_VALUE,
        dependsOn: [ParameterFormIds.DATA_TYPE, ParameterFormIds.AGGREGATION],
        showIf: (dependantValues) => // show form element for expression and copy number frequencies
          (dependantValues[1].value === 'frequency' && (dependantValues[0].data === expression || dependantValues[0].data === copyNumber)),
        useSession: true
      }
    ];

    form.build(formDesc);

    dialog.onSubmit(() => {
      const data = form.getElementData();

      var score:IScore<number> = new InvertedAggregatedScore(data, data[ParameterFormIds.DATA_SOURCE]);

      /*if(data[ParameterFormIds.AGGREGATION] === 'frequency') {
        switch(data[ParameterFormIds.DATA_TYPE]) {
          case mutation:
            score = new InvertedMutationFrequencyScore(data, data[ParameterFormIds.DATA_SOURCE]);
            break;
          case copyNumber:
          case expression:
            score = new InvertedFrequencyScore(data, data[ParameterFormIds.DATA_SOURCE]);
            break;
        }
      }*/

      //console.log(score, data);

      dialog.hide();
      resolve(score);
      return false;
    });

    dialog.onHide(() => {
      dialog.destroy();
    });

    dialog.show();
  });
}

