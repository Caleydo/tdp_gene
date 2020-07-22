import {geneIDTypeDetector} from '../src/GeneIDTypeDetector';

describe('GeneIDTypeDetector', () => {
  const accessor: (row: any) => string = (row: any) => row.toString();
  const sampleSize = 10; // greater than data array length

  it('string array', () => {
    const data = ['foo', 'bar'];
    expect(geneIDTypeDetector().detectIDType(data, accessor, sampleSize)).toEqual(0);
  });

  it('boolean array', () => {
    const data = [true, false];
    expect(geneIDTypeDetector().detectIDType(data, accessor, sampleSize)).toEqual(0);
  });

  it('number array', () => {
    const data = [1, 2];
    expect(geneIDTypeDetector().detectIDType(data, accessor, sampleSize)).toEqual(0);
  });

  it('All Ensembl IDs', () => {
    const data = ['ENSG0000123', 'ENSG0000234'];
    expect(geneIDTypeDetector().detectIDType(data, accessor, sampleSize)).toEqual(1);
  });

  it('Half Ensembl IDs', () => {
    const data = ['ENSG0000123', 'ENSG0000234', 'foo', 'bar'];
    expect(geneIDTypeDetector().detectIDType(data, accessor, sampleSize)).toEqual(0.5);
  });

  it('Strings not starting with ENS or LRG', () => {
    const data = ['fooENSG', 'barENSG'];
    expect(geneIDTypeDetector().detectIDType(data, accessor, sampleSize)).toEqual(0);
  });

  it('Sample size smaller than data length', () => {
    const data = ['ENSG0000123', 'ENSG0000234', 'foo', 'bar'];
    const sampleSize = 2;
    expect(geneIDTypeDetector().detectIDType(data, accessor, sampleSize)).toEqual(1); // 0 because only the first two items will be checked they are EnsemblIDs
  });

  it('Detect items from the beginning', () => {
    const data = ['foo', 'bar', 'ENSG0000123', 'ENSG0000234'];
    const sampleSize = 2;
    expect(geneIDTypeDetector().detectIDType(data, accessor, sampleSize)).toEqual(0); // 0 because only the first two items will be checked they are not EnsemblIDs
  });

});
