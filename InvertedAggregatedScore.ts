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
import {FormBuilder, FormElementType, IFormElementDesc} from '../targid2/FormBuilder';
import {api2absURL} from '../caleydo_core/ajax';


class InvertedAggregatedScore implements IScore<number> {
  constructor(
    private parameter: {
      data_source: IDataSourceConfig,
      data_type:IDataTypeConfig,
      data_subtype:IDataSubtypeConfig,
      bio_type:string,
      aggregation: string
    },
    private dataSource: IDataSourceConfig
  ) {

  }

  createDesc() {
    return {
      type: this.parameter.data_subtype.type,
      label: `${this.parameter.aggregation} ${this.parameter.data_subtype.name} @ ${this.parameter.bio_type}`,
      domain: this.parameter.data_subtype.domain,
      missingValue: this.parameter.data_subtype.missingValue
    };
  }

  compute(ids:ranges.Range, idtype:idtypes.IDType):Promise<any[]> {
    return ajax.getAPIJSON(`/targid/db/${this.dataSource.db}/aggregated_score_inverted${this.parameter.bio_type===all_bio_types ? '_all' : ''}`, {
        schema: this.dataSource.schema,
        entity_name: this.dataSource.entityName,
        table_name: this.parameter.data_type.tableName,
        data_subtype: this.parameter.data_subtype.useForAggregation,
        biotype: this.parameter.bio_type,
        agg: this.parameter.aggregation
      })
      .then((rows:any[]) => {
        if (this.parameter.data_subtype.useForAggregation.indexOf('log2') !== -1) {
          rows = convertLog2ToLinear(rows, 'score');
        }
        return rows;
      });
  }
}


class InvertedMutationFrequencyScore implements IScore<number> {
  constructor(
    private parameter: {
      bio_type:string,
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
      label: `${this.parameter.data_subtype.name} ${this.countOnly ? 'Count' : 'Frequency'} ${this.parameter.bio_type === all_bio_types ? '' : '@ '+this.parameter.bio_type}`,
      domain: this.parameter.data_subtype.domain,
      missingValue: this.parameter.data_subtype.missingValue
    };
  }

  compute(ids:ranges.Range, idtype:idtypes.IDType):Promise<any[]> {
    return ajax.getAPIJSON(`/targid/db/${this.dataSource.db}/mutation_frequency_inverted${this.parameter.bio_type===all_bio_types ? '_all' : ''}`, {
        schema: this.dataSource.schema,
        entity_name: this.dataSource.entityName,
        data_subtype: this.parameter.data_subtype.useForAggregation,
        biotype: this.parameter.bio_type
      })
      .then((rows:any[]) => {
        return rows.map((row) => {
          row.score = this.countOnly ? row.count : row.count / row.total;
          return row;
        });
      });
  }
}


class InvertedFrequencyScore implements IScore<number> {
  constructor(
    private parameter: {
      data_type:IDataTypeConfig,
      data_subtype:IDataSubtypeConfig,
      bio_type:string,
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
      label: `${this.parameter.data_subtype.name} ${this.parameter.comparison_operator} ${this.parameter.comparison_value} ${this.countOnly ? 'Count' : 'Frequency'}  ${this.parameter.bio_type === all_bio_types ? '' : '@ '+this.parameter.bio_type}`,
      domain: this.parameter.data_subtype.domain,
      missingValue: this.parameter.data_subtype.missingValue
    };
  }

  compute(ids:ranges.Range, idtype:idtypes.IDType):Promise<any[]> {
    return ajax.getAPIJSON(`/targid/db/${this.dataSource.db}/frequency_score_inverted${this.parameter.bio_type===all_bio_types ? '_all' : ''}`, {
        schema: this.dataSource.schema,
        entity_name: this.dataSource.entityName,
        table_name: this.parameter.data_type.tableName,
        data_subtype: this.parameter.data_subtype.useForAggregation,
        biotype: this.parameter.bio_type,
        operator: this.parameter.comparison_operator,
        value: this.parameter.comparison_value
      })
      .then((rows:any[]) => {
        return rows.map((row) => {
          row.score = this.countOnly ? row.count : row.count / row.total;
          return row;
        });
      });
  }
}

class SingleGeneScore implements IScore<any> {
  constructor(
    private parameter: {
      data_source: IDataSourceConfig,
      data_type:IDataTypeConfig,
      data_subtype:IDataSubtypeConfig,
      tumor_type:string,
      aggregation: string,
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

  compute(ids:ranges.Range, idtype:idtypes.IDType):Promise<any[]> {
    return ajax.getAPIJSON(`/targid/db/${this.dataSource.db}/single_entity_score_inverted` , {
        schema: this.dataSource.schema,
        entity_name: this.dataSource.entityName,
        table_name: this.parameter.data_type.tableName,
        data_subtype: this.parameter.data_subtype.id,
        entity_value: this.parameter.entity_value.id
      })
      .then((rows:any[]) => {
        if (this.parameter.data_subtype.useForAggregation.indexOf('log2') !== -1) {
          rows = convertLog2ToLinear(rows, 'score');
        }
        return rows;
      });
  }
}

export function create(desc: IPluginDesc, dataSource:IDataSourceConfig = gene) {
  // resolve promise when closing or submitting the modal dialog
  return new Promise((resolve) => {
    const dialog = dialogs.generateDialog('Add Score Column', 'Add Score Column');

    const form:FormBuilder = new FormBuilder(d3.select(dialog.body));
    const formDesc:IFormElementDesc[] = [
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
        label: `Filter By`,
        id: ParameterFormIds.FILTER_BY,
        options: {
          optionsData: [
            {name: 'Bio Type', value:'bio_type', data:'bio_type'},
            {name: 'Single Gene', value:'single_entity', data:'single_entity'}
          ]
        },
        useSession: true
      },
      {
        type: FormElementType.SELECT2,
        label: 'Gene Symbol',
        id: ParameterFormIds.GENE_SYMBOL,
        dependsOn: [ParameterFormIds.FILTER_BY],
        showIf: (dependantValues) => (dependantValues[0].value === 'single_entity'),
        attributes: {
          style: 'width:100%'
        },
        options: {
          optionsData: [],
          ajax: {
            url: api2absURL(`/targid/db/${dataSource.db}/single_entity_lookup/lookup`),
            data: (params:any) => {
              return {
                schema: gene.schema, // use `gene` explicitly as datasource
                table_name: gene.tableName,
                id_column: gene.entityName,
                query_column: 'symbol',
                query: params.term,
                page: params.page
              };
            }
          },
          templateResult: (item:any) => (item.id) ? `${item.text} <span class="ensg">${item.id}</span>` : item.text,
          templateSelection: (item:any) => (item.id) ? `${item.text} <span class="ensg">${item.id}</span>` : item.text
        },
        useSession: true
      },
      {
        type: FormElementType.SELECT,
        label: 'Bio Type',
        id: ParameterFormIds.BIO_TYPE,
        dependsOn: [ParameterFormIds.FILTER_BY, ParameterFormIds.DATA_SOURCE],
        showIf: (dependantValues) => (dependantValues[0].value === 'bio_type'),
        options: {
          optionsFnc: (selection) => gene.bioTypesWithAll.map((d) => {
            return {name: d, value: d, data: d};
          }),
          optionsData: []
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
        dependsOn: [ParameterFormIds.FILTER_BY, ParameterFormIds.DATA_TYPE],
        options: {
          optionsFnc: (selection) => {
            var r = (<IDataTypeConfig>selection[1].data).dataSubtypes;
            if(selection[0].value === 'bio_type') {
              r = r.filter((d)=>d.type !== ('string'));
            }
            return r.map((ds) => {
              return {name: ds.name, value: ds.id, data: ds};
            });
          },
          optionsData: []
        },
        useSession: true
      },
      {
        type: FormElementType.SELECT,
        label: 'Aggregation',
        id: ParameterFormIds.AGGREGATION,
        dependsOn: [ParameterFormIds.FILTER_BY, ParameterFormIds.DATA_TYPE, ParameterFormIds.BIO_TYPE],
        showIf: (dependantValues) => (dependantValues[0].value === 'bio_type'),
        options: {
          optionsFnc: (selection) => {
            var r = [];
            if(selection[1].data === mutation) {
              r = [
                {name: 'Frequency', value: 'frequency', data: 'frequency'},
                {name: 'Count', value: 'count', data: 'count'}
              ];

            } else if(selection[2].name === all_bio_types) {
              r = [
                {name: 'Count', value: 'count', data: 'count'},
                {name: 'Frequency', value: 'frequency', data: 'frequency'},
                {name: 'Min', value: 'min', data: 'min'},
                {name: 'Max', value: 'max', data: 'max'}
              ];

            } else {
              r = [
                {name: 'Count', value: 'count', data: 'count'},
                {name: 'Frequency', value: 'frequency', data: 'frequency'},
                {name: 'Average', value: 'avg', data: 'avg'},
                {name: 'Min', value: 'min', data: 'min'},
                {name: 'Max', value: 'max', data: 'max'}
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
        dependsOn: [ParameterFormIds.DATA_TYPE, ParameterFormIds.AGGREGATION, ParameterFormIds.FILTER_BY],
        showIf: (dependantValues) => // show form element for expression and copy number frequencies
          (dependantValues[2].value === 'bio_type' && (dependantValues[1].value === 'frequency' || dependantValues[1].value === 'count')  && (dependantValues[0].data === expression || dependantValues[0].data === copyNumber)),
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
        dependsOn: [ParameterFormIds.DATA_TYPE, ParameterFormIds.AGGREGATION, ParameterFormIds.FILTER_BY],
        showIf: (dependantValues) => // show form element for expression and copy number frequencies
          (dependantValues[2].value === 'bio_type' && (dependantValues[1].value === 'frequency' || dependantValues[1].value === 'count') && (dependantValues[0].data === expression || dependantValues[0].data === copyNumber)),
        useSession: true
      }
    ];

    form.build(formDesc);

    dialog.onSubmit(() => {
      const data = form.getElementData();

      var score:IScore<number>;

      switch(data[ParameterFormIds.FILTER_BY]) {
        case 'single_entity':
          data.entity_value = data[ParameterFormIds.GENE_SYMBOL];
          score = createSingleGeneScore(data);
          break;

        default:
          score = createInvertedAggregatedScore(data);
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

function createSingleGeneScore(data):IScore<number> {
  return new SingleGeneScore(data, data[ParameterFormIds.DATA_SOURCE]);
}

function createInvertedAggregatedScore(data):IScore<number> {
  var score:IScore<number> = new InvertedAggregatedScore(data, data[ParameterFormIds.DATA_SOURCE]);

  if(data[ParameterFormIds.AGGREGATION] === 'frequency' || data[ParameterFormIds.AGGREGATION] === 'count') {

    // boolean to indicate that the resulting score does not need to be divided by the total count
    var countOnly = false;
    if (data[ParameterFormIds.AGGREGATION] === 'count') {
      countOnly = true;
    }
    switch(data[ParameterFormIds.DATA_TYPE]) {
      case mutation:
        score = new InvertedMutationFrequencyScore(data, data[ParameterFormIds.DATA_SOURCE], countOnly);
        break;
      case copyNumber:
      case expression:
        score = new InvertedFrequencyScore(data, data[ParameterFormIds.DATA_SOURCE], countOnly);
        break;
    }
  }

  return score;
}
