/* *****************************************************************************
 * Caleydo - Visualization for Molecular Biology - http://caleydo.org
 * Copyright (c) The Caleydo Team. All rights reserved.
 * Licensed under the new BSD license, available at http://caleydo.org/license
 **************************************************************************** */

import {IRegistry} from 'phovea_core/src/plugin';

export default function (registry: IRegistry) {
  function tdpView(id: string, loader: () => any, desc: any, ...descs) {
    registry.push('tdpView', id, loader, Object.assign(desc, ...descs));
  }

  // proxy pages
  tdpView('ensembl_org', () => System.import('./views/GeneProxyView'), {
    name: 'Ensembl',
    site: 'https://ensembl.org/{species}/Gene/Summary?g={gene}',
    argument: 'gene',
    idtype: 'Ensembl',
    selection: 'chooser',
    preview: () => System.import('./assets/previews/ensembl.jpg'),
    group: {
      name: 'External Resources'
      // 'order: 0
    },
    description: 'Show information on your search from Ensembl.org',
    topics: ['external']
  });

  // doesn't work properly
  // tdpView('cansar', () => System.import('./views/UniProtProxyView'), {
  //   name: 'canSAR',
  //   site: 'https://cansar.icr.ac.uk/cansar/molecular-targets/{gene}/',
  //   argument: 'gene',
  //   idtype: 'Ensembl',
  //   selection: 'chooser',
  //   preview: () => System.import('./assets/previews/cansar.jpg'),
  //   group: {
  //     name: 'External Resources'
  //     // 'order: 60
  //   },
  //   filter: {
  //     species: 'human'
  //   },
  //   description: 'Show information on your search from the canSAR page',
  //   topics: ['external']
  // });

  tdpView('uniprot', () => System.import('./views/UniProtProxyView'), {
    name: 'UniProt',
    site: 'https://www.uniprot.org/uniprot/{gene}/',
    argument: 'gene',
    idtype: 'Ensembl',
    selection: 'chooser',
    openExternally: true,
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
    site: 'https://www.targetvalidation.org/target/{gene}',
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
    topics: ['external']
  });

  tdpView('proteinatlas_org', () => System.import('./views/GeneProxyView'), {
    name: 'Human Protein Atlas',
    site: 'https://proteinatlas.org/{gene}',
    argument: 'gene',
    idtype: 'Ensembl',
    selection: 'chooser',
    openExternally: true,
    preview: () => System.import('./assets/previews/human_protein_atlas.jpg'),
    group: {
      name: 'External Resources'
      // 'order: 50
    },
    filter: {
      species: 'human'
    },
    description: 'Show information on your search from the Human Protein Atlas',
    topics: ['protein', 'external']
  });

  const common = {
    argument: 'gene',
    idtype: 'GeneSymbol',
    selection: 'chooser',
    group: {
      name: 'External Resources'
      // 'order: 60
    },
    filter: {
      species: 'human'
    },
    topics: ['external']
  };

  // tdpView('humanproteomemap', () => System.import('tdp_core/src/views/ChooserProxyView'), {
  //   name: 'Human Proteome Map',
  //   site: 'http://www.humanproteomemap.org/protein.php?hpm_id={gene}',
  //   helpUrl: 'http://www.humanproteomemap.org/faqs.html',
  //   preview: () => System.import('./assets/previews/humanproteomemap.png'),
  //   description: 'Proteomics data from the human proteome map'
  // }, common, {
  //   idtype: 'EntrezGene',
  //   readableIDType: 'GeneSymbol',
  //   topics: ['protein', 'external']
  // });

  tdpView('genenames', () => System.import('tdp_core/src/views/ChooserProxyView'), {
    name: 'Genenames',
    site: 'https://www.genenames.org/cgi-bin/gene_symbol_report?match={gene}',
    preview: () => System.import('./assets/previews/genenames.jpg'),
    description: 'Reference for human gene symbols',
    helpUrl: 'https://www.genenames.org/about/overview'
  }, common);

  tdpView('ClinVar', () => System.import('tdp_core/src/views/ChooserProxyView'), {
    name: 'ClinVar',
    site: 'https://www.ncbi.nlm.nih.gov/clinvar/?term={gene}',
    helpUrl: 'https://www.ncbi.nlm.nih.gov/clinvar/intro/',
    preview: () => System.import('./assets/previews/clinvar.png'),
    description: 'relationships among human variations and phenotypes, with supporting evidence'
  }, common);

  tdpView('cosmic_gene', () => System.import('tdp_core/src/views/ChooserProxyView'), {
    name: 'COSMIC',
    site: 'https://cancer.sanger.ac.uk/cosmic/gene/analysis?genome=38&ln={gene}',
    preview: () => System.import('./assets/previews/cosmic_banner.png'),
    description: 'Catalogue Of Somatic Mutations In Cancer',
    helpUrl: 'https://cancer.sanger.ac.uk/cosmic/about'
  }, common, {
    topics: ['cancer', 'external']
  });


  registry.push('importPostProcessor', 'GeneSymbol', () => System.import('./common/common'), {
    factory: 'convertGeneSymbolToEnsembl'
  });

  registry.push('tdpListFilters', 'SpeciesFilter', () => System.import('./common/common'), {
    factory: 'filterSpecies'
  });

  registry.push('idTypeDetector', 'gene_idtype_detector', () => System.import('./provider/GeneIDTypeDetector'), {
    name: 'IDTypeDetector',
    factory: 'geneIDTypeDetector',
    idType: 'Ensembl'
  });
}
