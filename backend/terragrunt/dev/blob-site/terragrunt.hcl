include "root" {
    path = find_in_parent_folders("root.hcl")
    expose = true
}

locals {
    parent = read_terragrunt_config(find_in_parent_folders("root.hcl")).locals
    environment = basename(dirname(get_terragrunt_dir())) 
    folder_name = basename(get_terragrunt_dir())
}

dependency "rg" {
    config_path = "../resource_group"

    mock_outputs_allowed_terraform_commands = ["validate", "plan", "init"]
    mock_outputs = {
        name = "mock-resource-group"
    }
}



remote_state {
    backend = include.root.remote_state.backend
    config  = merge(
        include.root.remote_state.config,
        {key = "${local.parent.prefix}/${local.environment}/${local.folder_name}/terraform.state"}
    ) 
}




terraform {
    source = "git::https://git@github.com/Capson12/blob-website.git//module/blob-website"
}

inputs = {
    name = "${local.parent.name}web${local.environment}website"
    resource_group_name = dependency.rg.outputs.name
    location = local.parent.location

    error_document_404 = "index.html"

}