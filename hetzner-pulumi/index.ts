import {  
  subNetwork,
  regionalNetwork,
} from "./resources/network";
import { genServer } from "./resources/compute";

import {
  VmSize,
  OS,
  NetworkRegion,
  NetworkRole,
  ServerLocations,
} from "./resources/types";

const eu = regionalNetwork("ha", "10.24.0.0/18", NetworkRegion.eu);
const usEast = regionalNetwork("ha", "10.25.0.0/18", NetworkRegion.usEast);

const network = {
  eu: {
    lb: subNetwork(eu, NetworkRole.lb, NetworkRegion.eu, "10.24.1.0/24"),
    cache: subNetwork(eu, NetworkRole.cache, NetworkRegion.eu, "10.24.2.0/24"),
    web: subNetwork(eu, NetworkRole.web, NetworkRegion.eu, "10.24.3.0/24"),
    // db: subNetwork(eu, NetworkRole.db, "10.24.4.0/24")
  },
  us: {
    lb: subNetwork(usEast, NetworkRole.lb, NetworkRegion.usEast, "10.25.1.0/24"),
    web: subNetwork(usEast, NetworkRole.web, NetworkRegion.usEast, "10.25.2.0/24"),
  },
};

const hel1 = ServerLocations.helsinki;
const hil = ServerLocations.hillsboro;

const haproxyEU1 = genServer("haproxy-1", VmSize.small, OS.debian, hel1, network.eu.lb);
const haproxyEU2 = genServer("haproxy-2", VmSize.small, OS.debian, hel1, network.eu.lb);
const haproxyUS1 = genServer("haproxy-1", VmSize.small, OS.debian, hil, network.us.lb);

const haproxyCache1 = genServer("varnish-1", VmSize.small, OS.debian, hel1, network.eu.cache);
const haproxyCache2 = genServer("varnish-2", VmSize.small, OS.debian, hel1, network.eu.cache);
// const varnishUS = genServer(2, 'varnish', VmSize.small, OS.debian, hel1, network.us.cache)

export const servers = [
  haproxyEU1, haproxyEU2, haproxyUS1, haproxyCache1, haproxyCache2
];

export const networks = [
  eu,
  usEast,
  network.eu.lb,
  network.eu.cache,
  network.eu.web,
  network.us.lb,
  network.us.web,
];
