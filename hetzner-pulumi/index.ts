import {
  subNetwork,
  regionalNetwork,
  allowHttp,
  allowSSH,
} from "./resources/network";
import { server } from "./resources/compute";

import {
  VmSize,
  OS,
  NetworkRegion,
  NetworkRole,
  ServerLocations,
} from "./resources/types";

// regional vnet
const eu = regionalNetwork("ha", "10.24.0.0/18", NetworkRegion.eu);
const usEast = regionalNetwork("ha", "10.25.0.0/18", NetworkRegion.usEast);

// subnets for reginal vnets
const network = {
  eu: {
    lb: subNetwork(eu, NetworkRole.lb, NetworkRegion.eu, "10.24.1.0/24"),
    cache: subNetwork(eu, NetworkRole.cache, NetworkRegion.eu, "10.24.2.0/24"),
    web: subNetwork(eu, NetworkRole.web, NetworkRegion.eu, "10.24.3.0/24"),
    // db: subNetwork(eu, NetworkRole.db, "10.24.4.0/24")
  },
  usEast: {
    lb: subNetwork(
      usEast,
      NetworkRole.lb,
      NetworkRegion.usEast,
      "10.25.1.0/24",
    ),
    cache: subNetwork(
      usEast,
      NetworkRole.cache,
      NetworkRegion.usEast,
      "10.25.2.0/24",
    ),
    web: subNetwork(
      usEast,
      NetworkRole.web,
      NetworkRegion.usEast,
      "10.25.3.0/24",
    ),
  },
};

// variable un-maps
const hel1 = ServerLocations.helsinki;
const hil = ServerLocations.hillsboro;
const [EU_LB, US_LB, EU_CACHE, US_CACHE, EU_WEB, US_WEB] = [
  network.eu.lb,
  network.usEast.lb,
  network.eu.cache,
  network.usEast.cache,
  network.eu.web,
  network.usEast.web,
];

// compute - server resources
const haEU1 = server("haproxy-1", VmSize.small, OS.debian, hel1, EU_LB);
const haEU2 = server("haproxy-2", VmSize.small, OS.debian, hel1, EU_LB);
const haUS1 = server("haproxy-1", VmSize.small, OS.debian, hil, US_LB);
// const haUS2 = server("haproxy-2", VmSize.small, OS.debian, hil, US_LB);

const cacheEU1 = server("varnish-1", VmSize.small, OS.debian, hel1, EU_CACHE);
const cacheEU2 = server("varnish-2", VmSize.small, OS.debian, hil, EU_CACHE);
// const cacheUS1 = server("varnish-1", VmSize.small, OS.debian, hil, US_CACHE);
// const cacheUS2 = server("varnish-2", VmSize.small, OS.debian, hil, US_CACHE);

const webEU1 = server("web-1", VmSize.small, OS.debian, hel1, EU_WEB);
// const webEU2 = server("web-2", VmSize.small, OS.debian, hel1, EU_WEB);
// const webUS1 = server("web-1", VmSize.small, OS.debian, hil, US_WEB);

// firewall & exports
export const firewalls = [allowHttp, allowSSH];

// exports contd.
export const servers = [haEU1, haEU2, haUS1, cacheEU1, cacheEU2, webEU1];

export const networks = [
  eu,
  usEast,
  network.eu.lb,
  network.eu.cache,
  network.eu.web,
  network.usEast.lb,
  network.usEast.web,
];
