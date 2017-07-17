/**
 * Created by Holger Stitz on 27.07.2016.
 */

import * as session from 'phovea_core/src/session';
import {IPluginDesc} from 'phovea_core/src/plugin';
import {IStartMenuSectionEntry, findViewCreators, IEntryPointList, IStartMenuOptions, IStartFactory} from 'ordino/src/StartMenu';
import {Targid} from 'ordino/src/Targid';
import {availableSpecies, defaultSpecies, SPECIES_SESSION_KEY} from './Common';
import * as d3 from 'd3';
import * as $ from 'jquery';
import './style.scss';


const tabSessionKey = 'entityType';
const defaultTabSessionValue = 'celllinedb_genes_start'; //ensembl
export const extensionPoint = 'targidStartEntryPoint';

class SpeciesSelector implements IStartMenuSectionEntry {

  private readonly targid:Targid;
  private readonly entryPointLists:IEntryPointList[] = [];

  /**
   * Set the idType and the default data and build the list
   * @param parent
   * @param desc
   * @param options
   */
  constructor(private readonly parent: HTMLElement, public readonly desc: IPluginDesc,  private readonly options:IStartMenuOptions) {
    this.targid = options.targid;
    this.build();
  }

  getEntryPointLists() {
    return this.entryPointLists;
  }


  private build() {
    const $parent = d3.select(this.parent);
    $parent.html(''); // remove loading element or previous data

    this.buildSpeciesSelection($parent);
    this.buildEntityTypes($parent);
  }

  private buildSpeciesSelection($parent: d3.Selection<HTMLElement>) {
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
        d3.select(this.parentNode).classed('active', true);
        that.entryPointLists.forEach((list) => list.updateList());
      });

    group.append('label')
      .attr('for', (d) => `speciesSelector_${d.value}`)
      .attr('data-title', (d:any) => d.name.charAt(0).toUpperCase() + d.name.slice(1))
      .html((d) => {
        const className = d.iconClass || '';
        let text = '';

        if(!className) {
          text = d.name.substr(0, 1).toUpperCase();
        }

        return `<i class="fa ${className} fa-fw fa-3x" aria-hidden="true">${text}</i>`;
      });

  }

  private buildEntityTypes($parent: d3.Selection<HTMLElement>) {
    // get start views for entry points and sort them by name ASC
    const views = findViewCreators(extensionPoint).sort((a,b) => a.name.toLowerCase().localeCompare(b.name.toLowerCase()));

    if(!session.has(tabSessionKey)) {
      session.store(tabSessionKey, defaultTabSessionValue);
    }

    this.buildEntityTypeSelection($parent, views);
    this.buildEntryPointList($parent, views);
  }

  private buildEntityTypeSelection($parent: d3.Selection<HTMLElement>, views: IStartFactory[]): void {
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
        (<Event>d3.event).preventDefault();
        session.store(tabSessionKey, d.id);
        $(this).tab('show');
      });
  }

  private buildEntryPointList($parent: d3.Selection<HTMLElement>, views: IStartFactory[]): void {
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
      .each(function(entryPointDesc:any) {
        entryPointDesc.build(this, {targid: that.targid})
          .then((entryPoint) => {
            that.entryPointLists.push(<IEntryPointList>entryPoint);
          });
      });
  }
}

export function create(parent: HTMLElement, desc: IPluginDesc, options:IStartMenuOptions) {
  return new SpeciesSelector(parent, desc, options);
}
