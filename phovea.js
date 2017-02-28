/* *****************************************************************************
 * Caleydo - Visualization for Molecular Biology - http://caleydo.org
 * Copyright (c) The Caleydo Team. All rights reserved.
 * Licensed under the new BSD license, available at http://caleydo.org/license
 **************************************************************************** */

//register all extensions in the registry following the given pattern
module.exports = function (registry) {
  //registry.push('extension-type', 'extension-id', function() { return System.import('./src/extension_impl'); }, {});
  // generator-phovea:begin
  registry.push('targidStartMenuSection', 'targid_start_species', function () {
    return System.import('./src/SpeciesSelector');
  }, {
    'name': 'Predefined Datasets',
    'cssClass': 'speciesSelector',
    'factory': 'create',
    'headers': {
      'cellline': 'Cell Line Panels',
      'ensembl': 'Gene Sets',
      'tissue': 'Tissue Panels'
    },
    'priority': 10
  });

  registry.push('targidStartEntryPoint', 'celllinedb_genes_start', function () {
    return System.import('./src/GeneEntryPoint');
  }, {
    'name': 'Genes',
    'factory': 'createStartFactory',
    'viewId': 'celllinedb_start',
    'idtype': 'Ensembl',
    'selection': 'none'
  });
  registry.push('targidView', 'celllinedb_start', function () {
    return System.import('./src/GeneEntryPoint');
  }, {
    'name': 'Genes',
    'factory': 'createStart',
    'idtype': 'Ensembl',
    'selection': 'none'
  });

  registry.push('targidStartEntryPoint', 'bioinfodb_tissue_start', function () {
    return System.import('./src/CellLineEntryPoint');
  }, {
    'name': 'Tissues',
    'factory': 'createStartFactory',
    'viewId': 'bioinfodb_tissue_start',
    "idtype": "Tissue",
    "selection": "none",
    "sampleType": "Tissue"
  });
  registry.push('targidView', 'bioinfodb_tissue_start', function () {
    return System.import('./src/CellLineEntryPoint');
  }, {
    'name': 'Tissues',
    'factory': 'createStart',
    "idtype": "Tissue",
    "selection": "none",
    "sampleType": "Tissue"
  });


  registry.push('targidStartEntryPoint', 'celllinedb_cellline_start', function () {
    return System.import('./src/CellLineEntryPoint');
  }, {
    'name': 'Cell Lines',
    'factory': 'createStartFactory',
    'viewId': 'celllinedb_cellline',
    'idtype': 'Cellline',
    'selection': 'none'
  });
  registry.push('targidView', 'celllinedb_cellline', function () {
    return System.import('./src/CellLineEntryPoint');
  }, {
    'name': 'Cell Lines',
    'factory': 'createStart',
    'idtype': 'Cellline',
    'selection': 'none'
  });

  //views

  registry.push('__targidView__backup', 'celllinedb_enrichment', function () {
    return System.import('./src/Enrichment');
  }, {
    'name': 'Enrichment',
    'category': 'dynamic',
    'idtype': 'Ensembl',
    'selection': 'single',
    'mockup': true
  });


  registry.push('targidView', 'expressiontable', function () {
    return System.import('./src/RawDataTable');
  }, {
    'name': 'Expression',
    'factory': 'createExpressionTable',
    'idtype': 'Ensembl',
    'selection': 'some'
  });

  registry.push('targidView', 'copynumbertable', function () {
    return System.import('./src/RawDataTable');
  }, {
    'name': 'Copy Number',
    'factory': 'createCopyNumberTable',
    'idtype': 'Ensembl',
    'selection': 'some'
  });

  registry.push('targidView', 'mutationtable', function () {
    return System.import('./src/RawDataTable');
  }, {
    'name': 'Mutation',
    'factory': 'createMutationTable',
    'idtype': 'Ensembl',
    'selection': 'some'
  });

  registry.push('targidView', 'celllline_inverted_expressiontable', function () {
    return System.import('./src/InvertedRawDataTable');
  }, {
    'name': 'Expression',
    'factory': 'createExpressionTable',
    'idtype': 'Cellline',
    'selection': 'some'
  });

  registry.push('targidView', 'celllline_inverted_copynumbertable', function () {
    return System.import('./src/InvertedRawDataTable');
  }, {
    'name': 'Copy Number',
    'factory': 'createCopyNumberTable',
    'idtype': 'Cellline',
    'selection': 'some'
  });

  registry.push('targidView', 'celllline_inverted_mutationtable', function () {
    return System.import('./src/InvertedRawDataTable');
  }, {
    'name': 'Mutation',
    'factory': 'createMutationTable',
    'idtype': 'Cellline',
    'selection': 'some'
  });

  registry.push('targidView', 'tissue_inverted_expressiontable', function () {
    return System.import('./src/InvertedRawDataTable');
  }, {
    'name': 'Expression',
    'factory': 'createExpressionTable',
    'idtype': 'Tissue',
    'sampleType': 'Tissue',
    'selection': 'some'
  });

  registry.push('targidView', 'tissue_inverted_copynumbertable', function () {
    return System.import('./src/InvertedRawDataTable');
  }, {
    'name': 'Copy Number',
    'factory': 'createCopyNumberTable',
    'idtype': 'Tissue',
    'sampleType': 'Tissue',
    'selection': 'some'
  });

  registry.push('targidView', 'tissue_inverted_mutationtable', function () {
    return System.import('./src/InvertedRawDataTable');
  }, {
    'name': 'Mutation',
    'factory': 'createMutationTable',
    'idtype': 'Tissue',
    'sampleType': 'Tissue',
    'selection': 'some'
  });

  // proxy pages

  registry.push('targidView', 'ensembl_org', function () {
    return System.import('./src/GeneProxyView');
  }, {
    'name': 'Ensembl',
    'category': 'static',
    'site': '//feb2014.archive.ensembl.org/Homo_sapiens/Gene/Summary?g={gene}',
    'argument': 'gene',
    'idtype': 'Ensembl',
    'selection': 'multiple'
  });

  registry.push('__targidView__bak', 'gene_card', function () {
    return System.import('./src/GeneProxyView');
  }, {
    'name': 'GeneCards',
    'category': 'static',
    'site': '//www.genecards.org/cgi-bin/carddisp.pl?id_type=esembl&id={gene}',
    'argument': 'gene',
    'idtype': 'Ensembl',
    'selection': 'multiple'
  });

  registry.push('targidView', 'cansar', function () {
    return System.import('./src/UniProtProxyView');
  }, {
    'name': 'canSAR',
    'category': 'static',
    'site': '//cansar.icr.ac.uk/cansar/molecular-targets/{gene}/',
    'argument': 'gene',
    'idtype': 'UniProt',
    'selection': 'multiple'
  });

  registry.push('targidView', 'uniprot', function () {
    return System.import('./src/UniProtProxyView');
  }, {
    'name': 'UniProt',
    'category': 'static',
    'site': '//www.uniprot.org/uniprot/{gene}/',
    'argument': 'gene',
    'idtype': 'UniProt',
    'selection': 'multiple'
  });

  registry.push('targidView', 'targetvalidation', function () {
    return System.import('./src/GeneProxyView');
  }, {
    'name': 'Open Targets',
    'category': 'static',
    'site': '//targetvalidation.org/target/{gene}',
    'argument': 'gene',
    'idtype': 'Ensembl',
    'selection': 'multiple'
  });

  registry.push('targidView', 'clip', function () {
    return System.import('./src/GeneProxyView');
  }, {
    'name': 'CLIP',
    'category': 'static',
    'site': '//vie-toolbox/clip/multiViewGene.php?ensg={gene}',
    'argument': 'gene',
    'idtype': 'Ensembl',
    'selection': 'multiple'
  });

  registry.push('targidView', 'proteinatlas_org', function () {
    return System.import('./src/GeneProxyView');
  }, {
    'name': 'The Human Protein Atlas',
    'category': 'static',
    'site': '//proteinatlas.org/{gene}',
    'argument': 'gene',
    'idtype': 'Ensembl',
    'selection': 'multiple'
  });

  registry.push('targidView', 'cosmic', function () {
    return System.import('ordino/src/ProxyView');
  }, {
    'name': 'COSMIC',
    'category': 'static',
    'site': '//cancer.sanger.ac.uk/cell_lines/sample/overview?name={cellline}',
    'argument': 'cellline',
    'idtype': 'Cellline',
    'selection': 'multiple'
  });

  registry.push('targidView', 'clip_cellline', function () {
    return System.import('ordino/src/ProxyView');
  }, {
    'name': 'CLIP',
    'category': 'static',
    'site': '///vie-toolbox/clip/multiViewCellline.php?celllinename={cellline}',
    'argument': 'cellline',
    'idtype': 'Cellline',
    'selection': 'multiple'
  });

  registry.push('targidView', 'shiny_cellline', function () {
    return System.import('ordino/src/ProxyView');
  }, {
    'name': 'CN Cell Line Details',
    'category': 'static',
    'site': '///vie-bio-shiny.eu.boehringer.com:3838/copynumberpercellline/?celllinename{cellline}',
    'argument': 'cellline',
    'idtype': 'Cellline',
    'selection': 'multiple'
  });

  //scores

  registry.push('targidScore', 'tissue_inverted_aggregated_score', function () {
    return System.import('./src/InvertedAggregatedScore');
  }, {
    'name': 'Score',
    'idtype': 'Tissue',
    'sampleType': 'Tissue'
  });

  registry.push('targidScore', 'gene_aggregated_score', function () {
    return System.import('./src/AggregatedScore');
  }, {
    'name': 'Score',
    'idtype': 'Ensembl'
  });
  registry.push('targidScore', 'cellline_inverted_aggregated_score', function () {
    return System.import('./src/InvertedAggregatedScore');
  }, {
    'name': 'Score',
    'idtype': 'Cellline'
  });
  // generator-phovea:end
};

