import { IFormSelectDesc, IFormSelectOption } from 'tdp_core';
import * as d3 from 'd3';
import { Range } from 'phovea_core';
import { AD3View } from 'tdp_core';
export interface IGeneOption extends IFormSelectOption {
    data: {
        id: string;
        symbol: string;
        _id: number;
    };
}
export declare abstract class ACoExpression extends AD3View {
    private readonly margin;
    private readonly width;
    private readonly height;
    protected $errorMessage: d3.Selection<any>;
    protected $legend: d3.Selection<any>;
    private refGene;
    private refGeneExpression;
    private readonly x;
    private readonly y;
    private readonly color;
    private readonly xAxis;
    private readonly yAxis;
    protected initImpl(): Promise<void>;
    protected getParameterFormDescs(): IFormSelectDesc[];
    parameterChanged(name: string): void;
    selectionChanged(): void;
    private updateRefGeneSelect;
    private loadRefGeneData;
    protected abstract loadData(ensg: string): Promise<ICoExprDataFormatRow[]>;
    protected abstract loadGeneList(ensgs: string[]): Promise<{
        id: string;
        symbol: string;
        _id: number;
    }[]>;
    protected abstract loadFirstName(ensg: string): Promise<string>;
    private updateChart;
    private initChart;
    private resizeChart;
    private updateChartData;
    protected getNoDataErrorMessage(refGene: IGeneOption): string;
    protected abstract getAttributeName(): string;
    protected abstract select(r: Range): void;
}
export interface ICoExprDataFormatRow {
    samplename: string;
    expression: number;
    color?: string;
    _id: number;
}
export interface ICoExprDataFormat {
    id: number;
    geneName: string;
    rows: ICoExprDataFormatRow[];
}
