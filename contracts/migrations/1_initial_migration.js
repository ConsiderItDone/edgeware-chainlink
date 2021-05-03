const Migrations = artifacts.require("Migrations");
const LinkToken  = artifacts.require("LinkToken");

module.exports = function(deployer) {
  deployer.deploy(Migrations);
  deployer.deploy(LinkToken);
};