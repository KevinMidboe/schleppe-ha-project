# schleppe High Availability project

Goal is to have better webapp uptime for than AWS.

Defines code which describes a HA & cached scalable way of serving web applications.

## Architecture

```
+-----------------------------------------------------------+
|                   Domain: schleppe.cloud                  |
|                                                           |
|                +-----DNS (Cloudflare)-----+               |
|                |   round-robin A records  |               |
|                +--------------------------+               |
|                              │                            |
|            ┌─────────────────┴─────────────────┐          |
|            │                                   │          |
|     A: 193.72.45.133                   B: 45.23.78.120    |
|        (SITE A)                          (SITE B..N)      |
+------------+-----------------------------------+----------+
             │                                   └────────────────┐
             v                                                    v
+----------------------------------------------------+  +--------------------+  
|                  Site A (REGION: EU)               |  |     Site B..N      |  
|                                                    |  |  (Copy of site A)  |
|  +----------- Floating IP (keepalived/etcd) ---+   |  +--------------------+
|  |                                             |   | 
|  |   +-------------+        +-------------+    |   |
|  |   |  HAProxy-1  |        |  HAProxy-2  |    |   |
|  |   |  (ACTIVE)   |        |  (STANDBY)  |    |   |
|  |   +------+------+        +-------+-----+    |   |
|  |          └─── active / standby ──┘          |   |
|  |                                             |   | 
|  +----------------------+----------------------+   |
|                         │                          |
|        (SSL termination + readiness checks)        |
|                         │                          |
|                         v                          |
|                 +-------+---------+                |
|                 |   haproxy (LB)  |                |
|                 +-----+----+--+---+                |
|                       │    │  A                    |
|                direct │    │  │   via cache        |
|                       │    v  │                    |
|                       │  +-+--+---------+          |
|                       │  |  varnish (n) |          |
|                       │  +------+-------+          |
|                       │         │ HIT / MISS       |
|                       │         │                  |
|                       └─────────┤                  |
|                                 │                  |
|                                 v                  |
|                       +---------+--------+         |
|                       |  web servers (n) |         |
|                       +------------------+         |
|                                                    |
+----------------------------------------------------+
```

Where varnish & web server are minimum of 2 instances. Currently three regions, EU, US & schleppe on-prem.  
There is always only a single haproxy (with fallback) routing traffic per site, but multiple varnish & webservers all connected together w/ shared routing tables.

## Configure environment

Ensure that the following environment variables exist. It is smart to disable history in your terminal before pasting any API keys, (`unset HISTFILE` for bash, or `fish --private` for fish).

- `CLOUDFLARE_API_TOKEN`: update DNS for given zones
- `HCLOUD_TOKEN`: permissions to create cloud resources

## infrastructure

Configured cloud resources in hezner with Pulumi.

```bash
cd hetzner-pulumi

# first time, init pulumi stack (name optional)
pulumi stack init kevinmidboe/hetzner

# required configuration values
pulumi config set sshPublicKey "$(cat ~/.ssh/id_ed25519.pub)"

# up infrastructure
pulumi up

# (optional w/ adding private IP)
# private ips struggle, need to run again to assign correctly
pulumi up
```

## provision

Ansible is used to provision software and environments for software needed and services.

Get ansible configuration values from pulumi output:

```bash
cd ansible

# generate inventory (manualy update inventory file)
./scripts/generate-inventory.sh | pbcopy

# following updates config files in place
./scripts/update-config_certbot-domains.sh
./scripts/update-config_webserver-ips.sh
```

Run playbooks:

```bash
# install, configure & start haproxy
ansible-playbook plays/haproxy.yml -i hetzner.ini -l haproxy

# install, configure & start varnish
ansible-playbook plays/varnish.yml -i hetzner.ini -l varnish

# install web resources & dependencies, pull & starts docker containers
ansible-playbook plays/docker.yml -i hetzner.ini -l web
ansible-playbook plays/web.yml -i hetzner.ini -l web
```

### ansible play: haproxy

roles:
- haproxy
- certbot

The vars `haproxy_varnish_ip` & `haproxy_traefik_ip` defines IPs iterated over when copying template to hosts. These respectively point to available varnish cache servers & webservers. 
> `certbot_cloudflare_domains` runs certbot to make sure valid certs exists for instances serving traffic attached to DNS.

### ansible play: varnish

roles:
- varnish

installs and configures varnish. Iterates over all `haproxy_traefik_ip` when copying varnish.vcl template. Make sure to update these IP's with the current webservers we want to point varnish to. These should match the same webservers haproxy might directly point at if not proxying through varnish.

### ansible play: docker + web


## manual steps / TODO

Still issuing certs manually:

```bash
cd /root/.secrets/certbot

touch cloudflare_k9e-no.ini; touch cloudflare_planetposen-no.ini; touch cloudflare_schleppe-cloud.ini

certbot certonly --dns-cloudflare --dns-cloudflare-credentials /root/.secrets/certbot/cloudflare_schleppe-cloud.ini -d whoami.schleppe.cloud  --agree-tos && \
certbot certonly --dns-cloudflare --dns-cloudflare-credentials /root/.secrets/certbot/cloudflare_k9e-no.ini -d k9e.no  --agree-tos && \
certbot certonly --dns-cloudflare --dns-cloudflare-credentials /root/.secrets/certbot/cloudflare_planetposen-no.ini -d planetposen.no  --agree-tos

cat /etc/letsencrypt/live/k9e.no/fullchain.pem /etc/letsencrypt/live/k9e.no/privkey.pem > /etc/haproxy/certs/ssl-k9e.no.pem && \
cat /etc/letsencrypt/live/planetposen.no/fullchain.pem /etc/letsencrypt/live/planetposen.no/privkey.pem > /etc/haproxy/certs/ssl-planetposen.no.pem && \
cat /etc/letsencrypt/live/whoami.schleppe.cloud/fullchain.pem /etc/letsencrypt/live/whoami.schleppe.cloud/privkey.pem > /etc/haproxy/certs/ssl-whoami.schleppe.cloud.pem

systemctl restart haproxy.service
```

Need to have a shared storage between all the instances, e.g. `etcd`.
