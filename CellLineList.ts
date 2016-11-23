/**
 * Created by Samuel Gratzl on 29.01.2016.
 */

import session = require('../caleydo_core/session');
import ajax = require('../caleydo_core/ajax');
import {IViewContext, ISelection, IAViewOptions} from '../targid2/View';
import {stringCol, categoricalCol, ALineUpView2} from '../targid2/LineUpView';
import {chooseDataSource, ParameterFormIds, IDataSourceConfig} from './Common';
import {INamedSet, ENamedSetType} from '../targid2/storage';
import {FormBuilder, IFormSelectDesc, FormElementType} from '../targid2/FormBuilder';


export interface ICellLineListOptions extends IAViewOptions {
  namedSet: INamedSet;
}

class CellLineList extends ALineUpView2 {

  /**
   * Initialize LineUp view with named set
   * Override in constructor of extended class
   */
  private namedSet : INamedSet;

  /**
   * Parameter UI form
   */
  private paramForm:FormBuilder;


  protected dataSource:IDataSourceConfig;

  constructor(context:IViewContext, selection: ISelection, parent:Element, options: ICellLineListOptions) {
    super(context, selection, parent, options);

    //this.idAccessor = (d) => d._id;

    this.additionalScoreParameter = this.dataSource = chooseDataSource(context.desc);
    this.namedSet = options.namedSet;
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
      }/*,
      {
        type: FormElementType.SELECT,
        label: 'Data Subtype',
        id: ParameterFormIds.DATA_SUBTYPE,
        options: {
          optionsData: expression.dataSubtypes.map((ds) => {
            return {name: ds.name, value: ds.id, data: ds};
          })
        }
      },
      {
        type: FormElementType.SELECT,
        label: 'Tumor Type',
        id: ParameterFormIds.TUMOR_TYPE,
        dependsOn: [ParameterFormIds.DATA_SOURCE],
        options: {
          optionsFnc: (selection) => selection[0].data.bioTypesWithAll,
          optionsData: []
        }
      }*/
    ];

    // map FormElement change function to provenance graph onChange function
    paramDesc.forEach((p) => {
      p.options.onChange = (selection, formElement) => onChange(formElement.id, selection.value);
    });

    this.paramForm.build(paramDesc);

    // add other fields
    super.buildParameterUI($parent.select('form'), onChange);
  }

  getParameter(name: string): any {
    return this.paramForm.getElementById(name).value.data;
  }

  setParameter(name: string, value: any) {
    this.paramForm.getElementById(name).value = value;
    this.clear();
    return this.update();
  }

  /**
   * Get sub type for named sets
   * @returns {{key: string, value: string}}
   */
  protected getSubType() {
    return {
      key: this.namedSet.subTypeKey,
      value: this.namedSet.subTypeValue
    };
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
    return columns;
  }

  protected loadRows() {
    const dataSource = this.getParameter(ParameterFormIds.DATA_SOURCE);
    const namedSetIdUrl = (this.namedSet.type === ENamedSetType.NAMEDSET) ? `/namedset/${this.namedSet.id}` : '';
    const param = {};
    var filteredUrl = '';

    if(this.namedSet.subTypeKey && this.namedSet.subTypeKey !== '' && this.namedSet.subTypeValue !== 'all') {
      if(this.namedSet.subTypeFromSession) {
        param[this.namedSet.subTypeKey] = session.retrieve(this.namedSet.subTypeKey, this.namedSet.subTypeValue);

      } else {
        param[this.namedSet.subTypeKey] = this.namedSet.subTypeValue;
      }

      filteredUrl = '_filtered';
    }

    const baseURL = `/targid/db/${dataSource.db}/${dataSource.base}${filteredUrl}${namedSetIdUrl}`;
    return ajax.getAPIJSON(baseURL, param);
  }

  getItemName(count) {
    const dataSource = this.getParameter(ParameterFormIds.DATA_SOURCE);
    return (count === 1) ? dataSource.name.toLowerCase() : dataSource.name.toLowerCase() + 's';
  }

}

export function createStart(context:IViewContext, selection: ISelection, parent:Element, options: ICellLineListOptions) {
  return new CellLineList(context, selection, parent, options);
}

