#!/usr/local/bin/bash
#
# Usage: ./scripts/generate-inventory.sh | pbcopy

cd ../hetzner-pulumi
pulumi stack output --json | jq -r '
  # extract dc (nbg / va) positionally from hostname
  def dc:
    (.name | capture("-(?<dc>nbg|hel|ash|va)[0-9]*-").dc);

  def region:
    if dc == "nbg" then "eu" else "us" end;

  def pad($n):
    tostring as $s
    | ($n - ($s|length)) as $k
    | if $k > 0 then ($s + (" " * $k)) else $s end;

  .inventory.vms
  | map({
      region: region,
      role:   (.name | split("-")[0]),
      idx:    (.name | capture("-(?<n>[0-9]+)$").n),
      ip:     .publicIpv4,
      dc:     dc
    })
  | group_by(.region)
  | .[]
  | .[0].region as $r
  | "[\($r)]",
    (
      sort_by(.role, (.idx | tonumber))
      | .[]
      | (
          ("\(.role)-\(.dc)-\(.idx)" | pad(15)) +
          ("ansible_host=\(.ip)"     | pad(30)) +
          ("ansible_port=22"         | pad(18)) +
          "ansible_user=root"
        )
    ),
    ""
'

