/**
 * Created by Marc Streit on 28.07.2016.
 */

import * as ajax from 'phovea_core/src/ajax';
import {IViewContext, ISelection} from 'ordino/src/View';
import {
  stringCol, numberCol2, categoricalCol,
  ALineUpView2, IScoreRow
} from 'ordino/src/LineUpView';
import {
  allBioTypes, gene, expression, copyNumber, mutation, mutationCat, IDataTypeConfig,
  chooseDataSource, ParameterFormIds, convertLog2ToLinear, getSelectedSpecies, IDataSourceConfig
} from './Common';
import {FormBuilder, FormElementType, IFormSelectDesc} from 'ordino/src/FormBuilder';

class InvertedRawDataTable extends ALineUpView2 {

  private dataType:IDataTypeConfig;

  /**
   * Parameter UI form
   */
  private paramForm:FormBuilder;
  protected dataSource:IDataSourceConfig;

  constructor(context:IViewContext, selection:ISelection, parent:Element, dataType:IDataTypeConfig, options?) {
    super(context, selection, parent, options);

    this.additionalScoreParameter = this.dataSource = chooseDataSource(context.desc);
    this.dataType = dataType;
  }

  buildParameterUI($parent: d3.Selection<any>, onChange: (name: string, value: any)=>Promise<any>) {
    this.paramForm = new FormBuilder($parent);

    const paramDesc:IFormSelectDesc[] = [
      {
        type: FormElementType.SELECT,
        label: 'Data Source',
        id: ParameterFormIds.DATA_SOURCE,
        visible: false,
        options: {
          optionsData: [this.dataSource].map((ds) => {
            return {name: ds.name, value: ds.name, data: ds};
          })
        }
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
        label: 'Bio Type',
        id: ParameterFormIds.BIO_TYPE,
        options: {
          optionsData: gene.bioTypesWithAll
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
    this.dataSource = this.paramForm.getElementById(ParameterFormIds.DATA_SOURCE).value.data;
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
    const dataSource = gene; //this.getParameter(ParameterFormIds.DATA_SOURCE);
    return ajax.getAPIJSON(`/targid/db/${dataSource.db}/${dataSource.base}/desc`);
  }

  protected initColumns(desc: { idType: string, columns: any}) {
    super.initColumns(desc);

    const columns = [
      stringCol('symbol', 'Symbol', true, 100),
      stringCol('id', 'Ensembl', true, 120),
      stringCol('chromosome', 'Chromosome', true, 150),
      //categoricalCol('species', desc.columns.species.categories, 'Species', true),
      categoricalCol('strand', [{ label: 'reverse strand', name:String(-1)}, { label: 'forward strand', name:String(1)}], 'Strand', true),
      categoricalCol('biotype', desc.columns.biotype.categories, 'Biotype', true),
      stringCol('seqregionstart', 'Seq Region Start', false),
      stringCol('seqregionend', 'Seq Region End', false)
    ];

    this.build([], columns);
    this.handleSelectionColumns(this.selection);

    return columns;
  }

  protected loadRows() {
    const dataSource = this.getParameter(ParameterFormIds.DATA_SOURCE);
    const url = `/targid/db/${dataSource.db}/raw_data_table_inverted${this.getParameter(ParameterFormIds.BIO_TYPE) === allBioTypes ? '_all' : ''}`;
    const param = {
      schema: dataSource.schema,
      entity_name: dataSource.entityName,
      table_name: this.dataType.tableName,
      data_subtype: this.getParameter(ParameterFormIds.DATA_SUBTYPE).id,
      biotype: this.getParameter(ParameterFormIds.BIO_TYPE),
      species: getSelectedSpecies()
    };
    return ajax.getAPIJSON(url, param);
  }

  protected mapRows(rows:any[]) {
    rows = super.mapRows(rows);
    return rows;
  }

  protected async getSelectionColumnDesc(id: number) {
    const label = await this.getSelectionColumnLabel(id);
    const dataSubType = this.getParameter(ParameterFormIds.DATA_SUBTYPE);

    if (dataSubType.type === 'boolean') {
      return stringCol(this.getSelectionColumnId(id), label, true, 50, id);
    } else if (dataSubType.type === 'string') {
      return stringCol(this.getSelectionColumnId(id), label, true, 50, id);
    } else if (dataSubType.type === 'cat') {
      if (this.dataType === mutation) {
        return categoricalCol(this.getSelectionColumnId(id), mutationCat.map((d) => d.value), label, true, 50, id);
      } else {
        return categoricalCol(this.getSelectionColumnId(id), dataSubType.categories, label, true, 50, id);
      }
    }
    return numberCol2(this.getSelectionColumnId(id), dataSubType.domain[0], dataSubType.domain[1], label, true, 50, id);
  }

  protected getSelectionColumnLabel(id: number) {
    // TODO When playing the provenance graph, the RawDataTable is loaded before the GeneList has finished loading, i.e. that the local idType cache is not build yet and it will send an unmap request to the server
    return this.resolveId(this.selection.idtype, id);
  }

  protected async loadSelectionColumnData(id: number): Promise<IScoreRow<any>[]> {
    const dataSource = this.getParameter(ParameterFormIds.DATA_SOURCE);
    // TODO When playing the provenance graph, the RawDataTable is loaded before the GeneList has finished loading, i.e. that the local idType cache is not build yet and it will send an unmap request to the server
    const name = await this.resolveId(this.selection.idtype, id);
    return <Promise<IScoreRow<any>[]>>ajax.getAPIJSON(`/targid/db/${dataSource.db}/raw_data_table_inverted_column`, {
      entity_value: name, // selected cell line name or tissue name
      schema: dataSource.schema,
      entity_name: dataSource.entityName,
      table_name: this.dataType.tableName,
      data_subtype: this.getParameter(ParameterFormIds.DATA_SUBTYPE).id
    });
  }

  protected mapSelectionRows(rows:IScoreRow<any>[]) {
    if(this.getParameter(ParameterFormIds.DATA_SUBTYPE).useForAggregation.indexOf('log2') !== -1) {
      rows = convertLog2ToLinear(rows, 'score');
    }

    if(this.getParameter(ParameterFormIds.DATA_SUBTYPE).type === 'cat') {
      rows = this.getParameter(ParameterFormIds.DATA_SUBTYPE).mapCategoryRows(rows, 'score');
    }

    return rows;
  }

  getItemName(count: number) {
    const dataSource = this.getParameter(ParameterFormIds.DATA_SOURCE);
    return (count === 1) ? dataSource.name.toLowerCase() : dataSource.name.toLowerCase() + 's';
  }
}

export function createExpressionTable(context:IViewContext, selection:ISelection, parent:Element, options?) {
  return new InvertedRawDataTable(context, selection, parent, expression, options);
}

export function createCopyNumberTable(context:IViewContext, selection:ISelection, parent:Element, options?) {
  return new InvertedRawDataTable(context, selection, parent, copyNumber, options);
}

export function createMutationTable(context:IViewContext, selection:ISelection, parent:Element, options?) {
  return new InvertedRawDataTable(context, selection, parent, mutation, options);
}
