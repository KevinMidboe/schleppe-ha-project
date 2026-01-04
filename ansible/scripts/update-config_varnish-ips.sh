#!/usr/local/bin/bash
#
# Usage: ./scripts/update-config_varnishserver-ips.sh

IP_EXPORT_KEY=haproxy_varnish_ip
ANSIBLE_DIR="$(pwd)"
PULIMI_DIR="$(pwd)/../hetzner-pulumi"

EXPORT_VARIABLES="$(pwd)/group_vars/haproxy.yml"
yq -i 'del(.haproxy_varnish_ip)' $EXPORT_VARIABLES

cd $PULIMI_DIR
pulumi stack output --json | jq -r --arg key $IP_EXPORT_KEY '
  def varnish_private_ips:
    .inventory.vms
    | map(select(.name | startswith("varnish")) | .privateIp);

  ($key + ":\n") +
  (varnish_private_ips | map("  - " + .) | join("\n"))
' >> $EXPORT_VARIABLES
