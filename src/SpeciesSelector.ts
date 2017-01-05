/**
 * Created by Holger Stitz on 27.07.2016.
 */

import * as session from 'phovea_core/src/session';
import {IPluginDesc} from 'phovea_core/src/plugin';
import {IStartMenuSectionEntry, findViewCreators, IEntryPointList} from 'targid2/src/StartMenu';
import {Targid} from 'targid2/src/Targid';
import {availableSpecies, defaultSpecies, ParameterFormIds} from './Common';
import * as d3 from 'd3';

class SpeciesSelector implements IStartMenuSectionEntry {

  private targid:Targid;
  //private format = d3.time.format.utc('%Y-%m-%d %H:%M');

  private sessionKey = ParameterFormIds.SPECIES;

  private entryPointId = 'targidStartEntryPoint';

  private entryPointLists:IEntryPointList[] = [];

  /**
   * Set the idType and the default data and build the list
   * @param parent
   * @param desc
   * @param options
   */
  constructor(protected parent: HTMLElement, public desc: IPluginDesc, protected options:any) {
    this.targid = options.targid;
    this.build();
  }

  public getEntryPointLists() {
    return this.entryPointLists;
  }


  private build() {
    const $parent = d3.select(this.parent);
    $parent.html(''); // remove loading element or previous data

    this.buildSpeciesSelection($parent);
    this.buildEntryPointList($parent);
  }

  private buildSpeciesSelection($parent) {
    const that = this;

    const $speciesSelection = $parent.append('div').classed('species-wrapper', true);

    const selectedSpecies = session.retrieve(this.sessionKey, defaultSpecies);

    // store default option, if not available
    if(session.has(this.sessionKey) === false) {
      session.store(this.sessionKey, selectedSpecies);
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
        session.store(that.sessionKey, d.value);

        $group.classed('active', false);
        d3.select(this.parentNode).classed('active', true);
      });

    group.append('label')
      .attr('for', (d) => `speciesSelector_${d.value}`)
      .attr('data-title', (d:any) => d.name.charAt(0).toUpperCase() + d.name.slice(1))
      .html(`<i class="fa fa-male fa-fw fa-3x" aria-hidden="true"></i>`);

  }

  private buildEntryPointList($parent) {
    const that = this;

    const $entryPoints = $parent.append('div').classed('entry-points-wrapper', true);

    // get start views for entry points and sort them by name ASC
    const views = findViewCreators(this.entryPointId).sort((a,b) => {
      let x = a.name.toLowerCase();
      let y = b.name.toLowerCase();
      return x === y ? 0 : (x < y ? -1 : 1);
    });

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

export function createStartFactory(parent: HTMLElement, desc: IPluginDesc, options:any) {
  return new SpeciesSelector(parent, desc, options);
}
