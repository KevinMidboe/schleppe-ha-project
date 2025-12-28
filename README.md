# schleppe High Availability project

Defines code which describes a HA & cached scalable way of serving web applications.

## infrastructure

Configured cloud resources in hezner with Pulumi.

Hetzner has two regions:
- us
- eu

Each region has:
- haproxy x2
- varnish x2
- webservers

## provision

Ansible is used to provision software and environments for different software needed.

