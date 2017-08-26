/**
 * Created by Holger Stitz on 27.07.2016.
 */

import * as session from 'phovea_core/src/session';
import {IPluginDesc, list as listPlugins} from 'phovea_core/src/plugin';
import {availableSpecies, defaultSpecies, SPECIES_SESSION_KEY} from '../common';
import {select, event as d3event, Selection} from 'd3';
import * as $ from 'jquery';
import '../style.scss';
import {IStartMenuSection, IStartMenuSectionOptions} from 'ordino/src/extensions';
import {INamedSet} from 'tdp_core/src/storage';
import {
  EXTENSION_POINT_STARTMENU_SUBSECTION, IStartMenuSubSection,
  IStartMenuSubSectionDesc
} from '../extensions';


const tabSessionKey = 'entityType';
const defaultTabSessionValue = 'celllinedb_genes_start'; //ensembl

export default class SpeciesSelectorMenuSection implements IStartMenuSection {

  private readonly subSections: IStartMenuSubSection[] = [];

  constructor(private readonly parent: HTMLElement, public readonly desc: IPluginDesc, private readonly options:IStartMenuSectionOptions) {
    this.build();
  }

  private build() {
    const $parent = select(this.parent);
    $parent.html(''); // remove loading element or previous data

    this.buildSpeciesSelection($parent);
    this.buildEntityTypes($parent);
  }

  push(namedSet: INamedSet) {
    return this.subSections.some((d) => d.push(namedSet));
  }

  private buildSpeciesSelection($parent: Selection<HTMLElement>) {
    const $speciesSelection = $parent.append('div').classed('species-wrapper', true);

    const selectedSpecies = session.retrieve(SPECIES_SESSION_KEY, defaultSpecies);

    // store default option, if not available
    if(!session.has(SPECIES_SESSION_KEY)) {
      session.store(SPECIES_SESSION_KEY, selectedSpecies);
    }

    const $group = $speciesSelection.selectAll('.species-group').data(availableSpecies);
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
      .on('change', function(d) {
        session.store(SPECIES_SESSION_KEY, d.value);

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

        if(!className) {
          text = d.name.substr(0, 1).toUpperCase();
        }

        return `<i class="fa ${className} fa-fw fa-3x" aria-hidden="true">${text}</i>`;
      });

  }

  private buildEntityTypes($parent: Selection<HTMLElement>) {
    // get start views for entry points and sort them by name ASC
    const views = <IStartMenuSubSectionDesc[]>listPlugins(EXTENSION_POINT_STARTMENU_SUBSECTION).sort((a,b) => a.name.toLowerCase().localeCompare(b.name.toLowerCase()));

    if(!session.has(tabSessionKey)) {
      session.store(tabSessionKey, defaultTabSessionValue);
    }

    this.buildEntityTypeSelection($parent, views);
    this.buildEntryPointList($parent, views);
  }

  private buildEntityTypeSelection($parent: Selection<HTMLElement>, views: IStartMenuSubSectionDesc[]): void {
    const $entityTypes = $parent.append('ul').classed('nav nav-tabs', true).attr('role', 'tablist');

    $entityTypes
      .selectAll('li')
      .data(views)
      .enter()
      .append('li')
      .attr('class', (d) => d.id === session.retrieve(tabSessionKey, defaultTabSessionValue)? 'active' : null)
      .attr('role', 'presentation')
      .append('a')
      .attr('href', (d) => `#entity_${d.cssClass}`)
      .attr('id', (d) => `entityType_${d.cssClass}`)
      .text((d) => d.description)
      .on('click', function(d) {
        (<Event>d3event).preventDefault();
        session.store(tabSessionKey, d.id);
        $(this).tab('show');
      });
  }

  private buildEntryPointList($parent: Selection<HTMLElement>, views: IStartMenuSubSectionDesc[]): void {
    const that = this;
    const $entryPoints = $parent.append('div').classed('entry-points-wrapper tab-content', true);

    const $items = $entryPoints.selectAll('.item').data(views);
    const $enter = $items.enter()
      .append('div')
      .attr('id', (d) => `entity_${d.cssClass}`)
      .attr('class', (d) => d.id === session.retrieve(tabSessionKey, defaultTabSessionValue)? 'active' : '')
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
      .each(function (this: HTMLElement, desc) {
        const elem = this;
        desc.load().then((i) => {
          if (i.factory) {
            return <IStartMenuSubSection>i.factory(elem, desc, that.options);
          }
          console.log(`No viewId and/or factory method found for '${i.desc.id}'`);
          return null;
        }).then((instance: IStartMenuSubSection) => {
          if (instance) {
            that.subSections.push(instance);
          }
          });
      });
  }
}
