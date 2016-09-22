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
  all_types, dataSources, dataTypes, IDataSourceConfig, IDataTypeConfig, IDataSubtypeConfig, ParameterFormIds,
  expression, copyNumber, mutation, convertLog2ToLinear, cellline
} from './Common';
import {IScore} from '../targid2/LineUpView';
import {FormBuilder, FormElementType, IFormElementDesc} from '../targid2/FormBuilder';
import {api2absURL} from '../caleydo_core/ajax';


class AggregatedScore implements IScore<number> {
  constructor(
    private parameter: {
      data_source: IDataSourceConfig,
      data_type:IDataTypeConfig,
      data_subtype:IDataSubtypeConfig,
      tumor_type:string,
      aggregation: string
    },
    private dataSource: IDataSourceConfig
  ) {

  }

  createDesc() {
    return {
      type: this.parameter.data_subtype.type,
      label: `${this.parameter.aggregation} ${this.parameter.data_subtype.name} @ ${this.parameter.tumor_type}`,
      domain: this.parameter.data_subtype.domain,
      missingValue: this.parameter.data_subtype.missingValue
    };
  }

  compute(ids:ranges.Range, idtype:idtypes.IDType, idMapper:(id:string) => number):Promise<{ [id:string]:number }> {

    return ajax.getAPIJSON(`/targid/db/${this.dataSource.db}/no_assigner/aggregated_score${this.parameter.tumor_type===all_types ? '_all' : ''}`, {
        schema: this.dataSource.schema,
        entity_name: this.dataSource.entityName,
        table_name: this.parameter.data_type.tableName,
        data_subtype: this.parameter.data_subtype.useForAggregation,
        tumortype: this.parameter.tumor_type,
        agg: this.parameter.aggregation
      })
      .then((rows:any[]) => {

        // convert log2 to linear scale
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

class MutationFrequencyScore implements IScore<number> {
  constructor(
    private parameter: {
      tumor_type:string,
      data_subtype:IDataSubtypeConfig,
      comparison_operator: string,
      comparison_value: number
    },
    private dataSource: IDataSourceConfig,
    private countOnly
  ) {

  }

  createDesc() {
    return {
      type: 'number',
      label: `${this.parameter.data_subtype.name} ${this.countOnly ? 'Count' : 'Frequency'} ${this.parameter.tumor_type === all_types ? '' : '@ '+this.parameter.tumor_type}`,
      domain: this.parameter.data_subtype.domain,
      missingValue: this.parameter.data_subtype.missingValue
    };
  }

  compute(ids:ranges.Range, idtype:idtypes.IDType, idMapper:(id:string) => number):Promise<{ [id:string]:number }> {
    return ajax.getAPIJSON(`/targid/db/${this.dataSource.db}/no_assigner/mutation_frequency${this.parameter.tumor_type===all_types ? '_all' : ''}`, {
        schema: this.dataSource.schema,
        entity_name: this.dataSource.entityName,
        data_subtype: this.parameter.data_subtype.useForAggregation,
        tumortype: this.parameter.tumor_type
      })
      .then((rows:any[]) => {
        const r:{ [id:string]:number } = {};
        rows.forEach((row) => {
          r[idMapper(row.id)] = this.countOnly ? row.count : row.count / row.total;
        });
        return r;
      });
  }
}


class FrequencyScore implements IScore<number> {
  constructor(
    private parameter: {
      data_type:IDataTypeConfig,
      data_subtype:IDataSubtypeConfig,
      tumor_type:string,
      comparison_operator: string,
      comparison_value: number
    },
    private dataSource: IDataSourceConfig,
    private countOnly
  ) {

  }

  createDesc() {
    return {
      type: 'number',
      label: `${this.parameter.data_subtype.name} ${this.parameter.comparison_operator} ${this.parameter.comparison_value} ${this.countOnly ? 'Count' : 'Frequency'}  ${this.parameter.tumor_type === all_types ? '' : '@ '+this.parameter.tumor_type}`,
      domain: this.parameter.data_subtype.domain,
      missingValue: this.parameter.data_subtype.missingValue
    };
  }

  compute(ids:ranges.Range, idtype:idtypes.IDType, idMapper:(id:string) => number):Promise<{ [id:string]:number }> {
    return ajax.getAPIJSON(`/targid/db/${this.dataSource.db}/no_assigner/frequency_score${this.parameter.tumor_type===all_types ? '_all' : ''}`, {
        schema: this.dataSource.schema,
        entity_name: this.dataSource.entityName,
        table_name: this.parameter.data_type.tableName,
        data_subtype: this.parameter.data_subtype.useForAggregation,
        tumortype: this.parameter.tumor_type,
        operator: this.parameter.comparison_operator,
        value: this.parameter.comparison_value
      })
      .then((rows:any[]) => {
        const r:{ [id:string]:number } = {};
        rows.forEach((row) => {
          r[idMapper(row.id)] = this.countOnly ? row.count : row.count / row.total;
        });
        return r;
      });
  }
}

class SingleEntityScore implements IScore<any> {
  constructor(
    private parameter: {
      data_source: IDataSourceConfig,
      data_type:IDataTypeConfig,
      data_subtype:IDataSubtypeConfig,
      entity_value: {id:string, text:string}
    },
    private dataSource: IDataSourceConfig
  ) {

  }

  createDesc(): any {
    return {
      type: (this.parameter.data_subtype.type === 'cat') ? 'string' : this.parameter.data_subtype.type,
      label: `${this.parameter.data_subtype.name} of ${this.parameter.entity_value.text}`,
      domain: this.parameter.data_subtype.domain,
      missingValue: this.parameter.data_subtype.missingValue
    };
  }

  compute(ids:ranges.Range, idtype:idtypes.IDType, idMapper:(id:string) => number):Promise<{ [id:string]:any }> {
    return ajax.getAPIJSON(`/targid/db/${this.dataSource.db}/no_assigner/single_entity_score` , {
        schema: this.dataSource.schema,
        entity_name: this.dataSource.entityName,
        table_name: this.parameter.data_type.tableName,
        data_subtype: this.parameter.data_subtype.useForAggregation,
        entity_value: this.parameter.entity_value.id
      })
      .then((rows:any[]) => {
        const r:{ [id:string]:number } = {};
        rows.forEach((row) => {
          r[idMapper(row.id)] = row.score;
        });
        return r;
      });
  }
}

export function create(desc: IPluginDesc) {
  // resolve promise when closing or submitting the modal dialog
  return new Promise((resolve) => {
    const dialog = dialogs.generateDialog('Aggregated Score', 'Add Score Column');

    const form:FormBuilder = new FormBuilder(d3.select(dialog.body));
    const formDesc:IFormElementDesc[] = [
      {
        type: FormElementType.SELECT,
        label: 'Data Source',
        id: ParameterFormIds.DATA_SOURCE,
        options: {
          optionsData: dataSources.map((ds) => {
            return {name: ds.name, value: ds.name, data: ds};
          })
        },
        useSession: true
      },
      {
        type: FormElementType.SELECT,
        label: `Filter By`,
        id: ParameterFormIds.FILTER_BY,
        dependsOn: [ParameterFormIds.DATA_SOURCE],
        options: {
          optionsFnc: (selection) => {
            if(selection[0].data === cellline) {
              return [
                {name: 'Tumor Type', value:'tumor_type', data:'tumor_type'},
                {name: `Single ${selection[0].data.name}`, value: `single_cellline`, data: `single_cellline`}
              ];
            }
            return [
              {name: 'Tumor Type', value:'tumor_type', data:'tumor_type'},
              {name: `Single ${selection[0].data.name}`, value: `single_tissue`, data: `single_tissue`}
            ];
          },
          optionsData: [],
        },
        useSession: true
      },
      {
        type: FormElementType.SELECT2,
        label: 'Cell Line Name',
        id: ParameterFormIds.CELLLINE_NAME,
        dependsOn: [ParameterFormIds.FILTER_BY],
        showIf: (dependantValues) => (dependantValues[0].value === 'single_cellline'),
        attributes: {
          style: 'width:100%'
        },
        options: {
          optionsData: [],
          ajax: {
            url: api2absURL(`/targid/db/${dataSources[0].db}/single_entity_lookup/lookup`),
            data: (params:any) => {
              return {
                schema: dataSources[0].schema,
                table_name: dataSources[0].tableName,
                id_column: dataSources[0].entityName,
                query_column: dataSources[0].entityName,
                query: params.term,
                page: params.page
              };
            }
          }
        },
        useSession: true
      },
      {
        type: FormElementType.SELECT2,
        label: 'Tissue Name',
        id: ParameterFormIds.TISSUE_NAME,
        dependsOn: [ParameterFormIds.FILTER_BY],
        showIf: (dependantValues) => (dependantValues[0].value === 'single_tissue'),
        attributes: {
          style: 'width:100%'
        },
        options: {
          optionsData: [],
          ajax: {
            url: api2absURL(`/targid/db/${dataSources[1].db}/single_entity_lookup/lookup`),
            data: (params:any) => {
              return {
                schema: dataSources[1].schema,
                table_name: dataSources[1].tableName,
                id_column: dataSources[1].entityName,
                query_column: dataSources[1].entityName,
                query: params.term,
                page: params.page
              };
            }
          }
        },
        useSession: true
      },
      {
        type: FormElementType.SELECT,
        label: 'Tumor Type',
        id: ParameterFormIds.TUMOR_TYPE,
        dependsOn: [ParameterFormIds.FILTER_BY, ParameterFormIds.DATA_SOURCE],
        showIf: (dependantValues) => (dependantValues[0].value === 'tumor_type'),
        options: {
          optionsFnc: (selection) => selection[1].data.tumorTypesWithAll,
          optionsData: [],
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
          optionsFnc: (selection) => (<IDataTypeConfig>selection[0].data)
            .dataSubtypes
            .filter((d)=>d.type !== ('string'))
            .map((ds) => {
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
        dependsOn: [ParameterFormIds.FILTER_BY, ParameterFormIds.DATA_TYPE],
        showIf: (dependantValues) => (dependantValues[0].value === 'tumor_type'),
        options: {
          optionsFnc: (selection) => {
            var r = [];
            if(selection[1].data === mutation) {
              r = [
                {name: 'Frequency', value: 'frequency', data: 'frequency'},
                {name: 'Count', value: 'count', data: 'count'}
              ];
            } else {
              r = [
                {name: 'Average', value: 'avg', data: 'avg'},
                {name: 'Min', value: 'min', data: 'min'},
                {name: 'Max', value: 'max', data: 'max'},
                {name: 'Frequency', value: 'frequency', data: 'frequency'},
                {name: 'Count', value: 'count', data: 'count'}
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
          ((dependantValues[1].value === 'frequency' || dependantValues[1].value === 'count')  && (dependantValues[0].data === expression || dependantValues[0].data === copyNumber)),
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
          ((dependantValues[1].value === 'frequency' || dependantValues[1].value === 'count') && (dependantValues[0].data === expression || dependantValues[0].data === copyNumber)),
        useSession: true
      }
    ];

    form.build(formDesc);

    dialog.onSubmit(() => {
      const data = form.getElementData();

      var score:IScore<number>;

      switch(data[ParameterFormIds.FILTER_BY]) {
        case 'single_cellline':
          data.entity_value = data[ParameterFormIds.CELLLINE_NAME];
          score = createSingleEntityScore(data);
          break;

        case 'single_tissue':
          data.entity_value = data[ParameterFormIds.TISSUE_NAME];
          score = createSingleEntityScore(data);
          break;

        default:
          score = createAggregatedScore(data);
      }

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

function createSingleEntityScore(data):IScore<number> {
  return new SingleEntityScore(data, data[ParameterFormIds.DATA_SOURCE]);
}

function createAggregatedScore(data):IScore<number> {
  var score:IScore<number> = new AggregatedScore(data, data[ParameterFormIds.DATA_SOURCE]);

  if(data[ParameterFormIds.AGGREGATION] === 'frequency' || data[ParameterFormIds.AGGREGATION] === 'count') {

    // boolean to indicate that the resulting score does not need to be divided by the total count
    var countOnly = false;
    if (data[ParameterFormIds.AGGREGATION] === 'count') {
      countOnly = true;
    }
    switch(data[ParameterFormIds.DATA_TYPE]) {
      case mutation:
        score = new MutationFrequencyScore(data, data[ParameterFormIds.DATA_SOURCE], countOnly);
        break;
      case copyNumber:
      case expression:
        score = new FrequencyScore(data, data[ParameterFormIds.DATA_SOURCE], countOnly);
        break;
    }
  }

  return score;
}

