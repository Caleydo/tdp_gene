/**
 * Created by Holger Stitz on 10.08.2016.
 */

import {IPluginDesc} from 'phovea_core/src/plugin';
import {AEntryPointList, IEntryPointOptions} from 'ordino/src/StartMenu';
import {ParameterFormIds, defaultSpecies, IDataSourceConfig, getSelectedSpecies} from './Common';
import {INamedSet, ENamedSetType} from 'ordino/src/storage';
import {getAPIJSON, api2absURL, sendAPI} from 'phovea_core/src/ajax';
import * as session from 'phovea_core/src/session';
import {IViewContext, ISelection} from 'ordino/src/View';
import {ALineUpView2} from 'ordino/src/LineUpView';
import {FormBuilder, IFormSelectDesc, FormElementType, IFormSelect2Element} from 'ordino/src/FormBuilder';
import {createStart} from './GeneEntryPoint';
import {TargidConstants} from 'ordino/src/Targid';
import {generateDialog} from 'phovea_ui/src/dialogs';

export abstract class ACommonEntryPointList extends AEntryPointList {

  /**
   * Set the idType and the default data and build the list
   * @param parent
   * @param desc
   * @param dataSource
   * @param options
   */
  constructor(protected parent: HTMLElement, public desc: IPluginDesc, private dataSource: IDataSourceConfig, protected options: IEntryPointOptions) {
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

    const startMenu = this.build();
    startMenu.then(() => this.addSearchField());
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

  private addSearchField() {
    const $searchWrapper = this.$node.insert('div', ':first-child').attr('class', 'startMenuSearch');

    const formBuilder: FormBuilder = new FormBuilder($searchWrapper);
    formBuilder.appendElement({
      id: `search-${this.dataSource.entityName}`,
      hideLabel: true,
      type: FormElementType.SELECT2,
      attributes: {
        style: 'width:100%',
      },
      options: {
        optionsData: [],
        placeholder: `Search ${this.dataSource.name}`,
        multiple: true,
        tags: true,
        tokenSeparators: [',', ' ', ';', '\t', '\n'],
        ajax: {
          url: api2absURL(`/targid/db/${this.dataSource.db}/single_entity_lookup/lookup`),
          data: (params: any) => {
            return {
              schema: this.dataSource.schema,
              table_name: this.dataSource.tableName,
              id_column: this.dataSource.entityName,
              query_column: this.dataSource.entityName,
              species: getSelectedSpecies(),
              query: params.term,
              page: params.page
            };
          }
        }
      }
    });

    const $searchButton = $searchWrapper.append('div').append('button').classed('btn btn-primary', true).text('Go');
    const $saveSetButton = $searchWrapper.append('div').append('button').classed('btn btn-primary', true).text('Save');

    const searchField = formBuilder.getElementById(`search-${this.dataSource.entityName}`);
    $searchButton.on('click', () => {
      session.store(TargidConstants.NEW_ENTRY_POINT, {
        view: (<any>this.desc).viewId,
        options: {
          search: {
            ids: (<IFormSelect2Element>searchField).values.map((d) => d.id),
            type: this.dataSource.tableName
          }
        }
      });

      // create new graph and apply new view after window.reload (@see targid.checkForNewEntryPoint())
      this.options.targid.graphManager.newRemoteGraph();
    });

    $saveSetButton.on('click', () => {
      const dialog = generateDialog('Save Named Set', 'Save');

      const form = document.createElement('form');

      form.innerHTML = `
        <form id="namedset_form">
        <div class="form-group">
          <label for="namedset_name">Name</label>
          <input type="text" class="form-control" id="namedset_name" placeholder="Name" required="required">
        </div>
        <div class="form-group">
          <label for="namedset_description">Description</label>
          <textarea class="form-control" id="namedset_description" rows="5" placeholder="Description"></textarea>
        </div>
      </form>
      `;

      dialog.onSubmit(() => {
        const name = (<HTMLInputElement>document.getElementById('namedset_name')).value;
        const description = (<HTMLInputElement>document.getElementById('namedset_description')).value;
        const ids = `('${(<IFormSelect2Element>searchField).values.map((d) => d.id).join('\',\'')}')`;

        console.log(<HTMLInputElement>document.getElementById('namedset_description'));

        const data = {
          name,
          idType: this.dataSource.idType,
          ids,
          description,
          subTypeKey: ParameterFormIds.SPECIES,
          subTypeValue: defaultSpecies
        };

        console.log('DATA', data);

        sendAPI('/targid/storage/namedsets', data, 'POST').then((response) => {
          console.log('Response', response);
          dialog.hide();
        });
      });

      dialog.body.appendChild(form);
      dialog.show();
    });
  }
}


export interface IACommonListOptions {
  namedSet?: INamedSet;
  search?: ISearchResult;
}

interface ISearchResult {
  ids: string[];
  type: string;
}

export abstract class ACommonList extends ALineUpView2 {

  /**
   * Initialize LineUp view with named set
   * Override in constructor of extended class
   */
  private namedSet : INamedSet;
  private search: ISearchResult;

  /**
   * Parameter UI form
   */
  private paramForm:FormBuilder;

  constructor(context:IViewContext, selection: ISelection, parent:Element, private dataSource: IDataSourceConfig, options: IACommonListOptions) {
    super(context, selection, parent, options);

    //this.idAccessor = (d) => d._id;
    this.additionalScoreParameter = dataSource;
    this.namedSet = options.namedSet;
    if(!this.namedSet) { this.search = options.search; }
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

    let baseURL: string;

    if(this.namedSet) {
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
      baseURL = `/targid/db/${dataSource.db}/${dataSource.base}${filteredUrl}${predefinedUrl}`;
    } else if(this.search) {
      param.schema = dataSource.schema;
      param.table_name = dataSource.tableName;
      param.species = defaultSpecies;
      param.entity_name = dataSource.entityName;
      param.entities = `'${this.search.ids.join('\',\'')}'`;

      baseURL = `/targid/db/${dataSource.db}/${this.context.desc.dbPath}`;
    }

    return getAPIJSON(baseURL, param);
  }

  getItemName(count) {
    const dataSource = this.getParameter(ParameterFormIds.DATA_SOURCE);
    return (count === 1) ? dataSource.name.toLowerCase() : dataSource.name.toLowerCase() + 's';
  }
}
