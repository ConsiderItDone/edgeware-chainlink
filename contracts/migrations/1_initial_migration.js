const Migrations = artifacts.require("Migrations");
const LinkToken  = artifacts.require("LinkToken");
const EIContract = artifacts.require("EIContract");

module.exports = function(deployer) {
  deployer.deploy(Migrations);
  deployer.deploy(LinkToken);
  deployer.deploy(EIContract);
};