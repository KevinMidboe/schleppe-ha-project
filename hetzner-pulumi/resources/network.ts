import * as pulumi from "@pulumi/pulumi";
import * as hcloud from "@pulumi/hcloud";

import type { NetworkRegion } from "./types";
import { currentIPAddress } from "./utils";

// NETWORKS
const networkName = (name: string, region: NetworkRegion) =>
  `${name}-net-${region}`;

export function regionalNetwork(
  name: string,
  cidr: string,
  region: NetworkRegion,
) {
  const parentNetworkRange = 22;
  const [ip, _] = cidr.split("/");

  const net = new hcloud.Network(name, {
    name,
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

  const net = new hcloud.NetworkSubnet(
    name,
    {
      networkId: parentNetwork.id.apply((id) => Number(id)),
      type: "cloud",
      networkZone: region,
      ipRange: cidr,
    },
    { parent: parentNetwork, dependsOn: [parentNetwork] },
  );

  return net;
}

// FLOATING IPs
export function floatingIP(name: string, server: hcloud.Server) {
  return new hcloud.FloatingIp(
    name,
    {
      type: "ipv4",
      serverId: server.id.apply((i) => Number(i)),
    },
    { dependsOn: [server] },
  );
}

// FIREWALL RULES
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

export function allowSSHToCurrentIP() {
  const ip = currentIPAddress()

  return new hcloud.Firewall("allow-ssh", {
    name: "allow-ssh",
    rules: [
      {
        direction: "in",
        protocol: "tcp",
        port: "22",
        sourceIps: [ip],
        description: "Allow SSH from approved CIDRs only",
      },
    ],
  });
}

export function attach(
  name: string,
  firewall: hcloud.Firewall,
  servers: hcloud.Server[],
) {
  return new hcloud.FirewallAttachment(name, {
    firewallId: firewall.id.apply((id) => Number(id)),
    serverIds: servers.map((server) => server.id.apply((id) => Number(id))),
  });
}
