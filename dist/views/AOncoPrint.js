/**
 * Created by Samuel Gratzl on 27.04.2016.
 */
import { Categories } from '../common/Categories';
import { select, format, event as d3event } from 'd3';
import { SelectionUtils, SelectOperation } from 'phovea_core';
import { Range } from 'phovea_core';
import * as $ from 'jquery';
import 'jquery-ui/ui/widgets/sortable';
import { AView } from 'tdp_core';
import { ResolveUtils } from 'tdp_core';
import { ErrorAlertHandler } from 'tdp_core';
function unknownSample(sample, sampleId) {
    return {
        name: sample,
        sampleId,
        cn: Categories.unknownCopyNumberValue,
        expr: 0,
        aa_mutated: Categories.unknownMutationValue // unknown
    };
}
function isMissingMutation(v) {
    return v === null || v === Categories.unknownMutationValue;
}
function isMissingCNV(v) {
    return v === null || v === Categories.unknownCopyNumberValue;
}
function computeAlterationFrequency(rows) {
    if (rows.length === 0) {
        return 0;
    }
    const isMutated = (r) => !isMissingMutation(r.aa_mutated) && r.aa_mutated === true;
    const isCopyNumberAltered = (r) => !isMissingCNV(r.cn) && r.cn !== 0;
    const hasData = (r) => !isMissingMutation(r.aa_mutated) || !isMissingCNV(r.cn);
    // reduce and compute both
    // amplified += 1 if isMutated or isCopyNumberAltered
    // total += if hasData
    const [amplified, total] = rows.reduce(([amplified, total], r) => [amplified + ((isMutated(r) || isCopyNumberAltered(r)) ? 1 : 0), total + (hasData(r) ? 1 : 0)], [0, 0]);
    //console.log(amplified, total);
    return (total === 0) ? 0 : amplified / total; // handle division by 0
}
const FIRST_IS_NULL = 1; //null at the end
function compareCNV(a, b) {
    // order: >0, <0, 0, NaN
    if (a === b) {
        return 0;
    }
    if (a === undefined || a === null || isNaN(a)) {
        return FIRST_IS_NULL;
    }
    if (b === undefined || b === null || isNaN(b)) {
        return -FIRST_IS_NULL;
    }
    if (a > 0) { // b is 0 or < 0
        return -1;
    }
    if (b > 0) { // a is 0 or < 0
        return 1;
    }
    if (a < 0) { // b is 0
        return -1;
    }
    if (b < 0) { // a is 0
        return 1;
    }
    return 0;
}
function compareMutation(a, b) {
    // order: true, false, null
    if (a === b) {
        return 0;
    }
    if (a === undefined || a === null) {
        return FIRST_IS_NULL;
    }
    if (b === undefined || b === null) {
        return -FIRST_IS_NULL;
    }
    return a ? -1 : +1;
}
function sort(sampleList, rows) {
    const rowLookups = rows.map((row) => {
        const r = {};
        row.forEach((d) => r[d.name] = d);
        return r;
    });
    //sort such that missing values are in the end
    //hierarchy: cn, mut, expression
    function compare(a, b) {
        for (const row of rowLookups) {
            const aRow = row[a];
            const bRow = row[b];
            { // undefined
                if (aRow === bRow) { //e.g. both undefined
                    continue;
                }
                if (aRow === undefined || aRow === null) {
                    return FIRST_IS_NULL; //for a not defined -> bigger
                }
                if (bRow === undefined || bRow === null) {
                    return -FIRST_IS_NULL;
                }
            }
            //first condition can be false positive, null vs 'null', so if both are missing don't compare
            if (aRow.cn !== bRow.cn && !(isMissingCNV(aRow.cn) && isMissingCNV(bRow.cn))) {
                return compareCNV(aRow.cn, bRow.cn);
            }
            if (aRow.aa_mutated !== bRow.aa_mutated && !(isMissingMutation(aRow.aa_mutated) && isMissingMutation(bRow.aa_mutated))) {
                return compareMutation(aRow.aa_mutated, bRow.aa_mutated);
            }
            // ignore not encoded expression value
            // if (a_row.expr !== b_row.expr) {
            //  return compareExpression(a_row.expr, b_row.expr);
            //}
        }
        // fallback to the name
        return a.localeCompare(b);
    }
    return sampleList.slice().sort(compare);
}
function byAlterationFrequency(a, b) {
    const aFrequency = a && a.alterationFreq !== undefined ? a.alterationFreq : 0;
    const bFrequency = b && b.alterationFreq !== undefined ? b.alterationFreq : 0;
    return bFrequency - aFrequency;
}
export class AOncoPrint extends AView {
    constructor() {
        super(...arguments);
        this.sampleListPromise = null;
        /**
         * flag if the user specified the gene sorting order
         * @type {boolean}
         */
        this.manuallyResorted = false;
        this.scaleFactor = '';
    }
    init(params, onParameterChange) {
        super.init(params, onParameterChange);
        // inject stats
        const base = params.querySelector('form') || params;
        base.insertAdjacentHTML('beforeend', `<div class="form-group oncoPrintScale" data-scale="">
  <button class="fas fa-search-minus"></button><div><div></div><div></div><div></div></div><button class="fas fa-search-plus"></button>
</div>`);
        let s = 0;
        const scaleElem = base.lastElementChild;
        scaleElem.firstElementChild.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            s = Math.min(s + 1, 3);
            scaleElem.dataset.scale = this.node.dataset.scale = 's'.repeat(s);
        });
        scaleElem.lastElementChild.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            s = Math.max(s - 1, 0);
            scaleElem.dataset.scale = this.node.dataset.scale = 's'.repeat(s);
        });
        return Promise.resolve();
    }
    initImpl() {
        super.initImpl();
        this.build();
        // load sample list with all available ids, then update the onco print
        this.sampleListPromise = this.loadSampleList();
        return this.sampleListPromise.then(this.updateChart.bind(this, false));
    }
    parameterChanged(name) {
        super.parameterChanged(name);
        this.sampleListPromise = this.loadSampleList();
        this.sampleListPromise.then(this.updateChart.bind(this, true));
    }
    selectionChanged() {
        super.selectionChanged();
        this.updateChart();
    }
    build() {
        const $node = select(this.node);
        $node.classed('oncoPrint', true);
        this.$table = $node
            .append('div').classed('geneTableWrapper', true)
            .append('table')
            .append('tbody');
        const $legend = $node.append('div').classed('legend', true);
        const $cnLegend = $legend.append('ul');
        $cnLegend.append('li').classed('title', true).text('Copy Number');
        Categories.copyNumberCat.forEach((d) => {
            $cnLegend.append('li').attr('data-cnv', d.value).text(d.name);
        });
        // append the legend for missing values
        $cnLegend.append('li').attr('data-cnv', Categories.unknownCopyNumberValue).text('Missing Values');
        const $mutLegend = $legend.append('ul');
        $mutLegend.append('li').classed('title', true).text('Mutation');
        Categories.mutationCat.forEach((d) => {
            $mutLegend.append('li').attr('data-mut', d.value).text(d.name);
        });
        // append the legend for missing values
        $mutLegend.append('li').attr('data-mut', Categories.unknownMutationValue).text('Missing Values');
        $node.append('div').attr('class', 'alert alert-info alert-dismissible').attr('role', 'alert').html(`
      <button type="button" class="close" data-dismiss="alert" aria-label="Close"><span aria-hidden="true">&times;</span></button>
      <p>Please note:</p>
      <ul>
         <li>The indicated copy number states are only estimates, which can be affected by sample purity, ploidy, and other factors.</li>
         <li>The indicated alteration prevalences are only estimates, which can be affected by incomplete data and small sample numbers.</li>
      </ul>
    `);
    }
    logErrorAndMarkReady(error) {
        console.error(error);
        this.setBusy(false);
    }
    updateChart(updateAll = false) {
        this.setBusy(true);
        const ids = this.selection.range.dim(0).asList();
        const idtype = this.selection.idtype;
        const empty = (id) => ({ id, geneName: '', ensg: '', alterationFreq: 0, rows: [], promise: null });
        // merge the old rows with the current selection
        const merge = (ids, old) => {
            if (old.length === 0) {
                return ids.map(empty);
            }
            const lookup = new Map();
            old.forEach((d) => lookup.set(d.id, d));
            if (this.manuallyResorted) {
                //different strategy if already resorted try to keep the original sorting as good as possible
                //keep old + newly added ones
                const existing = old.filter((d) => ids.indexOf(d.id) >= 0);
                const added = ids.filter((id) => !lookup.has(id)).map((id) => empty(id));
                return existing.concat(added);
            }
            return ids.map((id) => lookup.get(id) || empty(id));
        };
        const data = merge(ids, this.$table.selectAll('tr.gene').data());
        const $ids = this.$table.selectAll('tr.gene').data(data, (d) => String(d.id));
        const $idsEnter = $ids.enter().append('tr').classed('gene', true);
        // decide whether to load data for newly added items
        // or to reload the data for all items (e.g. due to parameter change)
        const enterOrUpdateAll = (updateAll) ? $ids : $idsEnter;
        const renderRow = ($id, d) => {
            const promise = (d.ensg ? Promise.resolve(d.ensg) : ResolveUtils.resolveId(idtype, d.id, this.idType))
                .then((ensg) => {
                d.ensg = ensg;
                return Promise.all([
                    this.loadRows(ensg),
                    d.geneName || this.loadFirstName(ensg),
                    this.sampleListPromise
                ]);
            });
            // on error
            promise.catch(ErrorAlertHandler.getInstance().errorAlert)
                .catch(this.logErrorAndMarkReady.bind(this));
            // on success
            d.promise = promise.then((input) => {
                d.rows = input[0];
                d.geneName = input[1];
                const samples = input[2];
                this.updateChartData(d, $id, samples);
                this.setBusy(false);
                return d;
            });
        };
        enterOrUpdateAll.each(function (d) {
            renderRow(select(this), d);
        });
        //assume that all data will have a promise
        // wait for all data and then sort the things
        Promise.all([this.sampleListPromise].concat(data.map((d) => d.promise))).then((result) => {
            const samples = result.shift().map((d) => d.name);
            const rows = result;
            if (!this.manuallyResorted) {
                rows.sort(byAlterationFrequency);
            }
            const sortedSamples = sort(samples, rows.map((r) => r.rows));
            const $genes = this.sortCells(sortedSamples);
            if (!this.manuallyResorted) {
                //sort genes=row by frequency
                $genes.sort(byAlterationFrequency);
            }
        });
        $ids.exit().remove().each(() => this.setBusy(false));
        //sortable
        $(this.$table.node()) // jquery
            .sortable({
            handle: 'th.geneLabel',
            axis: 'y',
            items: '> :not(.nodrag)',
            update: () => {
                this.manuallyResorted = true;
                //order has changed trigger a resort
                this.sampleListPromise.then((samples) => {
                    const rows = this.$table.selectAll('tr.gene').data();
                    const sortedSamples = sort(samples.map((d) => d.name), rows.map((r) => r.rows));
                    this.sortCells(sortedSamples);
                });
            }
        });
    }
    updateChartData(data, $parent, samples) {
        //console.log(data.geneName);
        let rows = data.rows;
        rows = this.alignData(rows, samples);
        // count amplification/deletions and divide by total number of rows
        data.alterationFreq = computeAlterationFrequency(rows);
        const $th = $parent.selectAll('th.geneLabel').data([data]);
        $th.enter().append('th').classed('geneLabel', true);
        $th.html((d) => `<span class="alterationFreq">${format('.0%')(d.alterationFreq)}</span> ${d.geneName} <span class="ensg">${d.ensg}</span>`);
        $th.exit().remove();
        const $cells = $parent.selectAll('td.cell').data(rows);
        $cells.enter().append('td')
            .classed('cell', true)
            .on('click', (row) => {
            this.selectSample(row.sampleId, SelectionUtils.toSelectOperation(d3event));
        })
            .append('div')
            .classed('mut', true);
        $cells
            .attr('data-title', (d) => d.name) //JSON.stringify(d))
            .attr('data-id', (d) => d.sampleId)
            .attr('data-cnv', (d) => String(isMissingCNV(d.cn) ? Categories.unknownCopyNumberValue : d.cn))
            .attr('data-mut', (d) => String(isMissingMutation(d.aa_mutated) ? Categories.unknownMutationValue : d.aa_mutated))
            .classed('selected', (d) => this.isSampleSelected(d.sampleId));
        $cells.exit().remove();
        if (rows.length === 0) {
            $parent.append('td').classed('cell', true);
        }
    }
    isSampleSelected(sampleId) {
        const { range } = this.getItemSelection();
        return range.dim(0).contains(sampleId);
    }
    selectSample(sampleId, op) {
        const { range } = this.getItemSelection();
        const current = range.dim(0);
        let newSelection = null;
        const single = Range.list([sampleId]);
        switch (op) {
            case SelectOperation.SET:
                if (current.contains(sampleId)) {
                    newSelection = Range.none();
                }
                else {
                    newSelection = single;
                }
                break;
            case SelectOperation.REMOVE:
                newSelection = range.without(single);
                break;
            case SelectOperation.ADD:
                newSelection = range.union(single);
                break;
        }
        this.updateSelectionHighlight(newSelection);
        this.setItemSelection({ range: newSelection, idtype: this.getSampleIdType() });
    }
    get itemIDType() {
        return this.getSampleIdType();
    }
    updateSelectionHighlight(range) {
        //use plain version to avoid data binding issues
        const table = this.$table.node();
        if (range.isAll) {
            Array.from(table.querySelectorAll('td.cell')).forEach((c) => c.classList.add('selected'));
            return;
        }
        Array.from(table.querySelectorAll('td.cell')).forEach((c) => c.classList.remove('selected'));
        range.dim(0).forEach((sampleId) => {
            Array.from(table.querySelectorAll(`td.cell[data-id="${sampleId}"]`)).forEach((c) => c.classList.add('selected'));
        });
    }
    sortCells(sortedSamples) {
        //name to index
        const lookup = {};
        sortedSamples.forEach((d, i) => lookup[d] = i);
        const $genes = this.$table.selectAll('tr.gene');
        $genes.selectAll('td.cell').sort((a, b) => {
            const aIndex = lookup[a.name];
            const bIndex = lookup[b.name];
            // assume both exist
            return aIndex - bIndex;
        });
        return $genes;
    }
    alignData(rows, samples) {
        // build hash map first for faster access
        const hash = {};
        rows.forEach((r) => hash[r.name] = r);
        // align items --> fill missing values up to match sample list
        return samples.map((sample) => {
            // no data found --> add unknown sample
            if (!(sample.name in hash)) {
                return unknownSample(sample.name, sample.id);
            }
            const r = hash[sample.name];
            r.sampleId = sample.id;
            return r;
        });
    }
}
//# sourceMappingURL=AOncoPrint.js.map