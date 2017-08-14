/**
 * Created by Holger Stitz on 10.08.2016.
 */

import {IPluginDesc} from 'phovea_core/src/plugin';
import {SPECIES_SESSION_KEY} from '../Common';
import {AEntryPointList, IEntryPointOptions} from 'ordino/src/StartMenu';
import {defaultSpecies, getSelectedSpecies} from '../Common';
import {INamedSet, ENamedSetType, editDialog} from 'ordino/src/storage';
import {getAPIJSON, api2absURL} from 'phovea_core/src/ajax';
import {FormBuilder, FormElementType} from 'ordino/src/FormBuilder';
import {saveNamedSet} from 'ordino/src/storage';
import {resolve} from 'phovea_core/src/idtype/manager';

export interface ICommonDBConfig {
  idType: string;
  name: string;
  db: string;
  base: string;
  entityName: string;
  tableName: string;
}

export abstract class ACommonEntryPointList extends AEntryPointList {

  /**
   * Set the idType and the default data and build the list
   * @param parent
   * @param desc
   * @param options
   */
  constructor(protected parent: HTMLElement, public desc: IPluginDesc, protected dataSource: ICommonDBConfig, protected options: IEntryPointOptions) {
    super(parent, desc, options);

    this.idType = dataSource.idType;


    // convert species to namedset
    this.data.unshift(<INamedSet>{
      name: 'All',
      type: ENamedSetType.CUSTOM,
      subTypeKey: SPECIES_SESSION_KEY,
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
      subTypeKey: SPECIES_SESSION_KEY,
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

  protected searchOptions(): any {
    return {
      return: 'id',
      optionsData: [],
      placeholder: `Search ${this.dataSource.name}`,
      tags: true,
      tokenSeparators: [',', ' ', ';', '\t'],
      tokenizer: this.tokenize.bind(this),
      createTag: () => null,
      ajax: {
        url: api2absURL(`/targid/db/${this.dataSource.db}/${this.dataSource.base}_items/lookup`),
        data: (params: any) => {
          return {
            column: this.dataSource.entityName,
            species: getSelectedSpecies(),
            query: params.term === undefined ? '' : params.term,
            page: params.page === undefined ? 0 : params.page
          };
        }
      }
    };
  }

  protected validate(terms: string[]): Promise<{id: string, text: string}[]> {
    return getAPIJSON(`/targid/db/${this.dataSource.db}/${this.dataSource.base}_items_verfiy/filter`, {
      column: this.dataSource.entityName,
      species: getSelectedSpecies(),
      [`filter_${this.dataSource.entityName}`]: terms,
    });
  }

  private tokenize(query: { term: string}, options: any, addSelection: (item: {id: string, text: string})=>void) {
    const term = query.term;
    if (term.length === 0) {
      return query;
    }
    const arr = term.split(new RegExp(`[${(options.tokenSeparators || [' ']).join(',')}]+`));
    const last = arr[arr.length-1];
    const valid = arr.map((a) => a.trim()).filter((a) => a.length > 0);
    if (valid.length > 1) {
      this.validate(valid).then((items) => {
        items.forEach((item) => addSelection(item));
      });
    }
    return {
      term: last
    };
  }

  protected getDefaultSessionValues() {
    // initialize the session with the selected species
    return {
      [SPECIES_SESSION_KEY]: getSelectedSpecies()
    };
  }

  private addSearchField() {
    const $searchWrapper = this.$node.insert('div', ':first-child').attr('class', 'startMenuSearch');

    const formBuilder: FormBuilder = new FormBuilder($searchWrapper);
    formBuilder.appendElement({
      id: `search-${this.dataSource.idType}${this.dataSource.entityName}`,
      hideLabel: true,
      type: FormElementType.SELECT2_MULTIPLE,
      attributes: {
        style: 'width:100%',
      },
      options: this.searchOptions()
    });

    const $searchButton = $searchWrapper.append('div').append('button').classed('btn btn-primary', true).text('Go');
    const $saveSetButton = $searchWrapper.append('div').append('button').classed('btn btn-primary', true).text('Save');

    const searchField = formBuilder.getElementById(`search-${this.dataSource.idType}${this.dataSource.entityName}`);
    $searchButton.on('click', () => {
      this.options.targid.initNewSession((<any>this.desc).viewId, {
          search: {
            ids: searchField.value,
            type: this.dataSource.tableName
          }
        }, this.getDefaultSessionValues());
    });

    $saveSetButton.on('click', () => {
      editDialog(null, async (name, description, isPublic) => {
        const idStrings = searchField.value;

        const idType = resolve(this.dataSource.idType);
        const ids = await idType.map(idStrings);

        const response = await saveNamedSet(name, idType, ids, {key: SPECIES_SESSION_KEY, value: getSelectedSpecies()}, description, isPublic);
        this.addNamedSet(response);
      });
    });
  }
}
export default ACommonEntryPointList;
