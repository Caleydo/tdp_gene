/* *****************************************************************************
 * Caleydo - Visualization for Molecular Biology - http://caleydo.org
 * Copyright (c) The Caleydo Team. All rights reserved.
 * Licensed under the new BSD license, available at http://caleydo.org/license
 **************************************************************************** */
import reg from './src/phovea';

export default function (registry) {
  //registry.push('extension-type', 'extension-id', function() { return import('./extension_impl'); }, {});
  // generator-phovea:begin
  /// #if include('ordino')
  registry.push('ordinoStartMenuSection', 'section_species', function() { return import('./src/menu/SpeciesSelectorMenuSection').then((s) => s.SpeciesSelectorMenuSection); }, {
    name: 'Predefined Datasets',
    cssClass: 'speciesSelector',
    priority: 10
  });
  /// #endif

  reg(registry);
  // generator-phovea:end
}
