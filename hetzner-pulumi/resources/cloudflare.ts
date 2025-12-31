import * as hcloud from "@pulumi/hcloud";
import * as cloudflare from "@pulumi/cloudflare";

async function getZone(domain: string): Promise<cloudflare.Zone | null> {
  let match;
  const zones = await cloudflare.getZones();

  zones.results.forEach((zone) => {
    if (domain.includes(zone.name)) match = zone;
  });

  if (match) return match;
  return null;
}

export async function dns(
  domain: string,
  ipAddress: hcloud.FloatingIp,
  suffix: string,
) {
  const ip = ipAddress.ipAddress.apply((ip) => ip);
  const name = `${domain}-${suffix}_dns_record`;
  const comment = "managed by pulumi - schleppe-ha-project";

  const zone = await getZone(domain);
  if (!zone)
    throw new Error(
      "no matching zone found! check cloudflare token scopes & registration",
    );

  return new cloudflare.DnsRecord(
    name,
    {
      zoneId: zone.id,
      name: domain,
      ttl: 1,
      type: "A",
      content: ip,
      proxied: false,
      comment,
    },
    { dependsOn: [ipAddress] },
  );
}
