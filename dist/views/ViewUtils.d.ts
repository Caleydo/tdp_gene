import * as d3v3 from 'd3v3';
export declare class ViewUtils {
    static base: string[];
    static removed: string[];
    static colors: string[];
    static integrateColors(scale: d3v3.scale.Ordinal<string, string>, colors: string[]): void;
    static colorScale(): d3v3.scale.Ordinal<string, string>;
    static legend(legend: HTMLElement, scale: d3v3.scale.Ordinal<string, string>): void;
}
//# sourceMappingURL=ViewUtils.d.ts.map