/* *****************************************************************************
 * Caleydo - Visualization for Molecular Biology - http://caleydo.org
 * Copyright (c) The Caleydo Team. All rights reserved.
 * Licensed under the new BSD license, available at http://caleydo.org/license
 **************************************************************************** */

import {IRegistry} from 'phovea_core/src/plugin';

export default function (registry: IRegistry) {
  //registry.push('extension-type', 'extension-id', function() { return System.import('./extension_impl'); }, {});
  // generator-phovea:begin
  /// #if include('ordino')
  registry.push('ordinoStartMenuSection', 'section_species', () => System.import('./menu/SpeciesSelectorMenuSection'), {
     name: 'Predefined Datasets',
     cssClass: 'speciesSelector',
     priority: 10
  });
  /// #endif

  function tdpView(id: string, loader: () => any, desc: any) {
    registry.push('tdpView', id, loader, desc);
  }

  // proxy pages
  tdpView('ensembl_org', () => System.import('./views/GeneProxyView'), {
     name: 'Ensembl',
     site: '//grch37.ensembl.org/{species}/Gene/Summary?g={gene}',
     argument: 'gene',
     idtype: 'Ensembl',
     selection: 'chooser',
     preview: () => System.import('./assets/previews/ensembl.jpg'),
     group: {
       name: 'External Resources'
      // 'order: 0
    },
    description: 'Show information on your search from Ensembl.org',
    topics: ['ensembl', 'external']
  });

  tdpView('cansar', () => System.import('./views/UniProtProxyView'), {
     name: 'canSAR',
     site: '//cansar.icr.ac.uk/cansar/molecular-targets/{gene}/',
     argument: 'gene',
     idtype: 'Ensembl',
     selection: 'chooser',
     preview: () => System.import('./assets/previews/cansar.jpg'),
     group: {
       name: 'External Resources'
      // 'order: 60
    },
     filter: {
       species: 'human'
    },
    description: 'Show information on your search from the canSAR page',
    topics: ['cansar', 'external']
  });

  tdpView('uniprot', () => System.import('./views/UniProtProxyView'), {
     name: 'UniProt',
     site: 'https://www.uniprot.org/uniprot/{gene}/',
     argument: 'gene',
     idtype: 'Ensembl',
     selection: 'chooser',
     preview: () => System.import('./assets/previews/uniprot.jpg'),
     group: {
       name: 'External Resources'
      // 'order: 70
    },
    description: 'Show information on your search from UniProt',
    topics: ['uniprot', 'external']
  });

  tdpView('targetvalidation', () => System.import('./views/GeneProxyView'), {
     name: 'Open Targets',
     site: '//www.targetvalidation.org/target/{gene}',
     argument: 'gene',
     idtype: 'Ensembl',
     selection: 'chooser',
     preview: () => System.import('./assets/previews/open_targets.jpg'),
     group: {
       name: 'External Resources'
      // 'order: 40
    },
     filter: {
       species: 'human'
    },
    description: 'Show information on your search from Open Targets',
    topics: ['open-targets', 'external']
  });

  tdpView('proteinatlas_org', () => System.import('./views/GeneProxyView'), {
     name: 'Human Protein Atlas',
     site: '//proteinatlas.org/{gene}',
     argument: 'gene',
     idtype: 'Ensembl',
     selection: 'chooser',
     preview: () => System.import('./assets/previews/human_protein_atlas.jpg'),
     group: {
       name: 'External Resources'
      // 'order: 50
    },
     filter: {
       species: 'human'
    },
    description: 'Show information on your search from the Human Protein Atlas',
    topics: ['protein-atlas', 'external']
  });

  registry.push('importPostProcessor', 'GeneSymbol', () => System.import('./common'), {
     factory: 'convertGeneSymbolToEnsembl'
  });

  registry.push('tdpListFilters', 'SpeciesFilter', () => System.import('./common'), {
     factory: 'filterSpecies'
  });

  registry.push('idTypeDetector', 'gene_idtype_detector', () => System.import('./GeneIDTypeDetector'), {
     name: 'IDTypeDetector',
     factory: 'geneIDTypeDetector',
     idType: 'Ensembl'
  });

  // generator-phovea:end
}
