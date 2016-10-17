/**
 * Created by Holger Stitz on 12.08.2016.
 */

import ajax = require('../caleydo_core/ajax');
import tooltip = require('../caleydo_d3/tooltip');
import {IViewContext, ISelection, ASmallMultipleView} from '../targid2/View';
import {all_types, dataSources, gene, expression, ParameterFormIds, getSelectedSpecies} from './Common';
import {FormBuilder, FormElementType, IFormSelectDesc, IFormSelectElement} from '../targid2/FormBuilder';
import {showErrorModalDialog} from '../targid2/Dialogs';


export class CoExpression extends ASmallMultipleView {

  protected $insufficientSelection;

  private refGene;
  private refGeneExpression : {id:string, symbol:string, celllinename:string, expression:number}[] = [];

  private x = d3.scale.log();
  private y = d3.scale.log();
  private xAxis = d3.svg.axis().orient('bottom').scale(this.x).tickFormat(this.x.tickFormat(2, '.1f'));//.tickFormat((d) => d.toFixed(1));
  private yAxis = d3.svg.axis().orient('left').scale(this.y).tickFormat(this.y.tickFormat(2, '.1f'));//.tickFormat((d) => d.toFixed(1));

  private paramForm:FormBuilder;
  private paramDesc:IFormSelectDesc[] = [
    {
      type: FormElementType.SELECT,
      label: 'Reference Gene',
      id: ParameterFormIds.REFERENCE_GENE,
      options: {
        optionsData: [],
      },
      useSession: true
    },
    {
      type: FormElementType.SELECT,
      label: 'Data Source',
      id: ParameterFormIds.DATA_SOURCE,
      options: {
        optionsData: dataSources.map((ds) => {
          return {name: ds.name, value: ds.name, data: ds};
        })
      },
      useSession: true
    },
    {
      type: FormElementType.SELECT,
      label: 'Expression',
      id: ParameterFormIds.EXPRESSION_SUBTYPE,
      options: {
        optionsData: expression.dataSubtypes.map((ds) => {
          return {name: ds.name, value: ds.name, data: ds};
        })
      },
      useSession: false
    },
    {
      type: FormElementType.SELECT,
      label: 'Tumor Type',
      id: ParameterFormIds.TUMOR_TYPE,
      dependsOn: [ParameterFormIds.DATA_SOURCE],
      options: {
        optionsFnc: (selection) => selection[0].data.tumorTypesWithAll,
        optionsData: []
      },
      useSession: true
    }
  ];

  constructor(context:IViewContext, private selection: ISelection, parent:Element, options?) {
    super(context, selection, parent, options);
  }

  init() {
    super.init();

    this.$node.classed('coExpression', true);

    this.$insufficientSelection = this.$node.append('p')
      .classed('nodata', true)
      .classed('hidden', true)
      .text('Select two or more genes.');

    // update the refGene select first, then update ref expression data and as last the charts
    this.updateRefGeneSelect()
      .then(() => {
        return this.loadRefGeneData();
      })
      .then(() => {
        this.update();
      });
  }

  buildParameterUI($parent: d3.Selection<any>, onChange: (name: string, value: any)=>Promise<any>) {
    this.paramForm = new FormBuilder($parent);

    // map FormElement change function to provenance graph onChange function
    this.paramDesc.forEach((p) => {
      p.options.onChange = (selection, formElement) => onChange(formElement.id, selection.value);
    });

    this.paramForm.build(this.paramDesc);

    // add other fields
    super.buildParameterUI($parent, onChange);
  }

  getParameter(name: string): any {
    if(this.paramForm.getElementById(name).value === null) {
      return '';
    }

    return this.paramForm.getElementById(name).value.data;
  }

  setParameter(name: string, value: any) {
    this.paramForm.getElementById(name).value = value;
    this.loadRefGeneData().then(() => this.update(true));
  }

  changeSelection(selection:ISelection) {
    this.selection = selection;

    // update the refGene select first, then update the charts
    this.updateRefGeneSelect()
      .then(() => {
        this.update();
      });
  }

  private updateRefGeneSelect() {
    return this.resolveIds(this.selection.idtype, this.selection.range, gene.idType)
      .then((genesEnsembl) => {
        //console.log('Ensembl', genesEnsembl);

        const promise = Promise.resolve(
          ajax.getAPIJSON(`/targid/db/${this.getParameter(ParameterFormIds.DATA_SOURCE).db}/gene_map_ensgs`, {
            ensgs: '\'' + genesEnsembl.join('\',\'') + '\'',
            species: getSelectedSpecies()
          })
        );

        // on error
        promise.catch(showErrorModalDialog)
          .catch((error) => {
            console.error(error);
            this.setBusy(false);
          });

        // on success
        promise.then((input) => {
          const data = input.map((d) => {
            return {
              //use EnsemblID if symbol is empty
              value: (d.symbol) ? d.symbol : d.id,
              name: (d.symbol) ? d.symbol : d.id,
              data: d
            };
          });
          //console.log('gene symbols', data);

          const refGeneSelect = this.paramForm.getElementById(ParameterFormIds.REFERENCE_GENE);

          // backup entry and restore the selectedIndex by value afterwards again,
          // because the position of the selected element might change
          const bak = refGeneSelect.value;
          (<IFormSelectElement>refGeneSelect).updateOptionElements(data);

          if(bak !== null) {
            refGeneSelect.value = bak;
          }

          // set reference gene
          this.refGene = refGeneSelect.value;
        });

        return promise;
      });
  }

  private loadRefGeneData() {
    this.refGene = this.paramForm.getElementById(ParameterFormIds.REFERENCE_GENE).value;

    const url = `/targid/db/${this.getParameter(ParameterFormIds.DATA_SOURCE).db}/co_expression${this.getParameter(ParameterFormIds.TUMOR_TYPE) === all_types ? '_all' : ''}`;
    const param = {
        ensg: this.refGene.data.id,
        schema: this.getParameter(ParameterFormIds.DATA_SOURCE).schema,
        entity_name: this.getParameter(ParameterFormIds.DATA_SOURCE).entityName,
        expression_subtype: this.getParameter(ParameterFormIds.EXPRESSION_SUBTYPE).id,
        tumortype : this.getParameter(ParameterFormIds.TUMOR_TYPE),
        species: getSelectedSpecies()
      };

    return ajax.getAPIJSON(url, param)
      .then((rows) => {
        this.refGeneExpression = this.filterZeroValues(rows);
      });
  }

  /**
   * Filter expression values with 0, because log scale cannot handle log(0)
   * @param rows
   * @returns {any}
   */
  private filterZeroValues(rows) {
    const rows2 = rows.filter((d) => d.expression !== 0 && d.expression !== undefined);
    console.log(`filtered ${rows.length-rows2.length} zero values`);
    return rows2;
  }

  private update(updateAll = false) {
    const that = this;
    const ids = this.selection.range.dim(0).asList();
    const idtype = this.selection.idtype;

    const data:IDataFormat[] = ids
      .filter((id) => id !== this.refGene.data._id) // skip refGene, because it's already loaded
      .map((id) => {
        return {id: id, geneName: '', rows: []};
      });

    // show/hidde message and loading indicator if two less genes are selected
    this.$insufficientSelection.classed('hidden', (data.length > 0));
    this.setBusy((data.length > 0));

    const $plots = this.$node.selectAll('div.plots').data<IDataFormat>(<any>data, (d) => d.id.toString());
    const $plots_enter = $plots.enter().append('div').classed('plots', true);

    // decide whether to load data for newly added items
    // or to reload the data for all items (e.g. due to parameter change)
    const enterOrUpdateAll = (updateAll) ? $plots : $plots_enter;

    enterOrUpdateAll.each(function(d) {
      const $id = d3.select(this);
      const promise = that.resolveId(idtype, d.id, gene.idType)
        .then((name) => {
          return Promise.all([
            ajax.getAPIJSON(`/targid/db/${that.getParameter(ParameterFormIds.DATA_SOURCE).db}/co_expression${that.getParameter(ParameterFormIds.TUMOR_TYPE) === all_types ? '_all' : ''}`, {
              ensg: name,
              schema: that.getParameter(ParameterFormIds.DATA_SOURCE).schema,
              entity_name: that.getParameter(ParameterFormIds.DATA_SOURCE).entityName,
              expression_subtype: that.getParameter(ParameterFormIds.EXPRESSION_SUBTYPE).id,
              tumortype: that.getParameter(ParameterFormIds.TUMOR_TYPE),
              species: getSelectedSpecies()
            }),
            ajax.getAPIJSON(`/targid/db/${that.getParameter(ParameterFormIds.DATA_SOURCE).db}/gene_map_ensgs`, {
              ensgs: '\''+name+'\'',
              species: getSelectedSpecies()
            })
          ]);
        });
      // on error
      promise.catch(showErrorModalDialog)
        .catch((error) => {
          console.error(error);
          that.setBusy(false);
        });
      // on success
      promise.then((input) => {
        // use EnsemblID if symbol is empty
        d.geneName = (input[1][0].symbol) ? input[1][0].symbol : input[1][0].id;
        d.rows = that.filterZeroValues(input[0]);

        //console.log('loaded data for', d.geneName);

        that.initChart($id);
        that.resizeChart($id);
        that.updateChartData($id);

        that.setBusy(false);
      });
    });

    $plots.exit().remove()
      .each(function(d) {
        that.setBusy(false);
      });
  }

  private initChart($parent) {
    // already initialized svg node -> skip this part
    if($parent.select('svg').size() > 0) {
      return;
    }

    const svg = $parent.append('svg')
      .append('g')
      .attr('transform', 'translate(' + this.margin.left + ',' + this.margin.top + ')');

    svg.append('g')
      .attr('class', 'title')
      .attr('transform', 'translate(0,' + this.height + ')');

    svg.append('text')
      .attr('class', 'title')
      .style('text-anchor', 'middle');

    svg.append('g')
      .attr('class', 'x axis')
      .attr('transform', 'translate(0,' + this.height + ')');

    svg.append('text')
      .attr('class', 'x label')
      .style('text-anchor', 'middle')
      .text('Expression');

    svg.append('g')
      .attr('class', 'y axis');

    svg.append('text')
      .attr('class', 'y label')
      .attr('transform', 'rotate(-90)')
      .attr('dy', '1em')
      .style('text-anchor', 'middle')
      .text('Expression');
  }

  private resizeChart($parent) {
    this.x.range([0, this.width]);
    this.y.range([this.height, 0]);

    const svg = $parent.select('svg')
      .attr('width', this.width + this.margin.left + this.margin.right)
      .attr('height', this.height + this.margin.top + this.margin.bottom);

    svg.select('text.title').attr('transform', 'translate(' + (this.width / 2) + ' ,' + -0.25 * this.margin.top + ')');

    svg.select('g.x.axis').call(this.xAxis);
    svg.select('g.y.axis').call(this.yAxis);

    svg.select('text.x.label').attr('transform', 'translate(' + (this.width / 2) + ' ,' + (this.height + 0.75 * this.margin.bottom) + ')');
    svg.select('text.y.label').attr('y', 0 - this.margin.left).attr('x', 0 - (this.height / 2));

    // shift also the points on resizing
    // causes the d3 error: `<circle> attribute cx: Expected length, "NaN".`
    /*svg.selectAll('.mark')
      .transition().attr({
        cx : (d) => this.x(d.expression),
        cy : (d) => this.y(d.expression),
      });*/
  }

  private updateChartData($parent) {
    const data:IDataFormat = $parent.datum();
    const geneName = data.geneName;
    const rows = data.rows;

    if(!this.refGeneExpression || !rows) {
      console.log('!this.refGeneExpression || !rows');
      return;
    }

    // hide small multiple co-expression plot because it would just project the ref gene on its own
    if (this.getParameter(ParameterFormIds.REFERENCE_GENE) === geneName) {
      $parent.classed('hidden', true);
      return;
    }

    this.x.domain([1, d3.max(this.refGeneExpression, (d) => d.expression)]).clamp(true);
    this.y.domain([1, d3.max(rows, (d) => d.expression)]).clamp(true);

    const $g = $parent.select('svg g');

    $g.select('g.x.axis').call(this.xAxis);
    $g.select('g.y.axis').call(this.yAxis);

    var title = 'No data for ' + geneName;
    if(rows[0]) {
      title = geneName;
    }

    $g.select('text.x.label').text(this.getParameter(ParameterFormIds.EXPRESSION_SUBTYPE).name + ' of '+ this.getParameter(ParameterFormIds.REFERENCE_GENE).symbol);
    $g.select('text.y.label').text(this.getParameter(ParameterFormIds.EXPRESSION_SUBTYPE).name + ' of '+ geneName);

    $g.select('text.title').text(title);

    // get smaller and larger array to build intersection between both
    const largerArray = (this.refGeneExpression.length <= rows.length) ? rows : this.refGeneExpression;
    const smallerArray = (this.refGeneExpression.length <= rows.length) ? this.refGeneExpression : rows;

    // build hashmap for faster access
    const hash = d3.map(largerArray, (d) => d.celllinename);

    const data2 = smallerArray
      .map((d) => {
        if(hash.has(d.celllinename)) {
          // return values that are contained in both arrays
          return [d.expression, hash.get(d.celllinename).expression, d.celllinename];
        }
        return null;
      })
      // remove empty values
      .filter((d) => d !== null);

    const marks = $g.selectAll('.mark').data(data2);

    marks.enter().append('circle')
      .classed('mark', true)
      .attr('r', 2)
      .attr('title', (d) => d[2])
      .call(tooltip.bind((d:any) => d[2]));

    marks.transition().attr({
      cx : (d) => this.x(d[0]),
      cy : (d) => this.y(d[1]),
    });

    marks.exit().remove();
  }

}

interface IDataFormat {
  id:number;
  geneName: string;
  rows: {
    id: string,
    symbol: string,
    celllinename: string,
    expression: number
  }[];
}

export function create(context:IViewContext, selection: ISelection, parent:Element, options?) {
  return new CoExpression(context, selection, parent, options);
}


