const http = require('http');
const Web3 = require('web3');
const express = require('express')

const token = require('./build/contracts/LinkToken.json');
const oracle = require("./build/contracts/Oracle.json");
const client = require("./build/contracts/Client.json");

const netid = process.env.NETID || 2021;
const sport = process.env.PORT || '8080';
const host = process.env.GETH_HOST || '127.0.0.1';
const port = process.env.GETH_PORT || 9933;
const pkey = process.env.GETH_PKEY || '0x1111111111111111111111111111111111111111111111111111111111111111';
const web3 = new Web3(`http://${host}:${port}`);
const from = web3.eth.accounts.privateKeyToAccount(pkey);

const app = express();

app.get("/", function (req, res) {
  res.json(token.networks[netid].address);
});

app.get("/deploy/oracle", async function (req, res) {
  const node = req.query.node;
  const allowed = (req.query.allowed + '').toLowerCase() === 'true';
  if (!web3.utils.isAddress(node)) {
    res.status(500).send('Bad address format');
    return;
  }

  const nonce = await web3.eth.getTransactionCount(from.address, 'pending');
  console.log(`new Oracle(${token.networks[netid].address})`);
  const tx1 = await from.signTransaction({
    from: from.address,
    nonce: nonce,
    gas: 8000000,
    data: (new web3.eth.Contract(oracle.abi)).deploy({
      data: oracle.bytecode,
      arguments: [token.networks[netid].address],
    }).encodeABI(),
  });
  const { contractAddress } = await web3.eth.sendSignedTransaction(tx1.rawTransaction);
  console.log(`  address: ${contractAddress}`);

  console.log(`oracle.setFulfillmentPermission(${node}, ${allowed})`);
  const tx2 = await from.signTransaction({
    from: from.address,
    to: contractAddress,
    nonce: nonce + 1,
    gas: 8000000,
    data: (new web3.eth.Contract(oracle.abi, contractAddress)).methods.setFulfillmentPermission(node, allowed).encodeABI(),
  });
  const receipt = await web3.eth.sendSignedTransaction(tx2.rawTransaction);
  console.log(`  hash: ${receipt.transactionHash}`);

  res.json(contractAddress);
});

app.get("/deploy/client", async function (req, res) {
  const token = req.query.token;
  if (!web3.utils.isAddress(token)) {
    res.status(500).send('Bad token address format');
    return;
  }

  const oracle = req.query.oracle;
  if (!web3.utils.isAddress(oracle)) {
    res.status(500).send('Bad oracle address format');
    return;
  }

  const jobid = req.query.jobid;
  if (!web3.utils.isHexStrict(jobid)) {
    res.status(500).send('Bad jobid format');
    return;
  }

  const urlpart = req.query.urlpart || '';
  const path    = req.query.path || '';
  const times   = req.query.times || '0';

  const nonce = await web3.eth.getTransactionCount(from.address, 'pending');
  console.log(`new Client(${token}, ${oracle}, ${jobid}, ${urlpart}, ${path}, ${times})`);
  const tx = await from.signTransaction({
    from: from.address,
    nonce: nonce,
    gas: 8000000,
    data: (new web3.eth.Contract(client.abi)).deploy({
      data: client.bytecode,
      arguments: [token, oracle, jobid, urlpart, path, times],
    }).encodeABI(),
  });
  const { contractAddress } = await web3.eth.sendSignedTransaction(tx.rawTransaction);
  console.log(`  address: ${contractAddress}`);

  res.json(contractAddress);
});

app.listen(sport, () => console.log(`server is listening on ${sport}`));