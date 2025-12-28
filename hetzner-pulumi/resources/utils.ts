import * as pulumi from "@pulumi/pulumi";
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

