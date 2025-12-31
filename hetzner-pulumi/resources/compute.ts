import * as pulumi from "@pulumi/pulumi";
import * as hcloud from "@pulumi/hcloud";
import * as random from "@pulumi/random";
import { config } from "./config";
import { getCheapestServerType, topicedLabel } from "./utils";

import { VmSize, OS, ServerLocations } from "./types";

// “Tag” servers using labels. Hetzner firewalls can target servers by label selectors. :contentReference[oaicite:2]{index=2}
const serverLabels = {
  env: pulumi.getStack(),
  managed: "pulumi",
};

const sshPublicKey = config.require("sshPublicKey");
const sshKey = new hcloud.SshKey("ssh-key", {
  name: `pulumi-${pulumi.getStack()}-ssh`,
  publicKey: sshPublicKey,
});

const serverName = (name: string, location: string) => {
  if (name.includes("-")) {
    const [n, id] = name.split("-");
    return `${n}-${location}-${id}`;
  }

  return `${name}-${location}`;
};

export function server(
  name: string,
  size: VmSize,
  os: OS = OS.debian,
  location: ServerLocations,
  network: hcloud.NetworkSubnet,
  ipv4: boolean = false,
): hcloud.Server {
  const extraLabel = topicedLabel(name)
  name = serverName(name, location);
  const networkId = network.networkId.apply((id) => String(id).split("-")[0]);

  const server = new hcloud.Server(
    name,
    {
      name,
      image: os,
      serverType: size,
      location,
      backups: false,
      publicNets: [
        {
          ipv4Enabled: ipv4,
          ipv6Enabled: true,
        },
      ],
      networks: [
        {
          networkId: networkId.apply((nid) => Number(nid)),
        },
      ],
      sshKeys: [sshKey.name],
      labels: {
        ...serverLabels,
        ...extraLabel
      },
    },
    { dependsOn: [network] },
  );

  const serverNet = new hcloud.ServerNetwork(
    `${name}-servernet-${location}`,
    {
      serverId: server.id.apply((id) => Number(id)),
      subnetId: network.id,
    },
    {
      dependsOn: [network, server],
      parent: server,
      deleteBeforeReplace: true,

      ignoreChanges: [ 'serverId', 'ip', 'aliasIps', 'networkId', 'subnetId' ]
    },
  );

  return server;
}
