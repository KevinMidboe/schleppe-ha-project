import * as pulumi from "@pulumi/pulumi";

const config = new pulumi.Config();

const variables = {
  osImage: config.get("image") || "debian-11",
  machineType: config.get("serverType") || "f1-micro",
  machineLocation:  config.get("location") || "hel1",
  instanceTag:  config.get("instanceTag") || "webserver",
  servicePort: config.get("servicePort") || "80" 
}

export {
  variables,
  config
}
