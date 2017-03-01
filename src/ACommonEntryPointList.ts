/**
 * Created by Holger Stitz on 10.08.2016.
 */

import {IPluginDesc} from 'phovea_core/src/plugin';
import {AEntryPointList} from 'ordino/src/StartMenu';
import {ParameterFormIds, defaultSpecies, IDataSourceConfig} from './Common';
import {INamedSet, ENamedSetType} from 'ordino/src/storage';
import {getAPIJSON} from 'phovea_core/src/ajax';
import * as session from 'phovea_core/src/session';
import {IViewContext, ISelection} from 'ordino/src/View';
import {ALineUpView2} from 'ordino/src/LineUpView';
import {FormBuilder, IFormSelectDesc, FormElementType} from 'ordino/src/FormBuilder';

export abstract class ACommonEntryPointList extends AEntryPointList {

  /**
   * Set the idType and the default data and build the list
   * @param parent
   * @param desc
   * @param options
   */
  constructor(protected parent: HTMLElement, public desc: IPluginDesc, private dataSource: IDataSourceConfig, protected options: any) {
    super(parent, desc, options);

    this.idType = dataSource.idType;


    // convert species to namedset
    this.data.unshift(<INamedSet>{
      name: 'All',
      type: ENamedSetType.CUSTOM,
      subTypeKey: ParameterFormIds.SPECIES,
      subTypeFromSession: true,
      subTypeValue: defaultSpecies,

      description: '',
      idType: '',
      ids: '',
      creator: ''
    });

    this.build();
  }

  private static panel2NamedSet({id, description}: {id: string, description: string}): INamedSet {
    return {
      type: ENamedSetType.PANEL,
      id,
      name: id,
      description,

      subTypeKey: ParameterFormIds.SPECIES,
      subTypeFromSession: true,
      subTypeValue: defaultSpecies,
      idType: '',
      ids: '',
      creator: ''
    };
  }

  protected loadPanels(): Promise<INamedSet[]> {
    const baseURL = `/targid/db/${this.dataSource.db}/${this.dataSource.base}_panel`;
    return getAPIJSON(baseURL).then((panels: {id: string, description: string}[]) => {
      return panels.map(ACommonEntryPointList.panel2NamedSet);
    });
  }

  protected getNamedSets(): Promise<INamedSet[]> {
    return Promise.all([this.loadPanels(), super.getNamedSets()])
      .then((sets: INamedSet[][]) => [].concat(...sets));
  }
}


export interface IACommonListOptions {
  namedSet: INamedSet;
}

export abstract class ACommonList extends ALineUpView2 {

  /**
   * Initialize LineUp view with named set
   * Override in constructor of extended class
   */
  private namedSet : INamedSet;

  /**
   * Parameter UI form
   */
  private paramForm:FormBuilder;

  constructor(context:IViewContext, selection: ISelection, parent:Element, private dataSource: IDataSourceConfig, options: IACommonListOptions) {
    super(context, selection, parent, options);

    //this.idAccessor = (d) => d._id;
    this.additionalScoreParameter = dataSource;
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
      }
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
    return getAPIJSON(`/targid/db/${dataSource.db}/${dataSource.base}/desc`);
  }

  protected abstract defineColumns(desc: any) : any[];

  protected initColumns(desc) {
    super.initColumns(desc);

    const columns = this.defineColumns(desc);

    this.build([], columns);
    return columns;
  }

  protected loadRows() {
    const dataSource = this.getParameter(ParameterFormIds.DATA_SOURCE);
    let predefinedUrl: string;
    const param: any = {};

    switch(this.namedSet.type) {
      case ENamedSetType.NAMEDSET:
        predefinedUrl = `/namedset/${this.namedSet.id}`;
        break;
      case ENamedSetType.PANEL:
        predefinedUrl = '_panel';
        param.panel = this.namedSet.id;
        break;
      default:
        predefinedUrl = '';
        break;
    }

    // add filtered options
    let filteredUrl = '';

    if(this.namedSet.subTypeKey && this.namedSet.subTypeKey !== '' && this.namedSet.subTypeValue !== 'all') {
      if(this.namedSet.subTypeFromSession) {
        param[this.namedSet.subTypeKey] = session.retrieve(this.namedSet.subTypeKey, this.namedSet.subTypeValue);

      } else {
        param[this.namedSet.subTypeKey] = this.namedSet.subTypeValue;
      }

      filteredUrl = '_filtered';
    }

    const baseURL = `/targid/db/${dataSource.db}/${dataSource.base}${filteredUrl}${predefinedUrl}`;
    return getAPIJSON(baseURL, param);
  }

  getItemName(count) {
    const dataSource = this.getParameter(ParameterFormIds.DATA_SOURCE);
    return (count === 1) ? dataSource.name.toLowerCase() : dataSource.name.toLowerCase() + 's';
  }
}
