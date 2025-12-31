import {
  subNetwork,
  regionalNetwork,
  allowHttp,
  allowSSHToCurrentIP,
  floatingIP,
  attach,
} from "./resources/network";
import { server } from "./resources/compute";
import { dns } from "./resources/cloudflare";
import {
  summarizeServer,
  summarizeNetwork,
  summarizeSubNetwork,
  summarizeFloatingIp,
  summarizeFirewall,
} from "./resources/utils";

import {
  VmSize,
  OS,
  NetworkRegion,
  NetworkRole,
  ServerLocations,
} from "./resources/types";

// regional vnet
const eu = regionalNetwork("ha-net-eu", "10.24.0.0/18", NetworkRegion.eu);
const usEast = regionalNetwork(
  "ha-net-us",
  "10.25.0.0/18",
  NetworkRegion.usEast,
);

// subnets for reginal vnets
const network = {
  eu: {
    lb: subNetwork(eu, NetworkRole.lb, NetworkRegion.eu, "10.24.1.0/26"),
    cache: subNetwork(eu, NetworkRole.cache, NetworkRegion.eu, "10.24.2.0/26"),
    web: subNetwork(eu, NetworkRole.web, NetworkRegion.eu, "10.24.3.0/26"),
    // db: subNetwork(eu, NetworkRole.db, "10.24.4.0/24")
  },
  usEast: {
    lb: subNetwork(
      usEast,
      NetworkRole.lb,
      NetworkRegion.usEast,
      "10.25.1.0/26",
    ),
    cache: subNetwork(
      usEast,
      NetworkRole.cache,
      NetworkRegion.usEast,
      "10.25.2.0/26",
    ),
    web: subNetwork(
      usEast,
      NetworkRole.web,
      NetworkRegion.usEast,
      "10.25.3.0/26",
    ),
  },
};

// variable un-maps
const nbg = ServerLocations.nuremberg;
const ash = ServerLocations.ashburn;
const [EU_LB, US_LB, EU_CACHE, US_CACHE, EU_WEB, US_WEB] = [
  network.eu.lb,
  network.usEast.lb,
  network.eu.cache,
  network.usEast.cache,
  network.eu.web,
  network.usEast.web,
];

// compute - server resources
const haEU1 = server("haproxy-1", VmSize.cx23, OS.debian, nbg, EU_LB, true);
const haEU2 = server("haproxy-2", VmSize.cx23, OS.debian, nbg, EU_LB, true);
const haUS1 = server("haproxy-1", VmSize.cpx11, OS.debian, ash, US_LB, true);
const haUS2 = server("haproxy-2", VmSize.cpx11, OS.debian, ash, US_LB, true);

const cacheEU1 = server("varnish-1", VmSize.cx23, OS.debian, nbg, EU_CACHE);
const cacheEU2 = server("varnish-2", VmSize.cx23, OS.debian, nbg, EU_CACHE);
const cacheUS1 = server("varnish-1", VmSize.cpx11, OS.debian, ash, US_CACHE);
const cacheUS2 = server("varnish-2", VmSize.cpx11, OS.debian, ash, US_CACHE);

const webEU1 = server("web-1", VmSize.cx23, OS.debian, nbg, EU_WEB);
const webEU2 = server("web-2", VmSize.cx23, OS.debian, nbg, EU_WEB);
const webUS1 = server("web-1", VmSize.cpx11, OS.debian, ash, US_WEB);

// floating IPs
const euFloatingIP = floatingIP("schleppe-ha-nbg", haEU1);
const usFloatingIP = floatingIP("schleppe-ha-va", haUS1);
const floatingIPs = [euFloatingIP, usFloatingIP];
const domains = ["k9e.no", "planetposen.no", "whoami.schleppe.cloud"];

// Update Cloudflare DNS
domains.forEach((domain) => {
  dns(domain, euFloatingIP, "eu-fip");
  dns(domain, usFloatingIP, "us-fip");
});

// firewall
const allowSSH = allowSSHToCurrentIP();
const firewalls = [allowHttp, allowSSH];
// DISABLED
attach("ssh-fa", allowSSH, [haEU1, haEU2, haUS1, haUS2]);

// exports
const servers = [
  haEU1,
  haEU2,
  haUS1,
  haUS2,
  cacheEU1,
  cacheEU2,
  cacheUS1,
  cacheUS2,
  webEU1,
  webEU2,
  webUS1,
];

const networks = [eu, usEast];
const subNetworks = [
  network.eu.lb,
  network.eu.cache,
  network.eu.web,
  network.usEast.lb,
  network.usEast.web,
];

export const inventory = {
  vms: servers.map(summarizeServer),
  networks: networks.map(summarizeNetwork),
  subnetworks: subNetworks.map(summarizeSubNetwork),
  firewalls: firewalls.map(summarizeFirewall),
  floatingIps: floatingIPs.map(summarizeFloatingIp),
  domains,
};
