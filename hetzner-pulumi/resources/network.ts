import * as pulumi from "@pulumi/pulumi";
import * as hcloud from "@pulumi/hcloud";

import type { NetworkRegion } from "./types";

// Required

// make sure to have regional parent networks

const networkName = (name: string, region: NetworkRegion) =>
  `${name}-net-${region}`;

export function regionalNetwork(
  prefix: string,
  cidr: string,
  region: NetworkRegion,
) {
  const name = networkName(prefix, region);
  const parentNetworkRange = 8;
  const [ip, _] = cidr.split("/");

  const net = new hcloud.Network(name, {
    ipRange: `${ip}/${parentNetworkRange}`,
    labels: {
      region,
      hiearchy: "parent",
    },
  });

  return net;
}

export function subNetwork(
  parentNetwork: hcloud.Network,
  prefix: string,
  region: NetworkRegion,
  cidr: string,
): hcloud.NetworkSubnet {
  const name = `${prefix}-subnet-${region}`;

  const net = new hcloud.NetworkSubnet(name, {
    networkId: parentNetwork.id.apply(id => Number(id)),
    type: "cloud",
    networkZone: "eu-central",
    ipRange: cidr,
  });

  return net;
}

export const allowHttp = new hcloud.Firewall("allow-http", {
  name: "allow-http",
  applyTos: [
    {
      labelSelector: `role=load-balancer,env=${pulumi.getStack()}`,
    },
  ],
  rules: [
    {
      direction: "in",
      protocol: "tcp",
      port: "80",
      sourceIps: ["0.0.0.0/0", "::/0"],
      description: "Allow HTTP",
    },
    {
      direction: "in",
      protocol: "tcp",
      port: "443",
      sourceIps: ["0.0.0.0/0", "::/0"],
      description: "Allow HTTPS",
    },
    {
      direction: "in",
      protocol: "udp",
      port: "443",
      sourceIps: ["0.0.0.0/0", "::/0"],
      description: "Allow QUIC",
    },
  ],
});

export const allowSSH = new hcloud.Firewall("allow-ssh", {
  name: "allow-ssh",
  rules: [
    {
      direction: "in",
      protocol: "tcp",
      port: "22",
      sourceIps: ["127.0.0.0/24"],
      description: "Allow SSH from approved CIDRs only",
    },
  ],
});

