declare function detectIDType(data: any[], accessor: (row: any) => string, sampleSize: number): number;
export declare function geneIDTypeDetector(): {
    detectIDType: typeof detectIDType;
};
export {};
