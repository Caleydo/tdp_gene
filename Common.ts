/**
 * Created by Samuel Gratzl on 11.05.2016.
 */


export const copyNumberCat = [
  {value: 2, name: 'Amplification', color: '#ca0020', border: 'transparent'},
  {value: -2, name: 'Homozygous deletion', color: '#0571b0', border: 'transparent'},
  //{value: -1, name: 'Heterozygous deletion', color: '#92c5de'},
  {value: 0, name: 'NORMAL', color: '#dcdcdc', border: 'transparent'},
  //{value: 1, name: 'Low level amplification', color: '#f4a582'},
  //{value: 2, name: 'High level amplification', color: '#ca0020'},
  {value: 'null', name: 'Unknown', color: '#FCFCFC', border: '#dcdcdc'}
];

export const mutationCat = [
  {value: 'true', name: 'Mutated', color: '#1BA64E'},
  {value: 'false', name: 'Non Mutated', color: '#dcdcdc'},
  {value: '', name: 'Unknown', color: 'transparent'}
];

export const all_types = 'All Tumor Types';
export const all_bio_types = 'All Bio Types';
//select distinct tumortype from cellline where tumortype is not null

export interface IDataSourceConfig {
  idType: string;
  name: string;
  db: string;
  schema: string;
  tableName: string;
  entityName: string;
  base: string;
  species: string[];
  [key: string]: any;
}

export interface ITumorTypeDataSourceConfig extends IDataSourceConfig {
  tumorTypes: string[];
  tumorTypesWithAll: string[];
}

export interface IBioTypeDataSourceConfig extends IDataSourceConfig {
  bioTypes: string[];
  bioTypesWithAll: string[];
}



const celllinesTumorTypes = ['adrenal gland carcinoma', 'astrocytoma/glioblastoma', 'bladder carcinoma', 'bone sarcoma',
  'breast carcinoma', 'cervix carcinoma', 'colon carcinoma', 'esophagus carcinoma', 'gallbladder carcinoma',
  'gastric carcinoma', 'hematopoietic/leukemia', 'hematopoietic/lymphoma', 'hematopoietic/myeloma', 'HNSCC', 'liver carcinoma',
  'medulloblastoma', 'melanoma ', 'melanoma', 'mesothelioma', 'neuroblastoma', 'normal', 'NSCLC', 'ovarian carcinoma', 'pancreas carcinoma',
  'pancreatic insulinoma', 'placenta carcinoma', 'prostate benign hyperplasia', 'prostate carcinoma', 'renal cancer other', 'renal carcinoma',
  'retinoblastoma', 'rhabdomyosarcoma', 'sarcoma/soft tissue', 'SCLC', 'SCLC/neuroendocrine', 'skin/SCC', 'thyroid carcinoma', 'uterus carcinoma', 'vulva carcinoma'];

export const cellline:ITumorTypeDataSourceConfig = {
  idType: 'Cellline',
  name: 'Cell Line',
  db: 'bioinfodb',
  schema: 'cellline',
  tableName: 'cellline',
  entityName: 'celllinename',
  base: 'cellline',
  tumorTypes: celllinesTumorTypes,
  tumorTypesWithAll : [all_types].concat(celllinesTumorTypes),
  species: ['human', 'mouse', 'rat']
};

//const tissueTumorTypes = ['Adrenal Gland', 'Artery - Aorta', 'Bladder', 'Brain - Cerebellum', 'Brain - Cortex', 'Brain - Spinal cord (cervical c-1)',
//  'breast carcinoma', 'Cervix - Ectocervix', 'Cervix - Endocervix', 'Colon - Sigmoid', 'Colon - Transverse', 'colon carcinoma',
//  'Esophagus - Gastroesophageal Junction', 'Esophagus - Mucosa', 'Esophagus - Muscularis', 'Fallopian Tube', 'Heart - Atrial Appendage',
//  'Heart - Left Ventricle', 'large cell lung carcinoma', 'Liver', 'lung adenocarcinoma', 'lung adenosquamous carcinoma',
//  'lung clear cell carcinoma, sarcomatoid carcinoma', 'lung large cell neuroendocrine carcinoma', 'lung squamous cell carcinoma',
//  'Minor Salivary Gland', 'Muscle - Skeletal', 'NEC', 'Nerve - Tibial', 'non small cell lung cancer', 'Ovary', 'Pancreas', 'Pituitary',
//  'PNET', 'SCLC, NEC', 'Skin - Sun Exposed (Lower leg)', 'small cell lung cancer', 'Spleen', 'Stomach', 'Testis', 'unclear'];

const tissueTumorTypes = [
  'Acute Myeloid Leukemia',
  'Adrenal Gland',
  'Adrenocortical carcinoma',
  'Artery - Aorta',
  'Bladder',
  'Bladder Urothelial Carcinoma',
  'Brain - Cerebellum',
  'Brain - Cortex',
  'Brain Lower Grade Glioma',
  'Brain - Spinal cord (cervical c-1)',
  'breast carcinoma',
  'Breast invasive carcinoma',
  'Cervical squamous cell carcinoma and endocervical adenocarcinoma',
  'Cervix - Ectocervix',
  'Cervix - Endocervix',
  'Cholangiocarcinoma',
  'Colon adenocarcinoma',
  'colon carcinoma',
  'Colon - Sigmoid',
  'Colon - Transverse',
  'Esophageal carcinoma',
  'Esophagus - Gastroesophageal Junction',
  'Esophagus - Mucosa',
  'Esophagus - Muscularis',
  'Fallopian Tube',
  'Glioblastoma multiforme',
  'Head and Neck squamous cell carcinoma',
  'Heart - Atrial Appendage',
  'Heart - Left Ventricle',
  'Kidney Chromophobe',
  'Kidney renal clear cell carcinoma',
  'Kidney renal papillary cell carcinoma',
  'large cell lung carcinoma',
  'Liver',
  'Liver hepatocellular carcinoma',
  'lung adenocarcinoma',
  'Lung adenocarcinoma',
  'lung adenosquamous carcinoma',
  'lung clear cell carcinoma, sarcomatoid carcinoma',
  'lung large cell neuroendocrine carcinoma',
  'lung squamous cell carcinoma',
  'Lung squamous cell carcinoma',
  'Lymphoid Neoplasm Diffuse Large B-cell Lymphoma',
  'Mesothelioma',
  'Minor Salivary Gland',
  'Muscle - Skeletal',
  'NEC',
  'Nerve - Tibial',
  'non small cell lung cancer',
  'normal',
  'Ovarian',
  'Ovarian serous cystadenocarcinoma',
  'Ovary',
  'Pancreas',
  'Pancreatic adenocarcinoma',
  'Pheochromocytoma and Paraganglioma',
  'Pituitary',
  'PNET',
  'Prostate adenocarcinoma',
  'Rectum adenocarcinoma',
  'Sarcoma',
  'SCLC',
  'SCLC, NEC',
  'Skin Cutaneous Melanoma',
  'Skin - Sun Exposed (Lower leg)',
  'small cell lung cancer',
  'Spleen',
  'Stomach',
  'Stomach adenocarcinoma',
  'Testicular Germ Cell Tumors',
  'Testis',
  'Thymoma',
  'Thyroid carcinoma',
  'unclear',
  'Uterine Carcinosarcoma',
  'Uterine Corpus Endometrial Carcinoma',
  'Uveal Melanoma'];


export const tissue:ITumorTypeDataSourceConfig = {
  idType: 'Tissue',
  name: 'Tissue',
  db: 'bioinfodb',
  schema: 'tissue',
  tableName: 'tissue',
  entityName: 'tissuename',
  base: 'tissue',
  tumorTypes: tissueTumorTypes,
  tumorTypesWithAll : [all_types].concat(tissueTumorTypes),
  species: ['human']
};

const geneBioTypes = [
  '3prime_overlapping_ncrna',
  'antisense',
  'IG_C_gene',
  'IG_C_pseudogene',
  'IG_D_gene',
  'IG_J_gene',
  'IG_J_pseudogene',
  'IG_LV_gene',
  'IG_V_gene',
  'IG_V_pseudogene',
  'lincRNA',
  'LRG_gene',
  'miRNA',
  'misc_RNA',
  'Mt_rRNA',
  'Mt_tRNA',
  'non_coding',
  'polymorphic_pseudogene',
  'processed_pseudogene',
  'processed_transcript',
  'protein_coding',
  'pseudogene',
  'rRNA',
  'sense_intronic',
  'sense_overlapping',
  'snoRNA',
  'snRNA',
  'TR_C_gene',
  'TR_D_gene',
  'TR_J_gene',
  'TR_J_pseudogene',
  'TR_V_gene',
  'TR_V_pseudogene'
];

export const gene:IBioTypeDataSourceConfig = {
  idType: 'Ensembl',
  name: 'Gene',
  db: 'bioinfodb',
  schema: 'public',
  tableName: 'gene',
  entityName: 'ensg',
  base: 'gene',
  bioTypes: geneBioTypes,
  bioTypesWithAll : [all_bio_types].concat(geneBioTypes),
  species: ['human', 'mouse', 'rat']
};

export const dataSources = [cellline, tissue];

export function chooseDataSource(desc: any): IDataSourceConfig {

  if (typeof(desc) === 'object') {
    return desc.sampleType === 'Tissue' ? tissue : cellline;
  }

  switch (desc) {
    case cellline.name:
      return cellline;
    case tissue.name:
      return tissue;
  }
}

export interface IDataTypeConfig {
  id: string;
  name: string;
  tableName: string;
  query: string;
  dataSubtypes: IDataSubtypeConfig[];
}

export interface IDataSubtypeConfig {
  id: string;
  name: string;
  type: string;
  domain?: number[];
  categories?: string[];
  missingValue: number;
  constantDomain: boolean;
  useForAggregation: string;
}

export const expression:IDataTypeConfig = {
  id: 'expression',
  name: 'Expression',
  tableName: 'expression',
  query: 'expression_score',
  dataSubtypes: [
    { id: 'tpm', name: 'TPM', type: 'number', domain: [-3, 3], missingValue: NaN, constantDomain: true, useForAggregation: 'tpm'},
    { id: 'counts', name: 'Raw Counts', type: 'number', domain: [0, 10000], missingValue: NaN, constantDomain: true, useForAggregation: 'counts'}
  ]
};

export const copyNumber:IDataTypeConfig = {
  id: 'copy_number',
  name: 'Copy Number',
  tableName: 'copynumber',
  query: 'copynumber_score',
  dataSubtypes: [
    { id: 'relativecopynumber', name: 'Relative Copy Number', type: 'number', domain: [0, 15], missingValue: 0, constantDomain: true, useForAggregation: 'relativecopynumber'},
    { id: 'totalabscopynumber', name: 'Total Absolute Copy Number', type: 'number', domain: [0, 15], missingValue: 0, constantDomain: true, useForAggregation: 'totalabscopynumber'},
    { id: 'copynumberclass', name: 'Copy Number Class', type: 'cat', categories: ['-2', '0', '2'], missingValue: 0, constantDomain: true, useForAggregation: 'copynumberclass'}
  ],
};

export const mutation:IDataTypeConfig = {
  id: 'mutation',
  name: 'Mutation',
  tableName: 'mutation',
  query: 'alteration_mutation_frequency',
  dataSubtypes: [
    { id: 'aa_mutated', name: 'AA Mutated', type: 'cat', domain: [0, 1], missingValue: 0, constantDomain: true, useForAggregation: 'aa_mutated'},
    { id: 'aamutation', name: 'AA Mutation', type: 'string', domain: [0, 1], missingValue: 0, constantDomain: true, useForAggregation: ''},
    { id: 'dna_mutated', name: 'DNA Mutated', type: 'cat', domain: [0, 1], missingValue: 0, constantDomain: true, useForAggregation: 'dna_mutated'},
    { id: 'dnamutation', name: 'DNA Mutation', type: 'string', domain: [0, 1], missingValue: 0, constantDomain: true, useForAggregation: ''}
  ]
};

export const dataTypes:IDataTypeConfig[] = [expression, copyNumber, mutation];

/**
 * List of ids for parameter form elements
 * Reuse this ids and activate the `useSession` option for form elements to have the same selectedIndex between different views
 */
export class ParameterFormIds {
  static DATA_SOURCE = 'data_source';
  static FILTER_BY = 'filter_by';
  static GENE_SYMBOL = 'gene_symbol';
  static CELLLINE_NAME = 'cellline_name';
  static TISSUE_NAME = 'tissue_name';
  static TUMOR_TYPE = 'tumor_type';
  static ALTERATION_TYPE = 'alteration_type';
  static DATA_TYPE = 'data_type';
  static DATA_SUBTYPE = 'data_subtype';
  static COPYNUMBER_SUBTYPE = 'copynumber_subtype';
  static EXPRESSION_SUBTYPE = 'expression_subtype';
  static REFERENCE_GENE = 'reference_gene';
  static SELECTION = 'selection';
  static BIO_TYPE = 'bio_type';
  static AGGREGATION = 'aggregation';
  static COMPARISON_OPERATOR = 'comparison_operator';
  static COMPARISON_VALUE = 'comparison_value';
}

export function convertLog2ToLinear (rows, field:string) {
  console.log('convert log2 score to linear scale');
  return rows.map((row) => {
    row[field] = Math.pow(2, row[field]);
    return row;
  });
}
