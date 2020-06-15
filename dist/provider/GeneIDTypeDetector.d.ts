export declare class GeneIDTypeDetector {
    static detectIDType(data: any[], accessor: (row: any) => string, sampleSize: number): number;
    static geneIDTypeDetector(): {
        detectIDType: typeof GeneIDTypeDetector.detectIDType;
    };
}
