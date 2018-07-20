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

  function tdpView(id: string, loader: () => any, desc: any, ...descs) {
    registry.push('tdpView', id, loader, Object.assign(desc, ...descs));
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
    topics: ['general', 'external']
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
    topics: ['general', 'external']
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
    topics: ['uniprot', 'general', 'external']
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

  tdpView('humanproteomemap', () => System.import('tdp_core/src/views/ChooserProxyView'), {
    name: 'Human Proteome Map',
    site: 'http://www.humanproteomemap.org/protein.php?hpm_id={gene}',
    helpUrl: 'http://www.humanproteomemap.org/faqs.html',
    preview: () => System.import('./assets/previews/humanproteomemap.png'),
    description: 'Proteomics data from the human proteome map'
  }, common, {
    idtype: 'EntrezGene',
    readableIDType: 'GeneSymbol',
    topics: ['protein', 'external']
  });

  tdpView('proteomicsdb', () => System.import('tdp_core/src/views/Chooser/ProxyView'), {
    name: 'ProteomicsDB',
    site: 'https://www.proteomicsdb.org/proteomicsdb/#human/search/query?protein_name={gene}',
    argument: 'gene',
    helpUrl: 'https://www.proteomicsdb.org/#faq',
    preview: () => System.import('./assets/previews/proteomicsdb.png'),
    description: 'Proteomics data from proteomicsDB'
  }, common, {
    topics: ['protein', 'external']
  });

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
    site: 'https://cancer.sanger.ac.uk/cosmic/gene/analysis?ln={gene}',
    preview: () => System.import('./assets/previews/cosmic_banner.png'),
    description: 'Catalogue Of Somatic Mutations In Cancer',
    helpUrl: 'https://cancer.sanger.ac.uk/cosmic/about'
  }, common, {
    topics: ['cancer', 'external']
  });

  tdpView('tumorportal', () => System.import('tdp_core/src/views/ChooserProxyView'), {
    name: 'Tumor portal',
    site: 'http://www.tumorportal.org/view?geneSymbol={gene}',
    preview: () => System.import('./assets/previews/tumorportal.png'),
    description: 'Tumor portal from the BROAD institute',
    helpUrl: 'https://www.nature.com/articles/nature12912'
  }, common, {
    topics: ['cancer', 'external']
  });

  tdpView('antibodypedia', () => System.import('tdp_core/src/views/ChooserProxyView'), {
    name: 'Antibodypedia',
    site: 'https://www.antibodypedia.com/explore/{gene}',
    preview: () => System.import('./assets/previews/antibodypedia.png'),
    description: 'Searchable database tailored to specific biological and biomedical assays',
    helpUrl: 'https://www.antibodypedia.com/text/about_us'
  }, common, {
    topics: ['compounds', 'external']
  });

  tdpView('rndsystems', () => System.import('tdp_core/src/views/ChooserProxyView'), {
    name: 'R&D Systems',
    site: 'https://www.rndsystems.com/search?keywords={gene}',
    preview: () => System.import('./assets/previews/rndsystems.png'),
    description: 'Tool compound/AB search engine',
    helpUrl: 'https://www.rndsystems.com/about-us'
  }, common, {
    topics: ['compounds', 'external']
  });

  tdpView('biocompare', () => System.import('tdp_core/src/views/ChooserProxyView'), {
    name: 'Biocompare',
    site: 'https://www.biocompare.com/Search-Antibodies/?search={gene}',
    preview: () => System.import('./assets/previews/biocompare.png'),
    description: 'Find antibodies and more from biocompare.com',
    helpUrl: 'https://www.biocompare.com/About-Biocompare/'
  }, common, {
    topics: ['compounds', 'external']
  });

  tdpView('drugebility', () => System.import('tdp_core/src/views/ChooserProxyView'), {
    name: 'DrugEBIlity',
    site: 'https://www.ebi.ac.uk/chembl/drugebility/protein/{protein}',
    preview: () => System.import('./assets/previews/DrugEBIlity.png'),
    description: 'EBI, druggability scores of protein structures',
    helpUrl: 'https://www.ebi.ac.uk/chembl/drugebility/'
  }, common, {
    argument: 'protein',
    idtype: 'Uniprot',
    readableIDType: 'GeneSymbol',
    topics: ['protein', 'external']
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
