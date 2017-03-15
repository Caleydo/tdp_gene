/**
 * Created by Samuel Gratzl on 27.04.2016.
 */

import {AView, IViewContext, ISelection, IView} from 'ordino/src/View';
import {getAPIJSON} from 'phovea_core/src/ajax';
import {IDataSourceConfig, cellline, tissue, gene, getSelectedSpecies} from './Common';


export abstract class AInfoTable extends AView {

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

  private async update() {
    this.setBusy(true);

    try {
      const selectedItems = await this.resolveIds(this.selection.idtype, this.selection.range, this.dataSource.idType);
      const data = await getAPIJSON(`/targid/db/${this.dataSource.db}/row`, {
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

    // append a td element to each tr using a nested D3 selection
    $tr.selectAll('td').data((d) => d).enter().append('td').text((d) => d);

    $tr.exit().remove();
  }
}

class CelllineInfoTable extends AInfoTable {
  constructor(context, selection, parent, options) {
    super(context, selection, parent, cellline, options);
  }
}

class GeneInfoTable extends AInfoTable {
  constructor(context, selection, parent, options) {
    super(context, selection, parent, gene, options);
  }
}

class TissueInfoTable extends AInfoTable {
  constructor(context, selection, parent, options) {
    super(context, selection, parent, tissue, options);
  }
}

export function createCelllineInfoTable(context:IViewContext, selection: ISelection, parent:Element, options?) {
  return new CelllineInfoTable(context, selection, parent, options);
}

export function createGeneInfoTable(context:IViewContext, selection: ISelection, parent:Element, options?) {
  return new GeneInfoTable(context, selection, parent, options);
}

export function createTissueInfoTable(context:IViewContext, selection: ISelection, parent:Element, options?) {
  return new TissueInfoTable(context, selection, parent, options);
}
