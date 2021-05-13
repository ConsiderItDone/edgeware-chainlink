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

  console.log(`oracle.setFulfillmentPermission(${node}, ${true})`);
  const tx2 = await from.signTransaction({
    from: from.address,
    to: contractAddress,
    nonce: nonce + 1,
    gas: 8000000,
    data: (new web3.eth.Contract(oracle.abi, contractAddress)).methods.setFulfillmentPermission(node, true).encodeABI(),
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

app.get("/send/token", async function (req, res) {
  const address = req.query.address;
  const value = req.query.value || '1';

  if (!web3.utils.isAddress(address)) {
    res.status(500).send('Bad address format');
    return;
  }

  const tokenAddress = token.networks[netid].address;
  const tokenContract = new web3.eth.Contract(token.abi, tokenAddress);

  const nonce = await web3.eth.getTransactionCount(from.address, 'pending');
  const tx = await from.signTransaction({
    to: tokenAddress,
    nonce,
    gas: 8000000,
    data: tokenContract.methods.transfer(address, web3.utils.toWei(value, 'ether')).encodeABI(),
  });

  const receipt = await web3.eth.sendSignedTransaction(tx.rawTransaction);

  res.json(receipt);
});

app.get("/send/eth", async function (req, res) {
  const address = req.query.address;

  if (!web3.utils.isAddress(address)) {
    res.status(500).send('Bad address format');
    return;
  }

  const nonce = await web3.eth.getTransactionCount(from.address, 'pending');
  const tx = await from.signTransaction({
    to: address,
    nonce: nonce,
    gas: 8000000,
    value: web3.utils.toWei('1', 'ether'),
  });

  const receipt = await web3.eth.sendSignedTransaction(tx.rawTransaction);

  res.json(receipt);
});

app.get("/price", async function (req, res) {
  const clientAddress = req.query.client;
  const ticker = req.query.ticker;

  if (!web3.utils.isAddress(clientAddress)) {
    res.status(500).send('Bad client address format');
    return;
  }

  if (!ticker) {
    res.status(500).send('Bad ticker format');
    return;
  }

  const clientContract = (new web3.eth.Contract(client.abi, clientAddress));

  const nonce = await web3.eth.getTransactionCount(from.address, 'pending');
  const tx = await from.signTransaction({
    to: clientAddress,
    nonce,
    gas: 8000000,
    data: clientContract.methods.createRequest(ticker).encodeABI(),
  });

  try {
    const receipt = await web3.eth.sendSignedTransaction(tx.rawTransaction);
    res.json(receipt);
    return;
  } catch (err) {
    res.status(500).send(err.message);
    return;
  }

  res.status(500).send('Ooops');
});

app.get("/result", async function (req, res) {
  const requestId = req.query.requestId;
  const clientAddress = req.query.client;

  if (!web3.utils.isAddress(clientAddress)) {
    res.status(500).send('Bad client address format');
    return;
  }

  if (!requestId) {
    res.status(500).send('Bad requestId format');
    return;
  }

  const clientContract =new web3.eth.Contract(client.abi, clientAddress);

  const result = await clientContract.methods.results(requestId).call();
  res.json(result);
});

app.listen(sport, () => console.log(`server is listening on ${sport}`));
