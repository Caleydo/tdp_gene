/**
 * Created by Samuel Gratzl on 27.04.2016.
 */
/// <reference path='../../tsd.d.ts' />

import {AView, IViewContext, ISelection, IView} from '../targid2/View';
import * as ajax from 'phovea_core/src/ajax';
import {showErrorModalDialog} from '../targid2/Dialogs';
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
      .append('div').classed('infoTableWrapper', true);
    this.$thead = this.$table.append('table');
    this.$tbody = this.$table.append('tbody');
  }

  changeSelection(selection: ISelection) {
    this.selection = selection;
    return this.update();
  }

  private update(updateAll = false) {
    this.setBusy(true);

    const promise1 = Promise.all([
      this.resolveIds(this.selection.idtype, this.selection.range, 'Ensembl')
    ]);

    // on error
    promise1.catch(showErrorModalDialog)
      .catch((error) => {
        console.error(error);
        this.setBusy(false);
      });

    // on success
    const promise2 = promise1.then((args) => {
        const names = args[0];
        console.log(args);
        return ajax.getAPIJSON(`/targid/db/${this.dataSource.db}/row`, {
          entities: '\''+names.join('\',\'')+'\'',
          schema: this.dataSource.schema,
          table_name: this.dataSource.tableName,
          entity_name: this.dataSource.entityName,
          species: getSelectedSpecies()
        });
      });

    // on error
    promise2.catch(showErrorModalDialog)
      .catch((error) => {
        console.error(error);
        this.setBusy(false);
      });

    // on success
    promise2.then((args) => {
        this.updateInfoTable(args);
      });

    this.setBusy(false);
    return promise2;
  }

  private updateInfoTable(data) {

    //console.log(data.geneName);

    this.createTable(data);
  }

  private createTable(data) {
/*    data.forEach((d) => {
        for(let name in d) {
            if(data[name]) {
                data[name] = [];
            }
            data[name].push(d[name]);
        }
    })


    var output = [];
    for(var name in data) {
      output.push([name].concat(data[name]);
    }

    var $tr = this.$tbody.selectAll('tr').data(data)

    $tr.enter().append('tr');

    $tr.html((d) => `
    <td>${d[0]}</td>
    //<td>${d[1-x]}</td>
    `)


    $tr.exit().remove();
*/
  }
}

export function createGeneInfo(context:IViewContext, selection: ISelection, parent:Element, options?) {
  return new InfoTable(context, selection, parent, gene, options);
}

