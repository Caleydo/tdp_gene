/**
 * Created by Samuel Gratzl on 27.04.2016.
 */
import '../scss/main.scss';
import { IDType } from 'phovea_core';
import { Range } from 'phovea_core';
import 'jquery-ui/ui/widgets/sortable';
import { AView } from 'tdp_core';
export interface ISample {
    name: string;
    id: number;
}
export interface IDataFormatRow {
    name: string;
    cn: number;
    expr: number;
    aa_mutated: boolean;
    sampleId: number;
}
export interface IDataFormat {
    id: number;
    geneName: string;
    ensg: string;
    alterationFreq: number;
    promise: Promise<IDataFormat>;
    rows: IDataFormatRow[];
}
export declare abstract class AOncoPrint extends AView {
    private $table;
    private sampleListPromise;
    /**
     * flag if the user specified the gene sorting order
     * @type {boolean}
     */
    private manuallyResorted;
    private scaleFactor;
    init(params: HTMLElement, onParameterChange: (name: string, value: any, previousValue: any) => Promise<any>): Promise<void>;
    protected initImpl(): Promise<ISample[]>;
    protected parameterChanged(name: string): void;
    protected selectionChanged(): void;
    private build;
    protected abstract loadSampleList(): Promise<ISample[]>;
    protected abstract loadRows(ensg: string): Promise<IDataFormatRow[]>;
    protected abstract loadFirstName(ensg: string): Promise<string>;
    private logErrorAndMarkReady;
    private updateChart;
    private updateChartData;
    private isSampleSelected;
    private selectSample;
    get itemIDType(): IDType;
    protected updateSelectionHighlight(range: Range): void;
    protected abstract getSampleIdType(): IDType;
    private sortCells;
    private alignData;
}
