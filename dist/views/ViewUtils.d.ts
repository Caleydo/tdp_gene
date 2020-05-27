import { scale as d3Scale } from 'd3';
export declare class ViewUtils {
    static integrateColors(scale: d3Scale.Ordinal<string, string>, colors: string[]): void;
    static colorScale(): d3Scale.Ordinal<string, string>;
    static legend(legend: HTMLElement, scale: d3Scale.Ordinal<string, string>): void;
}
