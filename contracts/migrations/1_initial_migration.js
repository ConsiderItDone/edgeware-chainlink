const Migrations   = artifacts.require("Migrations");
const LinkToken    = artifacts.require("LinkToken");
const EventFactory = artifacts.require("EventFactory");

module.exports = function(deployer) {
  deployer.deploy(Migrations);
  deployer.deploy(LinkToken);
  deployer.deploy(EventFactory);
};