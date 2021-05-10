import axios, {AxiosResponse} from 'axios';
import to from 'await-to-js';
import Web3 from 'web3';
const fs = require('fs');
const token = require('../contracts/build/contracts/LinkToken.json');
const oracle = require('../contracts/build/contracts/Oracle.json');
const client = require('../contracts/build/contracts/Client.json');


(async () : Promise<any> => {
    const HOST = process.env.HOST || 'http://127.0.0.1:8080';
    const CHAINLINK_HOST = process.env.CHAINLINK_URL || 'http://52.91.75.170:6688';
    const ETH_URL = process.env.ETH_URL || 'ws://52.91.75.170:9944';
    const PRICE_PROVIDER_URL = process.env.PRICE_PROVIDER_URL || 'http://192.168.1.9:3000/price';
    const pkey = process.env.GETH_PKEY || '0x1111111111111111111111111111111111111111111111111111111111111111';
    const web3 = new Web3(ETH_URL);
    const from = web3.eth.accounts.privateKeyToAccount(pkey);

    const login = await axios.post(`${CHAINLINK_HOST}/sessions`, {
        email: process.env.CHAINLINK_EMAIL || 'test@test.com',
        password: process.env.CHAINLINK_PASSWORD || 'gfhjkmGFHJKM123',
    }, {
        headers:  {
            "accept": "application/json",
            "content-type": "application/json",
        },
        withCredentials: true,
    });
    const cookies = login.headers['set-cookie'];

    const keys = await axios.get(`${CHAINLINK_HOST}/v2/keys/eth`, {
        headers: {
            cookie: cookies.join(';'),
        }
    })
    const node = keys?.data?.data[0].id;
    if (!node) {
        throw new Error('Can not receive keys');
    }
    console.log('Node:', node);

    const [errToken, responseToken] = await to(axios.get(`${HOST}`));
    if (errToken) {
        throw new Error('edgeware-chainlink-contract not allowed');
    }

    const tokenAddress = (responseToken as AxiosResponse).data;
    const tokenContract = (new web3.eth.Contract(token.abi, tokenAddress));

    console.log('Token:', tokenAddress, typeof tokenContract);

    const [errOracle, responseOracle] = await to(axios.get(`${HOST}/deploy/oracle?node=${node}`));
    if (errOracle) {
        throw new Error(errOracle?.message);
    }

    const oracleAddress = (responseOracle as AxiosResponse).data;
    const oracleContract = (new web3.eth.Contract(oracle.abi, oracleAddress));
    console.log('Oracle:', oracleAddress, typeof oracleContract);

    // TODO: move to http server
    let nonce = await web3.eth.getTransactionCount(from.address, 'pending');
    const tx1 = await from.signTransaction({
        to: tokenAddress,
        nonce,
        gas: 8000000,
        data: tokenContract.methods.transfer(oracleAddress, web3.utils.toWei('1', 'ether')).encodeABI(),
    });
    console.log('tx1', tx1);
    const receipt = await web3.eth.sendSignedTransaction(tx1.rawTransaction as string);

    console.log('receipt', receipt);

    const balance1 = await tokenContract.methods.balanceOf(oracleAddress).call();
    console.log('balance', balance1);

    const rawJobPayload = fs.readFileSync('./cypress/fixtures/job.json');
    const jobPayload = JSON.parse(rawJobPayload);

    // patch oracle address
    jobPayload.initiators[0].params.address = oracleAddress;

    const newJob = await axios.post(`${CHAINLINK_HOST}/v2/specs`,
        jobPayload,
        {
            headers: {
                cookie: cookies.join(';'),
            }
        });

    const rawJobId = newJob?.data?.data?.id;

    if (!rawJobId) {
        throw new Error('Something wrong with new job');
    }

    const jobId = '0x' + Buffer.from(rawJobId, 'utf8').toString('hex');
    console.log('Job id:', rawJobId, ' -> ', jobId);

    const [errClient, responseClient] = await to(axios.get(`${HOST}/deploy/client?oracle=${oracleAddress}&token=${tokenAddress}&jobid=${jobId}&urlpart=${PRICE_PROVIDER_URL}&path=value&times=100`));
    if (errClient) {
        throw new Error(errClient?.message);
    }

    const clientAddress = (responseClient as AxiosResponse).data;
    console.log('Client address:', clientAddress);

    nonce = await web3.eth.getTransactionCount(from.address, 'pending');
    const tx2 = await from.signTransaction({
        to: tokenAddress,
        nonce,
        gas: 8000000,
        data: tokenContract.methods.transfer(clientAddress, web3.utils.toWei('1', 'ether')).encodeABI(),
    });
    const receipt2 = await web3.eth.sendSignedTransaction(tx2.rawTransaction as string);
    console.log(`receipt2: ${receipt2}`);

    console.log('balance client: token:',
        await tokenContract.methods.balanceOf(clientAddress).call(),
    );

    const clientContract = (new web3.eth.Contract(client.abi, clientAddress));

    const tx3 = await from.signTransaction({
        to: clientAddress,
        nonce: nonce + 1,
        gas: 8000000,
        data: clientContract.methods.createRequest(web3.utils.asciiToHex('ETH')).encodeABI(),
    });
        console.log('tx3', tx3);
    const receipt3 = await web3.eth.sendSignedTransaction(tx3.rawTransaction as string);
        console.log('receipt3', JSON.stringify(receipt3, null, 2));

    setInterval(async () => {
        console.log(await clientContract.methods.results(receipt3.logs[receipt3.logs.length - 1].topics[3]).call());
    }, 5000)

    // todo: check price
    // todo: update price and re-check
})();
