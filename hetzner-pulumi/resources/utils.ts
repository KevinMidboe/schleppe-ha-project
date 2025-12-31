import * as pulumi from "@pulumi/pulumi";
import * as hcloud from "@pulumi/hcloud";
import { z } from "zod";
import * as crypto from "node:crypto";

/**
 * Region abstraction exposed to users
 */
export type PricingRegion = "eu" | "us" | "ap";

/**
 * Hetzner region → locations mapping
 */
const regionToLocations: Record<PricingRegion, string[]> = {
  eu: ["nbg1", "fsn1", "hel1"],
  us: ["ash", "hil"],
  ap: ["sin"],
};

const HCLOUD_API = "https://api.hetzner.cloud/v1";

/**
 * Runtime validation for Hetzner /server_types response
 */
const serverTypesResponseSchema = z.object({
  server_types: z.array(
    z.object({
      name: z.string(),
      deprecated: z.boolean().optional(),
      prices: z.array(
        z.object({
          location: z.string(),
          price_monthly: z.object({
            gross: z.string(),
          }),
          price_hourly: z.object({
            gross: z.string(),
          }),
        }),
      ),
    }),
  ),
});

/**
 * Returns the cheapest available server type name
 * for a given abstract region (eu | us | ap).
 *
 * Pricing basis: monthly gross
 */
export function getCheapestServerType(
  region: PricingRegion,
): pulumi.Output<string> {
  const locations = regionToLocations[region];
  const hcloudCfg = new pulumi.Config("hcloud");
  const token = hcloudCfg.requireSecret("token");

  return pulumi.all([token]).apply(async ([t]) => {
    const res = await fetch(`${HCLOUD_API}/server_types`, {
      headers: { Authorization: `Bearer ${t}` },
    });

    if (!res.ok) {
      throw new pulumi.RunError(
        `Hetzner API error: ${res.status} ${res.statusText}`,
      );
    }

    const json = await res.json();
    const parsed = serverTypesResponseSchema.safeParse(json);

    if (!parsed.success) {
      const hash = crypto
        .createHash("sha256")
        .update(JSON.stringify(json))
        .digest("hex")
        .slice(0, 12);

      throw new pulumi.RunError(
        `Unexpected Hetzner /server_types payload (sha256:${hash})`,
      );
    }

    const cheapest = parsed.data.server_types
      .filter((st) => st.deprecated !== true)
      .flatMap((st) =>
        st.prices
          .filter((p) => locations.includes(p.location))
          .map((p) => ({
            name: st.name,
            price: Number.parseFloat(p.price_hourly.gross),
          })),
      )
      .filter((x) => Number.isFinite(x.price))
      .sort((a, b) => a.price - b.price)[0];

    if (!cheapest) {
      throw new pulumi.RunError(
        `No priced server types found for region=${region}`,
      );
    }

    return cheapest.name;
  });
}

interface Label {
  role?: string
}

export function topicedLabel(name: string) {
  let labels: Label = {};
  if (name.includes("haproxy")) {
    labels.role = 'load-balancer';
  } else if (name.includes("web")) {
    labels.role = 'web'
  }

  return labels
}


export const summarizeServer = (s: hcloud.Server) => ({
  name: s.name,
  publicIpv4: s.ipv4Address,
  publicIpv6: s.ipv6Address,
  privateIp: s.networks.apply(nets => nets?.[0]?.ip ?? 'null'),
});

export const summarizeNetwork = (n: hcloud.Network) => ({
  name: n.name,
  cidr: n.ipRange
});

export const summarizeSubNetwork = (n: hcloud.NetworkSubnet) => ({
  gateway: n.gateway,
  cidr: n.ipRange,
  zone: n.networkZone,
  type: n.type
});

export const summarizeFloatingIp = (floatingIp: hcloud.FloatingIp) => ({
  name: floatingIp.name,
  address: floatingIp.ipAddress,
  attachedTo: floatingIp.serverId,
  location: floatingIp.homeLocation,
  labels: floatingIp.labels
})

export const summarizeFirewall = (firewall: hcloud.Firewall) => ({
  name: firewall.name,
  rules: firewall.rules,
  labels: firewall.labels
})

export const summarizeDns = (firewall: hcloud.Firewall) => ({
  name: firewall.name,
  rules: firewall.rules,
  labels: firewall.labels
})

export async function currentIPAddress(): Promise<string> {
  return fetch('https://ifconfig.me/ip')
    .then(resp => resp.text())
}
