#!/usr/local/bin/bash
#
# Usage: ./scripts/update-config_certbot-domains.sh | pbcopy

CERTBOT_EXPORT_KEY=certbot_cloudflare_domains

EXPORT_VARIABLES="$(pwd)/group_vars/haproxy.yml"
yq -i 'del(.certbot_cloudflare_domains)' $EXPORT_VARIABLES

cd ../hetzner-pulumi
pulumi stack output --json | jq -r --arg key $CERTBOT_EXPORT_KEY '
  ($key + ":\n") +
  (.inventory.domains | map("  - " + .) | join("\n"))
' >> $EXPORT_VARIABLES
