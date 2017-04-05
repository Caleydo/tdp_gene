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
    'priority': 10
  });



  // proxy pages

  registry.push('targidView', 'ensembl_org', function () {
    return System.import('./src/views/GeneProxyView');
  }, {
    'name': 'Ensembl',
    'site': '//feb2014.archive.ensembl.org/Homo_sapiens/Gene/Summary?g={gene}',
    'argument': 'gene',
    'idtype': 'Ensembl',
    'selection': 'multiple',
    'group': {
      'name': 'External resources',
      'order': 0
    }
  });

  // registry.push('targidView', 'gene_card', function () {
  //   return System.import('./src/views/GeneProxyView');
  // }, {
  //   'name': 'GeneCards',
  //   'site': '//www.genecards.org/cgi-bin/carddisp.pl?id_type=esembl&id={gene}',
  //   'argument': 'gene',
  //   'idtype': 'Ensembl',
  //   'selection': 'multiple'
  // });

  registry.push('targidView', 'cansar', function () {
    return System.import('./src/views/UniProtProxyView');
  }, {
    'name': 'canSAR',
    'site': '//cansar.icr.ac.uk/cansar/molecular-targets/{gene}/',
    'argument': 'gene',
    'idtype': 'UniProt_human',
    'selection': 'multiple',
    'group': {
      'name': 'External resources',
      'order': 60
    }
  });

  registry.push('targidView', 'uniprot', function () {
    return System.import('./src/views/UniProtProxyView');
  }, {
    'name': 'UniProt',
    'site': '//www.uniprot.org/uniprot/{gene}/',
    'argument': 'gene',
    'idtype': 'UniProt_human',
    'selection': 'multiple',
    'group': {
      'name': 'External resources',
      'order': 70
    }
  });

  registry.push('targidView', 'targetvalidation', function () {
    return System.import('./src/views/GeneProxyView');
  }, {
    'name': 'Open Targets',
    'site': '//targetvalidation.org/target/{gene}',
    'argument': 'gene',
    'idtype': 'Ensembl',
    'selection': 'multiple',
    'group': {
      'name': 'External resources',
      'order': 40
    }
  });

  registry.push('targidView', 'proteinatlas_org', function () {
    return System.import('./src/views/GeneProxyView');
  }, {
    'name': 'Human Protein Atlas',
    'site': '//proteinatlas.org/{gene}',
    'argument': 'gene',
    'idtype': 'Ensembl',
    'selection': 'multiple',
    'group': {
      'name': 'External resources',
      'order': 50
    }
  });

  registry.push('targidView', 'cosmic', function () {
    return System.import('ordino/src/ProxyView');
  }, {
    'name': 'COSMIC',
    'site': '//cancer.sanger.ac.uk/cell_lines/sample/overview?name={cellline}',
    'argument': 'cellline',
    'idtype': 'Cellline',
    'selection': 'multiple',
    'group': {
      'name': 'External resources',
      'order': 0
    }
  });


  // generator-phovea:end
};

