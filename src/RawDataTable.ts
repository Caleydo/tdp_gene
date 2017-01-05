/**
 * Created by Marc Streit on 26.07.2016.
 */

import * as ajax from 'phovea_core/src/ajax';
import {IViewContext, ISelection} from 'targid2/src/View';
import {
  stringCol, numberCol2, categoricalCol,
  ALineUpView2, IScoreRow
} from 'targid2/src/LineUpView';
import {
  dataSources, all_types, expression, copyNumber, mutation, ParameterFormIds, IDataTypeConfig, convertLog2ToLinear,
  getSelectedSpecies
} from './Common';
import {FormBuilder, FormElementType, IFormSelectDesc} from 'targid2/src/FormBuilder';

class RawDataTable extends ALineUpView2 {

  private dataType:IDataTypeConfig;

  /**
   * Parameter UI form
   */
  private paramForm:FormBuilder;

  constructor(context:IViewContext, selection:ISelection, parent:Element, dataType:IDataTypeConfig, options?) {
    super(context, selection, parent, options);
    this.dataType = dataType;
  }

  buildParameterUI($parent: d3.Selection<any>, onChange: (name: string, value: any)=>Promise<any>) {
    this.paramForm = new FormBuilder($parent);

    const paramDesc:IFormSelectDesc[] = [
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
        label: 'Data Subtype',
        id: ParameterFormIds.DATA_SUBTYPE,
        options: {
          optionsData: this.dataType.dataSubtypes.map((ds) => {
            return {name: ds.name, value: ds.id, data: ds};
          })
        },
        useSession: true
      },
      {
        type: FormElementType.SELECT,
        label: 'Tumor Type',
        id: ParameterFormIds.TUMOR_TYPE,
        dependsOn: [ParameterFormIds.DATA_SOURCE],
        options: {
          optionsFnc: (selection) => selection[0].data.tumorTypesWithAll,
          optionsData: []
        },
        useSession: true
      }
    ];

    // map FormElement change function to provenance graph onChange function
    paramDesc.forEach((p) => {
      p.options.onChange = (selection, formElement) => onChange(formElement.id, selection.value);
    });

    this.paramForm.build(paramDesc);

    this.updateDataSource();

    // add other fields
    super.buildParameterUI($parent.select('form'), onChange);
  }

  private updateDataSource() {
    this.additionalScoreParameter = this.paramForm.getElementById(ParameterFormIds.DATA_SOURCE).value.data;
  }

  getParameter(name: string): any {
    return this.paramForm.getElementById(name).value.data;
  }

  setParameter(name: string, value: any) {
    this.paramForm.getElementById(name).value = value;
    this.updateDataSource();
    this.clear();
    return this.update();
  }

  protected loadColumnDesc() {
    const dataSource = this.getParameter(ParameterFormIds.DATA_SOURCE);
    return ajax.getAPIJSON(`/targid/db/${dataSource.db}/${dataSource.base}/desc`);
  }

  protected initColumns(desc) {
    super.initColumns(desc);

    const columns = [
      stringCol('id', 'Name', true, 120),
      //categoricalCol('species', desc.columns.species.categories, 'Species', true),
      categoricalCol('tumortype', desc.columns.tumortype.categories, 'Tumor Type', true),
      categoricalCol('organ', desc.columns.organ.categories, 'Organ', true),
      categoricalCol('gender', desc.columns.gender.categories, 'Gender', true)
    ];

    this.build([], columns);
    this.handleSelectionColumns(this.selection);

    return columns;
  }

  protected loadRows() {
    const dataSource = this.getParameter(ParameterFormIds.DATA_SOURCE);
    const url = `/targid/db/${dataSource.db}/raw_data_table${this.getParameter(ParameterFormIds.TUMOR_TYPE) === all_types ? '_all' : ''}`;
    const param = {
      schema: dataSource.schema,
      entity_name: dataSource.entityName,
      table_name: this.dataType.tableName,
      data_subtype: this.getParameter(ParameterFormIds.DATA_SUBTYPE).id,
      tumortype: this.getParameter(ParameterFormIds.TUMOR_TYPE),
      species: getSelectedSpecies()
    };
    return ajax.getAPIJSON(url, param);
  }

  protected mapRows(rows:any[]) {
    rows = super.mapRows(rows);
    return rows;
  }

  protected getSelectionColumnDesc(id) {
    return this.getSelectionColumnLabel(id)
      .then((label:string) => {
        var desc;
        const dataSubType = this.getParameter(ParameterFormIds.DATA_SUBTYPE);

        if (dataSubType.type === 'boolean') {
          desc = stringCol(this.getSelectionColumnId(id), label, true, 50, id);
        } else if (dataSubType.type === 'string') {
          desc = stringCol(this.getSelectionColumnId(id), label, true, 50, id);
        } else if (dataSubType.type === 'cat') {
          desc = categoricalCol(this.getSelectionColumnId(id), dataSubType.categories, label, true, 50, id);
        } else {
          desc = numberCol2(this.getSelectionColumnId(id), dataSubType.domain[0], dataSubType.domain[1], label, true, 50, id);
        }
        return desc;
      });
  }

  protected getSelectionColumnLabel(id) {
    const dataSource = this.getParameter(ParameterFormIds.DATA_SOURCE);
    // resolve `_id` (= `targidid`) to symbol (`ensg`)
    // TODO When playing the provenance graph, the RawDataTable is loaded before the GeneList has finished loading, i.e. that the local idType cache is not build yet and it will send an unmap request to the server
    return this.resolveId(this.selection.idtype, id)
      .then((ensg) => {
        return ajax.getAPIJSON(`/targid/db/${dataSource.db}/gene_map_ensgs`, {
            ensgs: `'${ensg}'`,
            species: getSelectedSpecies()
          });
      })
      .then((mapping) => {
        // resolve ensg to gene name
        return mapping[0].symbol;
      });
  }

  protected loadSelectionColumnData(id) {
    const dataSource = this.getParameter(ParameterFormIds.DATA_SOURCE);
    // TODO When playing the provenance graph, the RawDataTable is loaded before the GeneList has finished loading, i.e. that the local idType cache is not build yet and it will send an unmap request to the server
    return this.resolveId(this.selection.idtype, id)
      .then((ensg) => {
        return ajax.getAPIJSON(`/targid/db/${dataSource.db}/raw_data_table_column`, {
          ensg: ensg,
          schema: dataSource.schema,
          entity_name: dataSource.entityName,
          table_name: this.dataType.tableName,
          data_subtype: this.getParameter(ParameterFormIds.DATA_SUBTYPE).id
        });
      });
  }

  protected mapSelectionRows(rows:IScoreRow<any>[]) {
    if(this.getParameter(ParameterFormIds.DATA_SUBTYPE).useForAggregation.indexOf('log2') !== -1) {
      rows = convertLog2ToLinear(rows, 'score');
    }

    if(this.getParameter(ParameterFormIds.DATA_SUBTYPE).type === 'cat') {
      rows = rows
        .filter((row) => row.score !== null)
        .map((row) => {
          row.score = row.score.toString();
          return row;
        });
    }

    if(this.getParameter(ParameterFormIds.DATA_SUBTYPE).type === 'cat') {
      rows = this.getParameter(ParameterFormIds.DATA_SUBTYPE).mapCategoryRows(rows, 'score');
    }

    return rows;
  }

  getItemName(count) {
    const dataSource = this.getParameter(ParameterFormIds.DATA_SOURCE);
    return (count === 1) ? dataSource.name.toLowerCase() : dataSource.name.toLowerCase() + 's';
  }
}



export function createExpressionTable(context:IViewContext, selection:ISelection, parent:Element, options?) {
  return new RawDataTable(context, selection, parent, expression, options);
}

export function createCopyNumberTable(context:IViewContext, selection:ISelection, parent:Element, options?) {
  return new RawDataTable(context, selection, parent, copyNumber, options);
}

export function createMutationTable(context:IViewContext, selection:ISelection, parent:Element, options?) {
  return new RawDataTable(context, selection, parent, mutation, options);
}