/**
 * Created by Holger Stitz on 12.08.2016.
 */

import bindTooltip from 'phovea_d3/src/tooltip';
import {IViewContext, ISelection, ASmallMultipleView} from 'ordino/src/View';
import {GENE_IDTYPE} from '../constants';
import {FormBuilder, FormElementType, IFormSelectDesc, IFormSelectElement} from 'ordino/src/FormBuilder';
import {showErrorModalDialog} from 'ordino/src/Dialogs';
import * as d3 from 'd3';
import {Range, list, none} from 'phovea_core/src/range';
import {toSelectOperation, SelectOperation} from 'phovea_core/src/idtype';
import {default as FormSelect, IFormSelectOption} from 'ordino/src/form/internal/FormSelect';

const FORM_ID_REFERENCE_GENE = 'referenceGene';

/**
 * Filter expression values with 0, because log scale cannot handle log(0)
 * @param rows
 * @returns {any}
 */
function filterZeroValues(rows: IDataFormatRow[]) {
  const rows2 = rows.filter((d) => d.expression !== 0 && d.expression !== undefined);
  console.log(`filtered ${rows.length - rows2.length} zero values`);
  return rows2;
}

interface IGeneOption extends IFormSelectOption {
  data: { id: string, symbol: string, _id: number };
}

export abstract class ACoExpression extends ASmallMultipleView {

  protected $insufficientSelection;

  private refGene: IGeneOption = null;
  private refGeneExpression: IDataFormatRow[] = [];

  private x = d3.scale.log();
  private y = d3.scale.log();
  private xAxis = d3.svg.axis().orient('bottom').scale(this.x).tickFormat(this.x.tickFormat(2, '.1f'));//.tickFormat((d) => d.toFixed(1));
  private yAxis = d3.svg.axis().orient('left').scale(this.y).tickFormat(this.y.tickFormat(2, '.1f'));//.tickFormat((d) => d.toFixed(1));

  private paramForm: FormBuilder;

  constructor(context: IViewContext, private selection: ISelection, parent: Element, options?) {
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
    this.updateRefGeneSelect(this.selection)
      .then((refGene: IGeneOption) => {
        this.refGene = refGene;
        if (refGene) {
          return this.loadRefGeneData(refGene);
        } else {
          return null;
        }
      }).then((expressions) => {
      this.refGeneExpression = expressions;
      this.update(this.refGene, expressions, true);
    });
  }

  buildParameterUI($parent: d3.Selection<any>, onChange: (name: string, value: any) => Promise<any>) {
    this.paramForm = new FormBuilder($parent);

    const paramDesc = this.buildParameterDescs();
    // map FormElement change function to provenance graph onChange function
    paramDesc.forEach((p) => {
      p.options.onChange = (selection, formElement) => onChange(formElement.id, selection.value);
    });

    this.paramForm.build(paramDesc);

    // add other fields
    super.buildParameterUI($parent, onChange);
  }

  protected buildParameterDescs(): IFormSelectDesc[] {
    return [
      {
        type: FormElementType.SELECT,
        label: 'Reference Gene',
        id: FORM_ID_REFERENCE_GENE,
        options: {
          optionsData: [],
        }
      }
    ];
  }

  getParameter(name: string): any {
    if (this.paramForm.getElementById(name).value === null) {
      return '';
    }

    return this.paramForm.getElementById(name).value.data;
  }

  setParameter(name: string, value: any) {
    this.paramForm.getElementById(name).value = value;

    this.refGene = this.paramForm.getElementById(FORM_ID_REFERENCE_GENE).value;
    if (!this.refGene) {
      this.refGeneExpression = null;
      this.update(null, null, true);
    } else {
      this.loadRefGeneData(this.refGene).then((expressions) => {
        this.refGeneExpression = expressions;
        this.update(this.refGene, this.refGeneExpression, true);
      });
    }
  }

  changeSelection(selection: ISelection) {
    this.selection = selection;

    // update the refGene select first, then update the charts
    const bak = this.refGene;
    this.updateRefGeneSelect(selection)
      .then((refGene: IGeneOption) => {
        this.refGene = refGene;
        const refChanged = bak === null || refGene === null || bak.value !== refGene.value;
        if (refChanged) {
          this.refGeneExpression = null;
          if (refGene) {
            this.loadRefGeneData(refGene).then((expressions) => {
              this.refGeneExpression = expressions;
              this.update(refGene, this.refGeneExpression, true);
            });
          }
        } else {
          this.update(refGene, this.refGeneExpression, refChanged);
        }
      });
  }

  private updateRefGeneSelect(selection: ISelection): Promise<IGeneOption> {
    return this.resolveIds(selection.idtype, selection.range, this.idType)
      .then((genesEnsembl): Promise<IGeneOption> => {
        //console.log('Ensembl', genesEnsembl);

        const promise = this.loadGeneList(genesEnsembl);

        // on error
        promise.catch(showErrorModalDialog)
          .catch((error) => {
            console.error(error);
            this.setBusy(false);
          });

        // on success
        return promise.then((input) => {
          const data = <IFormSelectOption[]>input.map((d) => {
            return {
              //use EnsemblID if symbol is empty
              value: (d.symbol) ? d.symbol : d.id,
              name: (d.symbol && d.symbol !== d.id) ? `${d.symbol} (${d.id})` : d.id,
              data: d
            };
          });
          //console.log('gene symbols', data);

          const refGeneSelect = <IFormSelectElement>this.paramForm.getElementById(FORM_ID_REFERENCE_GENE);

          // backup entry and restore the selectedIndex by value afterwards again,
          // because the position of the selected element might change
          const old = <IFormSelectOption>refGeneSelect.value;
          refGeneSelect.updateOptionElements(data);

          if (old !== null) {
            refGeneSelect.value = old;
          }

          // set reference gene
          return refGeneSelect.value;
        });
      });
  }


  private async loadRefGeneData(refGene: IGeneOption) {

    const rows = await this.loadData(refGene.data.id);
    return filterZeroValues(rows);
  }

  protected abstract loadData(ensg: string): Promise<IDataFormatRow[]>;

  protected abstract loadGeneList(ensgs: string[]): Promise<{ id: string, symbol: string, _id: number }[]>;

  protected abstract loadFirstName(ensg: string): Promise<string>;


  private update(refGene: IGeneOption, refGeneExpression: IDataFormatRow[], updateAll = false) {
    const that = this;
    const ids = this.selection.range.dim(0).asList();
    const idtype = this.selection.idtype;

    const isEmpty = refGene == null || refGeneExpression == null || refGeneExpression.length === 0;

    if (isEmpty) {
      this.$insufficientSelection.classed('hidden', false);
      this.$node.selectAll('div.plots').remove();
      return;
    }

    const data: IDataFormat[] = ids
      .filter((id) => id !== refGene.data._id) // skip refGene, because it's already loaded
      .map((id) => {
        return {id, geneName: '', rows: []};
      });

    // show/hidde message and loading indicator if two less genes are selected
    this.$insufficientSelection.classed('hidden', (data.length > 0));
    this.setBusy(data.length > 0);

    const $plots = this.$node.selectAll('div.plots').data(data, (d) => d.id.toString());
    const $plotsEnter = $plots.enter().append('div').classed('plots', true);

    // decide whether to load data for newly added items
    // or to reload the data for all items (e.g. due to parameter change)
    const enterOrUpdateAll = (updateAll) ? $plots : $plotsEnter;

    enterOrUpdateAll.each(function (this: HTMLElement, d: IDataFormat) {
      const $id = d3.select(this);
      const promise = that.resolveId(idtype, d.id, that.idType)
        .then((name) => {
          return Promise.all([
            that.loadData(name),
            that.loadFirstName(name)
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
        d.rows = filterZeroValues(input[0]);
        d.geneName = input[1];

        //console.log('loaded data for', d.geneName);

        that.initChart($id);
        that.resizeChart($id);
        that.updateChartData(refGene.data, refGeneExpression, d, $id);

        that.setBusy(false);
      });
    });

    $plots.exit().remove()
      .each(function (d) {
        that.setBusy(false);
      });
  }

  private initChart($parent) {
    // already initialized svg node -> skip this part
    if ($parent.select('svg').size() > 0) {
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

  private resizeChart($parent: d3.Selection<IDataFormat>) {
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

  private updateChartData(refGene: { id: string, symbol: string }, refGeneExpression: IDataFormatRow[], data: IDataFormat, $parent: d3.Selection<IDataFormat>) {
    const geneName = data.geneName;

    // hide small multiple co-expression plot because it would just project the ref gene on its own
    if (!refGene || refGene.id === geneName) {
      $parent.classed('hidden', true);
      return;
    }

    const rows = data.rows;
    const hasData = rows != null && rows.length > 0 && refGeneExpression != null && refGeneExpression.length > 0;

    const $g = $parent.select('svg g');

    $g.select('text.title').text(hasData ? geneName : 'No data for ' + geneName);

    if (!hasData) {
      $g.selectAll('.mark').remove();
      return;
    }

    this.x.domain([1, d3.max(refGeneExpression, (d) => d.expression)]).clamp(true);
    this.y.domain([1, d3.max(rows, (d) => d.expression)]).clamp(true);


    const attribute = this.getAttributeName();
    $g.select('text.x.label').text(attribute + ' of ' + refGene.symbol);
    $g.select('text.y.label').text(attribute + ' of ' + geneName);


    // get smaller and larger array to build intersection between both
    const largerArray: IDataFormatRow[] = (refGeneExpression.length <= rows.length) ? rows : refGeneExpression;
    const smallerArray: IDataFormatRow[] = (refGeneExpression.length <= rows.length) ? refGeneExpression : rows;

    const firstIsReference = refGeneExpression.length <= rows.length;

    // build hashmap for faster access
    const hash = d3.map(largerArray, (d) => d.samplename);

    const data2 = smallerArray.reduce((result, d) => {
      if (hash.has(d.samplename)) {
        result.push({expr1: d.expression, expr2: hash.get(d.samplename).expression, title: d.samplename, _id: d._id});
      }
      return result;
    }, <{ expr1: number, expr2: number, title: string, _id: number }[]>[]);

    const marks = $g.selectAll('.mark').data(data2);

    marks.enter().append('circle')
      .classed('mark', true)
      .attr('r', 2)
      .on('click', (d) => {
        const target: EventTarget = (<Event>d3.event).target;

        const selectOperation: SelectOperation = toSelectOperation(<MouseEvent>d3.event);

        const id: number = d._id; // d[3] = _id
        const r: Range = list([id]);

        const oldSelection = this.getItemSelection();
        let newSelection: Range = none();

        switch (selectOperation) {
          case SelectOperation.SET:
            newSelection = r;
            d3.selectAll('circle.mark.clicked').classed('clicked', false);
            break;
          case SelectOperation.ADD:
            newSelection = oldSelection.range.union(r);
            break;
          case SelectOperation.REMOVE:
            newSelection = oldSelection.range.without(r);
            break;
        }

        d3.select(target).classed('clicked', selectOperation !== SelectOperation.REMOVE);
        this.select(newSelection);
      })
      .call(bindTooltip<{ title: string }>((d) => d.title));


    marks.attr('title', (d) => d.title);
    marks.transition().attr({
      cx: (d) => this.x(firstIsReference ? d.expr1 : d.expr2),
      cy: (d) => this.y(firstIsReference ? d.expr2 : d.expr1)
    });

    marks.exit().remove();
  }

  protected abstract getAttributeName(): string;

  protected abstract select(r: Range): void;

}

export default ACoExpression;

export interface IDataFormatRow {
  samplename: string;
  expression: number;
  _id: number;
}

export interface IDataFormat {
  id: number;
  geneName: string;
  rows: IDataFormatRow[];
}

