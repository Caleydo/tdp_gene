/**
 * Created by Samuel Gratzl on 11.05.2016.
 */

export const copyNumberCat = [
  {value: 2, name: 'Amplification', color: '#efb3bc', border: 'transparent'},
  {value: -2, name: 'Deep Deletion', color: '#92c5de', border: 'transparent'},
  //{value: -1, name: 'Heterozygous deletion', color: '#92c5de'},
  {value: 0, name: 'NORMAL', color: '#dcdcdc', border: 'transparent'},
  //{value: 1, name: 'Low level amplification', color: '#f4a582'},
  //{value: 2, name: 'High level amplification', color: '#ca0020'},
  {value: 'null', name: 'Unknown', color: '#FCFCFC', border: '#dcdcdc'}
];
export const unknownCopyNumberValue: any = copyNumberCat[copyNumberCat.length-1].value;

export const mutationCat = [
  {value: 'true', name: 'Mutated', color: '#1BA64E', border: 'transparent'},
  {value: 'false', name: 'Non Mutated', color: '#aaa', border: 'transparent'},
  {value: 'null', name: 'Unknown', color: 'transparent', border: '#999'}
];
export const unknownMutationValue: any = mutationCat[mutationCat.length-1].value;

export const GENE_IDTYPE = 'Ensembl';
