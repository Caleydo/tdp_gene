/**
 * Created by Holger Stitz on 10.08.2016.
 */

import {SPECIES_SESSION_KEY} from '../common';
import {defaultSpecies, getSelectedSpecies} from '../common';
import {resolve, IDType} from 'phovea_core/src/idtype';
import {IStartMenuSubSection, IStartMenuSubSectionDesc} from '../extensions';
import {IStartMenuSectionOptions} from 'ordino/src/extensions';
import NamedSetList from 'tdp_core/src/storage/NamedSetList';
import {ENamedSetType, INamedSet, saveNamedSet} from 'tdp_core/src/storage';
import {getTDPData, getTDPLookupUrl} from 'tdp_core/src/rest';
import {FormElementType, FormBuilder} from 'tdp_core/src/form';
import editDialog from 'tdp_core/src/storage/editDialog';
import {select} from 'd3';
import {ICommonDBConfig} from '../views/ACommonList';

export abstract class ACommonSubSection implements IStartMenuSubSection {
  protected readonly data: NamedSetList;
  private readonly idType: IDType;

  /**
   * Set the idType and the default data and build the list
   */
  constructor(parent: HTMLElement, public readonly desc: IStartMenuSubSectionDesc, protected readonly dataSource: ICommonDBConfig, protected readonly options: IStartMenuSectionOptions) {
    this.idType = resolve(desc.idType);
    const createSession = (namedSet: INamedSet) => {
      if (options.session) {
        options.session((<any>this.desc).viewId, {namedSet}, this.getDefaultSessionValues());
      } else {
        console.error('no session factory object given to push new view');
      }
    };
    this.data = new NamedSetList(resolve(desc.idType), createSession, parent.ownerDocument);

    parent.appendChild(this.data.node);

    // convert species to namedset
    this.data.push(<INamedSet>{
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
    this.loadPanels().then((panels) => this.data.push(...panels));

    this.addSearchField();
  }

  update() {
    this.data.update();
  }

  push(namedSet: INamedSet) {
    if (namedSet.idType !== this.idType.id) {
      return false;
    }
    this.data.push(namedSet);
    return true;
  }

  private static panel2NamedSet({id, description}: { id: string, description: string }): INamedSet {
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
    return getTDPData(this.dataSource.db, `${this.dataSource.base}_panel`).then((panels: { id: string, description: string }[]) => {
      return panels.map(ACommonSubSection.panel2NamedSet);
    });
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
        url: getTDPLookupUrl(this.dataSource.db, `${this.dataSource.base}_items`),
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

  protected validate(terms: string[]): Promise<{ id: string, text: string }[]> {
    return getTDPData(this.dataSource.db, `${this.dataSource.base}_items_verfiy`, { //FIXME typo in verify?
      column: this.dataSource.entityName,
      species: getSelectedSpecies(),
      [`filter_${this.dataSource.entityName}`]: terms
    });
  }

  private tokenize(query: { term: string }, options: any, addSelection: (item: { id: string, text: string }) => void) {
    const term = query.term;
    if (term.length === 0) {
      return query;
    }
    const arr = term.split(new RegExp(`[${(options.tokenSeparators || [' ']).join(',')}]+`));
    const last = arr[arr.length - 1];
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
    const $searchWrapper = select(this.data.node.parentElement!).insert('div', ':first-child').attr('class', 'startMenuSearch');

    const formBuilder = new FormBuilder($searchWrapper);
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
      this.options.session((<any>this.desc).viewId, {
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

        const response = await saveNamedSet(name, idType, ids, {
          key: SPECIES_SESSION_KEY,
          value: getSelectedSpecies()
        }, description, isPublic);
        this.push(response);
      });
    });
  }
}

export default ACommonSubSection;
