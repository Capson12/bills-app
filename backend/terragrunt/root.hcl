locals {
    prefix = "bills-app"
    name = "billapp"
    location = "uksouth"
    # dns_domain = "prokixsports.com"

    backend_resource_group_name = "SMTX-CRITICAL"
    backend_storage_account_name = "smtxtfstatestorage"
    backend_container_name = "billsapp-container"


}


remote_state {
    backend = "azurerm"
    config = {
        resource_group_name = local.backend_resource_group_name
        storage_account_name = local.backend_storage_account_name
        container_name = local.backend_container_name
        key = "${local.prefix}/main"

        use_oidc = true
        tenant_id = get_env("AZURE_TENANT_ID", "")
        client_id = get_env("AZURE_CLIENT_ID", "")
        subscription_id = get_env("AZURE_SUBSCRIPTION_ID", "")

    }
}



generate "provider" {
  path      = "provider.tf"
  if_exists = "overwrite"
  contents  = <<EOF
terraform {
  required_providers {
    azurerm = {
      source  = "hashicorp/azurerm"
      version = "~> 3.0"
    }
  }
}
provider "azurerm" {
  features {}
}

terraform {
backend "azurerm"{}

}

EOF
}