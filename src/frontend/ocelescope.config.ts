import type OcelescopeConfig from "./types/ocelescope";

import ocelotModule from "./modules/ocelot";
import filterModule from "./modules/filter";
import pluginModule from "./modules/plugins";

const config: OcelescopeConfig = {
  modules: [pluginModule, ocelotModule, filterModule],
};

export default config;
