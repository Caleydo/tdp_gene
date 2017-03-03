/**
 * Created by Holger Stitz on 27.07.2016.
 */

import * as session from 'phovea_core/src/session';
import {IPluginDesc} from 'phovea_core/src/plugin';
import {IStartMenuSectionEntry, findViewCreators, IEntryPointList, IStartMenuOptions} from 'ordino/src/StartMenu';
import {Targid} from 'ordino/src/Targid';
import {availableSpecies, defaultSpecies, ParameterFormIds, DEFAULT_ENTITY_TYPE} from './Common';
import * as d3 from 'd3';


const sessionKey = ParameterFormIds.SPECIES;
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

  private buildSpeciesSelection($parent) {
    const $speciesSelection = $parent.append('div').classed('species-wrapper', true);

    const selectedSpecies = session.retrieve(sessionKey, defaultSpecies);

    // store default option, if not available
    if(!session.has(sessionKey)) {
      session.store(sessionKey, selectedSpecies);
    }

    const $group = $speciesSelection.selectAll('.species-group').data(availableSpecies);
    const group = $group.enter()
      .append('div')
      .classed('species-group', true)
      .classed('active', (d) => d.value === selectedSpecies);

    group.append('input')
      .attr('name', 'species')
      .attr('id', (d) => `speciesSelector_${d.value}`)
      .attr('type', 'radio')
      .attr('checked', (d) => (d.value === selectedSpecies) ? 'checked' : null)
      .on('change', function(d) {
        session.store(sessionKey, d.value);

        $group.classed('active', false);
        d3.select(this.parentNode).classed('active', true);
      });

    group.append('label')
      .attr('for', (d) => `speciesSelector_${d.value}`)
      .attr('data-title', (d:any) => d.name.charAt(0).toUpperCase() + d.name.slice(1))
      .html(`<i class="fa fa-male fa-fw fa-3x" aria-hidden="true"></i>`);

  }

  private buildEntityTypes($parent) {
    // get start views for entry points and sort them by name ASC
    const views = findViewCreators(extensionPoint).sort((a,b) => a.name.toLowerCase().localeCompare(b.name.toLowerCase()));

    this.buildEntityTypeSelection($parent, views);
    this.buildEntryPointList($parent, views);
  }

  private buildEntityTypeSelection($parent, views): void {
    const $entityTypes = $parent.append('div').classed('entity-type-selection', true);

    const nodes = $entityTypes
      .selectAll('div')
      .data(views)
      .enter()
      .append('input')
      .attr('type', 'radio')
      .attr('checked', (d) => d.p.cssClass === DEFAULT_ENTITY_TYPE? 'checked' : null)
      .attr('id', (d) => `entityType_${d.p.cssClass}`)
      .attr('title', (d) => d.p.description);


  }

  private buildEntryPointList($parent, views): void {
    const that = this;
    const $entryPoints = $parent.append('div').classed('entry-points-wrapper', true);

    const $items = $entryPoints.selectAll('.item').data(views);
    const $enter = $items.enter().append('div').classed('item', true);

    $enter.append('div').classed('header', true).text((d) => d.name);

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
