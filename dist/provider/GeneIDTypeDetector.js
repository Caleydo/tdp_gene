export class GeneIDTypeDetector {
    static detectIDType(data, accessor, sampleSize) {
        const testSize = Math.min(data.length, sampleSize);
        if (testSize <= 0) {
            return 0;
        }
        let foundIDTypes = 0;
        let validSize = 0;
        for (let i = 0; i < testSize; ++i) {
            const v = accessor(data[i]);
            if (v == null || v.trim().length === 0) {
                continue; //skip empty samples
            }
            if (v.indexOf('ENS') === 0 || v.indexOf('LRG') === 0) {
                ++foundIDTypes;
            }
            ++validSize;
        }
        return foundIDTypes / validSize;
    }
    static geneIDTypeDetector() {
        return {
            detectIDType: GeneIDTypeDetector.detectIDType
        };
    }
}
//# sourceMappingURL=GeneIDTypeDetector.js.map