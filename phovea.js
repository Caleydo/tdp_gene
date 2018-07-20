/* *****************************************************************************
 * Caleydo - Visualization for Molecular Biology - http://caleydo.org
 * Copyright (c) The Caleydo Team. All rights reserved.
 * Licensed under the new BSD license, available at http://caleydo.org/license
 **************************************************************************** */

module.exports = function (registry) {
  //registry.push('extension-type', 'extension-id', function() { return System.import('./extension_impl'); }, {});
  // generator-phovea:begin
  /// #if include('ordino')
  registry.push('ordinoStartMenuSection', 'section_species', () => System.import('./src/menu/SpeciesSelectorMenuSection'), {
    name: 'Predefined Datasets',
    cssClass: 'speciesSelector',
    priority: 10
  });
  /// #endif

  const phovea = require('./src/phovea').default;
  phovea(registry);
  // generator-phovea:end
}
