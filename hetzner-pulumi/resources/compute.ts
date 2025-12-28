import * as pulumi from "@pulumi/pulumi";
import * as hcloud from "@pulumi/hcloud";
import * as random from "@pulumi/random";
import { config } from './config';
import { getCheapestServerType } from './utils';

import { VmSize, OS, ServerLocations } from "./types";

// “Tag” servers using labels. Hetzner firewalls can target servers by label selectors. :contentReference[oaicite:2]{index=2}
const serverLabels = {
  app: "demo",
  role: "web",
  env: pulumi.getStack(),
};

/*
function getSshPublicKey(): hcloud.SshKey {
  const sshPublicKey = config.require("sshPublicKey"); 
  return sshKey;
}
*/

  const sshPublicKey = config.require("sshPublicKey"); 
  const sshKey = new hcloud.SshKey("ssh-key", {
    name: `pulumi-${pulumi.getStack()}-ssh`,
    publicKey: sshPublicKey,
  });

export function genServer(
  name: string,
  size: VmSize,
  os: OS = OS.debian,
  location: ServerLocations,
  network: hcloud.NetworkSubnet
): hcloud.Server {
  const ceap = getCheapestServerType('eu');
  const hexId = new random.RandomId(`${name}-${location}`, {
    byteLength: 2, // 2 bytes = 4 hex characters
  });

  name = `${name}-${location}`

  return new hcloud.Server(name, {
    name,
    image: os,
    serverType: ceap,
    location,
    networks: [network],
    sshKeys: [sshKey.name],
    labels: serverLabels
  })
}
