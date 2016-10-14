/**
 * Created by Holger Stitz on 27.07.2016.
 */

import session = require('../caleydo_core/session');
import {IPluginDesc} from '../caleydo_core/plugin';
import {IStartMenuSectionEntry} from '../targid2/StartMenu';
import {Targid} from '../targid2/Targid';
import {availableSpecies, ParameterFormIds} from './Common';

class SpeciesSelector implements IStartMenuSectionEntry {

  private targid:Targid;
  //private format = d3.time.format.utc('%Y-%m-%d %H:%M');

  private sessionKey = ParameterFormIds.SPECIES;

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

  private build() {
    const that = this;
    const $parent = d3.select(this.parent);

    $parent.html(''); // remove loading element or previous data

    const selectedSpecies = session.retrieve(this.sessionKey, availableSpecies[0].value);

    // store default option, if not available
    if(session.has(this.sessionKey) === false) {
      session.store(this.sessionKey, selectedSpecies);
    }

    const $label = $parent.selectAll('.species-group').data(availableSpecies);
    const group = $label.enter()
      .append('div')
      .classed('species-group', true);

    group.append('input')
      .attr('name', 'species')
      .attr('id', (d) => `speciesSelector_${d.value}`)
      .attr('type', 'radio')
      .attr('checked', (d) => (d.value === selectedSpecies) ? 'checked' : null)
      .on('change', function(d) {
        session.store(that.sessionKey, d.value);
      });

    group.append('label')
      .attr('for', (d) => `speciesSelector_${d.value}`)
      .attr('data-title', (d:any) => d.name.charAt(0).toUpperCase() + d.name.slice(1))
      .html(`<i class="fa fa-male fa-fw fa-3x" aria-hidden="true"></i>`);

  }
}

export function createStartFactory(parent: HTMLElement, desc: IPluginDesc, options:any) {
  return new SpeciesSelector(parent, desc, options);
}
