/**
 * Created by Holger Stitz on 27.07.2016.
 */
import { UserSession } from 'phovea_core';
import { PluginRegistry } from 'phovea_core';
import { Species } from '../common/common';
import { select, event as d3event } from 'd3';
import * as $ from 'jquery';
import '../scss/main.scss';
import { EXTENSION_POINT_STARTMENU_SUBSECTION } from '../common/extensions';
const tabSessionKey = 'entityType';
const defaultTabSessionValue = 'celllinedb_genes_start'; //ensembl
export class SpeciesSelectorMenuSection {
    constructor(parent, desc, options) {
        this.parent = parent;
        this.desc = desc;
        this.options = options;
        this.subSections = [];
        this.build();
    }
    build() {
        const $parent = select(this.parent);
        $parent.html(''); // remove loading element or previous data
        this.buildSpeciesSelection($parent);
        this.buildEntityTypes($parent);
    }
    push(namedSet) {
        return this.subSections.some((d) => d.push(namedSet));
    }
    buildSpeciesSelection($parent) {
        const $speciesSelection = $parent.append('div').classed('species-wrapper', true);
        const selectedSpecies = UserSession.getInstance().retrieve(Species.SPECIES_SESSION_KEY, Species.defaultSpecies);
        // store default option, if not available
        if (!UserSession.getInstance().has(Species.SPECIES_SESSION_KEY)) {
            UserSession.getInstance().store(Species.SPECIES_SESSION_KEY, selectedSpecies);
        }
        const $group = $speciesSelection.selectAll('.species-group').data(Species.availableSpecies);
        const group = $group.enter()
            .append('div')
            .classed('species-group', true)
            .attr('data-species', (d) => d.value)
            .classed('active', (d) => d.value === selectedSpecies);
        const that = this;
        group.append('input')
            .attr('name', 'species')
            .attr('id', (d) => `speciesSelector_${d.value}`)
            .attr('type', 'radio')
            .attr('checked', (d) => (d.value === selectedSpecies) ? 'checked' : null)
            .on('change', function (d) {
            UserSession.getInstance().store(Species.SPECIES_SESSION_KEY, d.value);
            $group.classed('active', false);
            select(this.parentNode).classed('active', true);
            that.subSections.forEach((list) => list.update());
        });
        group.append('label')
            .attr('for', (d) => `speciesSelector_${d.value}`)
            .attr('data-title', (d) => d.name)
            .html((d) => {
            const className = d.iconClass || '';
            let text = '';
            if (!className) {
                text = d.name.substr(0, 1).toUpperCase();
            }
            return `<i class="fa ${className} fa-fw fa-3x" aria-hidden="true">${text}</i>`;
        });
    }
    buildEntityTypes($parent) {
        // get start views for entry points and sort them by name ASC
        const views = PluginRegistry.getInstance().listPlugins(EXTENSION_POINT_STARTMENU_SUBSECTION).sort((a, b) => a.name.toLowerCase().localeCompare(b.name.toLowerCase()));
        if (!UserSession.getInstance().has(tabSessionKey)) {
            UserSession.getInstance().store(tabSessionKey, defaultTabSessionValue);
        }
        this.buildEntityTypeSelection($parent, views);
        this.buildEntryPointList($parent, views);
    }
    buildEntityTypeSelection($parent, views) {
        const $entityTypes = $parent.append('ul').classed('nav nav-tabs', true).attr('role', 'tablist');
        $entityTypes
            .selectAll('li')
            .data(views)
            .enter()
            .append('li')
            .attr('role', 'presentation')
            .append('a')
            .attr('href', (d) => `#entity_${d.cssClass}`)
            .attr('id', (d) => `entityType_${d.cssClass}`)
            .text((d) => d.description)
            .on('click', function (d) {
            d3event.preventDefault();
            UserSession.getInstance().store(tabSessionKey, d.id);
            $(this).tab('show').blur();
        }).each(function (d) {
            if (d.id === UserSession.getInstance().retrieve(tabSessionKey, defaultTabSessionValue)) {
                this.click();
            }
        });
    }
    buildEntryPointList($parent, views) {
        const that = this;
        const $entryPoints = $parent.append('div').classed('entry-points-wrapper tab-content', true);
        const $items = $entryPoints.selectAll('.item').data(views);
        const $enter = $items.enter()
            .append('div')
            .attr('id', (d) => `entity_${d.cssClass}`)
            .attr('class', (d) => d.id === UserSession.getInstance().retrieve(tabSessionKey, defaultTabSessionValue) ? 'active' : '')
            .classed('tab-pane', true);
        // append initial loading icon --> must be removed by each entry point individually
        $enter.append('div').classed('body', true)
            .html(`
        <div class="loading">
          <i class="fa fa-spinner fa-pulse fa-fw"></i>
          <span class="sr-only">Loading...</span>
        </div>
      `);
        $enter.selectAll('div.body')
            .each(function (desc) {
            const elem = this;
            desc.load().then((i) => {
                elem.innerHTML = ''; //clear loading
                if (i.factory) {
                    return i.factory(elem, desc, that.options);
                }
                console.log(`No viewId and/or factory method found for '${i.desc.id}'`);
                return null;
            }).then((instance) => {
                if (instance) {
                    that.subSections.push(instance);
                }
            });
        });
    }
}
//# sourceMappingURL=SpeciesSelectorMenuSection.js.map