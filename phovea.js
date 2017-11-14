/* *****************************************************************************
 * Caleydo - Visualization for Molecular Biology - http://caleydo.org
 * Copyright (c) The Caleydo Team. All rights reserved.
 * Licensed under the new BSD license, available at http://caleydo.org/license
 **************************************************************************** */

//register all extensions in the registry following the given pattern
module.exports = function (registry) {
  //registry.push('extension-type', 'extension-id', function() { return import('./src/extension_impl'); }, {});
  // generator-phovea:begin
  /// #if include('ordino')
  registry.push('ordinoStartMenuSection', 'section_species', function () {
    return import('./src/menu/SpeciesSelectorMenuSection');
  }, {
     name: 'Predefined Datasets',
     cssClass: 'speciesSelector',
     priority: 10
  });
  /// #endif

  // proxy pages

  registry.push('tdpView', 'ensembl_org', function () {
    return import('./src/views/GeneProxyView');
  }, {
     name: 'Ensembl',
     site: '//grch37.ensembl.org/{species}/Gene/Summary?g={gene}',
     argument: 'gene',
     idtype: 'Ensembl',
     selection: 'chooser',
     preview: function() { return import('./src/assets/previews/ensembl.jpg') },
     group: {
       name: 'External resources'
      // 'order: 0
    },
    description: 'Show information on your search from Ensembl.org'
  });

  // registry.push('targidView', 'gene_card', function () {
  //   return import('./src/views/GeneProxyView');
  // }, {
  //    name: 'GeneCards',
  //    site: '//www.genecards.org/cgi-bin/carddisp.pl?id_type=esembl&id={gene}',
  //    argument: 'gene',
  //    idtype: 'Ensembl',
  //    selection: 'multiple'
  // });

  registry.push('tdpView', 'cansar', function () {
    return import('./src/views/UniProtProxyView');
  }, {
     name: 'canSAR',
     site: '//cansar.icr.ac.uk/cansar/molecular-targets/{gene}/',
     argument: 'gene',
     idtype: 'Ensembl',
     selection: 'chooser',
     preview: function() { return import('./src/assets/previews/cansar.jpg') },
     group: {
       name: 'External resources'
      // 'order: 60
    },
     filter: {
       species: 'human'
    },
    description: 'Show information on your search from the canSAR page'
  });

  registry.push('tdpView', 'uniprot', function () {
    return import('./src/views/UniProtProxyView');
  }, {
     name: 'UniProt',
     site: 'http://www.uniprot.org/uniprot/{gene}/',
     argument: 'gene',
     idtype: 'Ensembl',
     selection: 'chooser',
     preview: function() { return import('./src/assets/previews/uniprot.jpg') },
     group: {
       name: 'External resources'
      // 'order: 70
    },
    description: 'Show information on your search from UniProt'
  });

  registry.push('tdpView', 'targetvalidation', function () {
    return import('./src/views/GeneProxyView');
  }, {
     name: 'Open Targets',
     site: '//www.targetvalidation.org/target/{gene}',
     argument: 'gene',
     idtype: 'Ensembl',
     selection: 'chooser',
     preview: function() { return import('./src/assets/previews/open_targets.jpg') },
     group: {
       name: 'External resources'
      // 'order: 40
    },
     filter: {
       species: 'human'
    },
    description: 'Show information on your search from Open Targets'
  });

  registry.push('tdpView', 'proteinatlas_org', function () {
    return import('./src/views/GeneProxyView');
  }, {
     name: 'Human Protein Atlas',
     site: '//proteinatlas.org/{gene}',
     argument: 'gene',
     idtype: 'Ensembl',
     selection: 'chooser',
     preview: function() { return import('./src/assets/previews/human_protein_atlas.jpg') },
     group: {
       name: 'External resources'
      // 'order: 50
    },
     filter: {
       species: 'human'
    },
    description: 'Show information on your search from the Human Protein Atlas'
  });

  registry.push('tdpView', 'cosmic', function () {
    return import('tdp_core/src/views/ProxyView');
  }, {
     name: 'COSMIC',
     site: '//cancer.sanger.ac.uk/cell_lines/sample/overview?name={cellline}',
     argument: 'cellline',
     idtype: 'Cellline',
     selection: 'chooser',
     preview: function() { return import('./src/assets/previews/cosmic.jpg') },
     group: {
       name: 'External resources'
      // 'order: 0
    },
     filter: {
       species: 'human'
    },
    description: 'Show information on your search from COSMIC'
  });


  registry.push('importPostProcessor', 'GeneSymbol', function() {
    return import('./src/common');
  }, {
     factory: 'convertGeneSymbolToEnsembl'
  });

  registry.push('tdpListFilters', 'SpeciesFilter', function() {
    return import('./src/common');
  }, {
     factory: 'filterSpecies'
  });

  registry.push('idTypeDetector', 'gene_idtype_detector', function () {
    return import('./src/GeneIDTypeDetector');
  }, {
     name: 'IDTypeDetector',
     factory: 'geneIDTypeDetector',
     idType: 'Ensembl'
  });

  // generator-phovea:end
};

