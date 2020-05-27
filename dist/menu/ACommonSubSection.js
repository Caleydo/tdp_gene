/**
 * Created by Holger Stitz on 10.08.2016.
 */
import { SpeciesUtils, Species } from '../common/common';
import { resolve } from 'phovea_core';
import { NamedSetList } from 'tdp_core/src/storage/NamedSetList';
import { ENamedSetType, saveNamedSet } from 'tdp_core/src/storage';
import { getTDPData } from 'tdp_core/src/rest';
import { FormElementType, FormBuilder } from 'tdp_core/src/form';
import { editDialog } from 'tdp_core/src/storage/editDialog';
import { select } from 'd3';
export class ACommonSubSection {
    /**
     * Set the idType and the default data and build the list
     */
    constructor(parent, desc, dataSource, options) {
        this.desc = desc;
        this.dataSource = dataSource;
        this.options = options;
        this.idType = resolve(desc.idType);
        const createSession = (namedSet) => {
            if (options.session) {
                options.session(this.desc.viewId, { namedSet }, this.getDefaultSessionValues());
            }
            else {
                console.error('no session factory object given to push new view');
            }
        };
        this.data = new NamedSetList(resolve(desc.idType), createSession, parent.ownerDocument);
        parent.appendChild(this.data.node);
        // convert all available species to namedsets
        const defaultNamedSets = Species.availableSpecies.map((species) => {
            return {
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
    push(namedSet) {
        if (namedSet.idType !== this.idType.id) {
            return false;
        }
        this.data.push(namedSet);
        return true;
    }
    static panel2NamedSet({ id, description, species }) {
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
    loadPanels() {
        return getTDPData(this.dataSource.db, `${this.dataSource.base}_panel`).then((panels) => {
            return panels.map(ACommonSubSection.panel2NamedSet);
        });
    }
    searchOptions() {
        return {
            return: 'id',
            optionsData: [],
            placeholder: `Add ${this.dataSource.name} by Typing or by Dragging a Text File onto the Search Field`
        };
    }
    getDefaultSessionValues() {
        // initialize the session with the selected species
        return {
            [Species.SPECIES_SESSION_KEY]: SpeciesUtils.getSelectedSpecies()
        };
    }
    async addSearchField() {
        const $searchWrapper = select(this.data.node.parentElement).insert('div', ':first-child').attr('class', 'startMenuSearch');
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
        const form = await formBuilder.build();
        const $searchButton = ACommonSubSection.createButton($searchWrapper, 'Go');
        const $saveSetButton = ACommonSubSection.createButton($searchWrapper, 'Save');
        const searchField = form.getElementById(`search-${this.dataSource.idType}${this.dataSource.entityName}`);
        searchField.on('change', () => {
            const state = searchField.hasValue() ? null : 'disabled';
            $searchButton.attr('disabled', state);
            $saveSetButton.attr('disabled', state);
        });
        $searchButton.on('click', () => {
            this.options.session(this.desc.viewId, {
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
                    key: Species.SPECIES_SESSION_KEY,
                    value: SpeciesUtils.getSelectedSpecies()
                }, description, isPublic);
                this.push(response);
            });
        });
    }
    static createButton($parent, text) {
        return $parent
            .append('div')
            .append('button')
            .classed('btn btn-primary', true)
            .attr('disabled', 'disabled')
            .text(text);
    }
}
//# sourceMappingURL=ACommonSubSection.js.map