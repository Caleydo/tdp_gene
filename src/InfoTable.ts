/**
 * Created by Samuel Gratzl on 27.04.2016.
 */

import {AView, IViewContext, ISelection, IView} from 'ordino/src/View';
import * as ajax from 'phovea_core/src/ajax';
import {showErrorModalDialog} from 'ordino/src/Dialogs';
import {IDataSourceConfig, gene, getSelectedSpecies} from './Common';


export class InfoTable extends AView {

  private $table:d3.Selection<IView>;
  private $thead;
  private $tbody;

  constructor(context: IViewContext, private selection: ISelection, parent: Element, private dataSource:IDataSourceConfig, options?) {
    super(context, parent, options);

    this.changeSelection(selection);
  }

  init() {
    super.init();

    this.$node.classed('infoTable', true);

    this.$table = this.$node
      .append('table').classed('table table-striped table-hover table-bordered table-condensed', true);

    this.$thead = this.$table.append('thead');
    this.$thead.append('tr');
    this.$thead.append('th').text('Column');
    this.$thead.append('th').text('Data');

    this.$tbody = this.$table.append('tbody');
  }

  changeSelection(selection: ISelection) {
    this.selection = selection;
    return this.update();
  }

  private async update(updateAll = false) {
    this.setBusy(true);

    try {
      const selectedItems = await this.resolveIds(this.selection.idtype, this.selection.range, 'Ensembl');
      const data = await ajax.getAPIJSON(`/targid/db/${this.dataSource.db}/row`, {
        entities: `'${selectedItems[0]}'`,
        schema: this.dataSource.schema,
        table_name: this.dataSource.tableName,
        entity_name: this.dataSource.entityName,
        species: getSelectedSpecies()
      });
      this.setBusy(false);
      this.updateInfoTable(data[0]);
    } catch(error) {
      console.error(error);
      this.setBusy(false);
    }
  }

  private updateInfoTable(data) {
    this.createTable(data);
  }

  private createTable(data) {
    const tuples = [];
    for(const key in data) {
      if(data.hasOwnProperty(key)) {
        tuples.push([key, data[key]]);
      }
    }

    const $tr = this.$tbody.selectAll('tr').data(tuples);

    $tr.enter().append('tr');
    $tr.selectAll('td').data((d) => d).enter().append('td').html((d) => `<td>${d}</td>`);

    $tr.exit().remove();
  }
}

export function createGeneInfo(context:IViewContext, selection: ISelection, parent:Element, options?) {
  return new InfoTable(context, selection, parent, gene, options);
}

