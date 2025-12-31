# schleppe High Availability project

Defines code which describes a HA & cached scalable way of serving web applications.

## Architecture

```
+-----------------------------------------------------------+
|                        REGION: EU                         |
|                                                           |
|        +-------------- Floating IP ---------+             |
|        |                                    |             |
|   +----+---------+                     +----+---------+   |
|   |  HAProxy #1  |                     |  HAProxy #2  |   |
|   +----+---------+                     +----+---------+   |
|        \__________ active / standby _______/              |
|                         |                                 |
|                         v                                 |
|                  +------+--------+                        |
|                  |  haproxy (a)  |                        |
|                  +----+----+--+--+                        |
|                       |    |  A                           |
|                direct |    |  |   via cache               |
|                       |    v  |                           |
|                       |  +-+--+---------+                 |
|                       |  |  varnish (n) |                 |
|                       |  +------+-------+                 |
|                       |         | HIT / MISS              |
|                       |         |                         |
|                       +---------+                         |
|                                 |                         |
|                                 v                         |
|                       +---------+-------+                 |
|                       |  web server (n) |                 |
|                       +-----------------+                 |
|                                                           |
+-----------------------------------------------------------+
```

Where varnish & web server is 2-n number of instances. Currently two regions, EU & US.

## infrastructure

Configured cloud resources in hezner with Pulumi.

```bash
# first time, init pulumi stack (name optional)
pulumi stack init kevinmidboe/hetzner

# required configuration values
pulumi config set sshPublicKey "$(cat ~/.ssh/id_ed25519.pub)"
pulumi config set --secret hcloud:token $HETZNER_API_KEY

# up infrastructure
pulumi up

# (optional w/ adding private IP)
# private ips struggle, need to run again to assign correctly
pulumi up
```

## provision

Ansible is used to provision software and environments for software needed and services.

get ansible configuration values from pulumi output:

```bash
# generate inventory (manualy update inventory file)
./scripts/generate-inventory.sh | pbcopy

# following updates config files in place
./scripts/update-config_certbot-domains.sh
./scripts/update-config_webserver-ips.sh
```

run playbooks:

```bash
# install, configure & start haproxy
ansible-playbook plays/haproxy.yml -i hetzner.ini -l haproxy

# install, configure & start varnish
ansible-playbook plays/varnish.yml -i hetzner.ini -l varnish

# install web resources & dependencies, pull & starts docker containers
ansible-playbook plays/docker.yml -i hetzner.ini -l web
ansible-playbook plays/web.yml -i hetzner.ini -l web
```

# Manual steps

- [x] floating ip DNS registration
- [x] extract variables from pulumi stack outputs
- [ ] add all cloudflare api keys
  - `mkdir /root/.ssh/certbot/cloudflare_k9e-no.ini`
- [ ] generate certs for appropriate domains
  - `certbot certonly --agree-tos --dns-cloudflare --dns-cloudflare-credentials /root/.secrets/certbot/cloudflare_k9e-no.ini -d k9e.no`
- [ ] combine generated certs into a cert for traefik
  - `cat /etc/letsencrypt/live/k9e.no/fullchain.pem /etc/letsencrypt/live/k9e.no/privkey.pem > /etc/haproxy/certs/ssl-k9e.no.pem`

