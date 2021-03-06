/**
 * Created by Holger Stitz on 10.08.2016.
 */

import {SpeciesUtils, Species} from '../common/common';
import {IDTypeManager, IDType, I18nextManager} from 'phovea_core';
import {IStartMenuSubSection, IStartMenuSubSectionDesc} from '../common/extensions';
import {IStartMenuSectionOptions} from 'ordino';
import {NamedSetList} from 'tdp_core';
import {ENamedSetType, INamedSet, RestStorageUtils} from 'tdp_core';
import {RestBaseUtils} from 'tdp_core';
import {FormElementType, FormBuilder} from 'tdp_core';
import {StoreUtils} from 'tdp_core';
import {select, Selection} from 'd3';
import {ICommonDBConfig} from '../views/ACommonList';
import {FormSelect3} from 'tdp_core';
import {IForm} from 'tdp_core';

export abstract class ACommonSubSection implements IStartMenuSubSection {
  protected readonly data: NamedSetList;
  private readonly idType: IDType;

  /**
   * Set the idType and the default data and build the list
   */
  constructor(parent: HTMLElement, public readonly desc: IStartMenuSubSectionDesc, protected readonly dataSource: ICommonDBConfig, protected readonly options: IStartMenuSectionOptions) {
    this.idType = IDTypeManager.getInstance().resolveIdType(desc.idType);
    const createSession = (namedSet: INamedSet) => {
      if (options.session) {
        options.session((<any>this.desc).viewId, {namedSet}, this.getDefaultSessionValues());
      } else {
        console.error('no session factory object given to push new view');
      }
    };
    this.data = new NamedSetList(IDTypeManager.getInstance().resolveIdType(desc.idType), createSession, parent.ownerDocument);

    parent.appendChild(this.data.node);

    // convert all available species to namedsets
    const defaultNamedSets = Species.availableSpecies.map((species) => {
      return <INamedSet>{
        name: 'All',
        type: ENamedSetType.CUSTOM,
        subTypeKey: Species.SPECIES_SESSION_KEY,
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
      subTypeKey: Species.SPECIES_SESSION_KEY,
      subTypeFromSession: false,
      subTypeValue: species,
      idType: ''
    };
  }

  protected loadPanels(): Promise<INamedSet[]> {
    return RestBaseUtils.getTDPData(this.dataSource.db, `${this.dataSource.base}_panel`).then((panels: { id: string, description: string, species: string }[]) => {
      return panels.map(ACommonSubSection.panel2NamedSet);
    });
  }

  protected searchOptions(): any {
    return {
      return: 'id',
      optionsData: [],
      placeholder: `Add ${this.dataSource.name} by Typing or by Dragging a Text File onto the Search Field`
    };
  }

  protected getDefaultSessionValues() {
    // initialize the session with the selected species
    return {
      [Species.SPECIES_SESSION_KEY]: SpeciesUtils.getSelectedSpecies()
    };
  }

  private async addSearchField() {
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

    const form: IForm = await formBuilder.build();

    const $searchButton = ACommonSubSection.createButton($searchWrapper, 'Go');
    const $saveSetButton = ACommonSubSection.createButton($searchWrapper, 'Save');

    const searchField = form.getElementById(`search-${this.dataSource.idType}${this.dataSource.entityName}`);

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
      StoreUtils.editDialog(null, I18nextManager.getInstance().i18n.t(`tdp:core.editDialog.listOfEntities.default`), async (name, description, isPublic) => {
        const idStrings = searchField.value;

        const idType = IDTypeManager.getInstance().resolveIdType(this.dataSource.idType);
        const ids = await idType.map(idStrings);

        const response = await RestStorageUtils.saveNamedSet(name, idType, ids, {
          key: Species.SPECIES_SESSION_KEY,
          value: SpeciesUtils.getSelectedSpecies()
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
