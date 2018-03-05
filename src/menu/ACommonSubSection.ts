/**
 * Created by Holger Stitz on 10.08.2016.
 */

import {getSelectedSpecies, availableSpecies, SPECIES_SESSION_KEY} from '../common';
import {resolve, IDType} from 'phovea_core/src/idtype';
import {IStartMenuSubSection, IStartMenuSubSectionDesc} from '../extensions';
import {IStartMenuSectionOptions} from 'ordino/src/extensions';
import NamedSetList from 'tdp_core/src/storage/NamedSetList';
import {ENamedSetType, INamedSet, saveNamedSet} from 'tdp_core/src/storage';
import {getTDPData, getTDPLookup} from 'tdp_core/src/rest';
import {FormElementType, FormBuilder} from 'tdp_core/src/form';
import editDialog from 'tdp_core/src/storage/editDialog';
import {select, Selection} from 'd3';
import {ICommonDBConfig} from '../views/ACommonList';
import FormSelect3 from 'tdp_core/src/form/internal/FormSelect3';

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

    // convert all available species to namedsets
    const defaultNamedSets = availableSpecies.map((species) => {
      return <INamedSet>{
        name: 'All',
        type: ENamedSetType.CUSTOM,
        subTypeKey: SPECIES_SESSION_KEY,
        subTypeFromSession: true,
        subTypeValue: species.value,
        description: '',
        idType: '',
        ids: '',
        creator: ''
      };
    });

    this.data.push(...defaultNamedSets);
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

  private static panel2NamedSet({id, description, species}: { id: string, description: string, species: string }): INamedSet {
    return {
      type: ENamedSetType.PANEL,
      id,
      name: id,
      description,
      subTypeKey: SPECIES_SESSION_KEY,
      subTypeFromSession: false,
      subTypeValue: species,
      idType: '',
      ids: '',
      creator: ''
    };
  }

  protected loadPanels(): Promise<INamedSet[]> {
    return getTDPData(this.dataSource.db, `${this.dataSource.base}_panel`).then((panels: { id: string, description: string, species: string }[]) => {
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
      search: (query, page, pageSize) => {
        return getTDPLookup(this.dataSource.db, `${this.dataSource.base}_items`, {
          column: this.dataSource.entityName,
          species: getSelectedSpecies(),
          query,
          page,
          pageSize
        })
      },
      validate: ((query) => this.validate(query))
    };
  }

  protected validate(terms: string[]): Promise<{ id: string, text: string }[]> {
    return getTDPData(this.dataSource.db, `${this.dataSource.base}_items_verify/filter`, {
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
    const arr = term.split(/[\s;,]+/);

    const last = arr[arr.length - 1];
    const valid = arr.map((a) => a.trim().toLowerCase()).filter((a) => a.length > 0);
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
      type: FormElementType.SELECT3_MULTIPLE,
      attributes: {
        style: 'width:100%',
      },
      options: this.searchOptions()
    });


    const $searchButton = ACommonSubSection.createButton($searchWrapper, 'Go');
    const $saveSetButton = ACommonSubSection.createButton($searchWrapper, 'Save');

    const searchField = formBuilder.getElementById(`search-${this.dataSource.idType}${this.dataSource.entityName}`);

    searchField.on('change', () => {
      const state = (<FormSelect3>searchField).hasValue() ? null : 'disabled';
      $searchButton.attr('disabled', state);
      $saveSetButton.attr('disabled', state);
    });

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

  private static createButton($parent: Selection<any>, text: string): Selection<HTMLButtonElement> {
    return $parent
      .append('div')
      .append('button')
      .classed('btn btn-primary', true)
      .attr('disabled', 'disabled')
      .text(text);
  }
}

export default ACommonSubSection;
