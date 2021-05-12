import axios, {AxiosResponse} from 'axios';
import to from 'await-to-js';
const fs = require('fs');

function sleep(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

const TICKER = 'ETH';

(async () : Promise<any> => {
    const HOST = process.env.HOST || 'http://127.0.0.1:8080';
    const CHAINLINK_HOST = process.env.CHAINLINK_URL || 'http://52.91.75.170:6688';
    const PRICE_PROVIDER_URL = process.env.PRICE_PROVIDER_URL || 'http://192.168.1.9:3000/price';

    const login = await axios.post(`${CHAINLINK_HOST}/sessions`, {
        email: process.env.CHAINLINK_EMAIL,
        password: process.env.CHAINLINK_PASSWORD,
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

    const [errSendEthToNode] = await to(axios.get(`${HOST}/send/eth?address=${node}`));
    if (errSendEthToNode) {
        throw new Error('Can not top up node');
    }

    const [errToken, responseToken] = await to(axios.get(`${HOST}`));
    if (errToken) {
        throw new Error('edgeware-chainlink-contract not allowed');
    }

    const tokenAddress = (responseToken as AxiosResponse).data;
    console.log('Token:', tokenAddress);

    const [errOracle, responseOracle] = await to(axios.get(`${HOST}/deploy/oracle?node=${node}`));
    if (errOracle) {
        throw new Error(errOracle?.message);
    }

    const oracleAddress = (responseOracle as AxiosResponse).data;
    console.log('Oracle:', oracleAddress);

    const rawJobPayload = fs.readFileSync('./cypress/fixtures/job.json');
    const jobPayload = JSON.parse(rawJobPayload);

    // patch oracle address and price provider
    jobPayload.initiators[0].params.address = oracleAddress;
    jobPayload.tasks[0].params.get = PRICE_PROVIDER_URL;

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

    const [errSendTokenToClient] = await to(axios.get(`${HOST}/send/token?address=${clientAddress}`));
    if (errSendTokenToClient) {
        throw new Error('Can not top up client contract');
    }

    if (true) { // test 1

        const newPrice = 42;
        const [err1] = await to(axios.post(`${PRICE_PROVIDER_URL}${TICKER}`, {
            value: newPrice,
        }));
        if (err1) {
            console.log('Can not update price')
        }

        const [errPrice, responsePrice] = await to(axios.get(`${HOST}/price?client=${clientAddress}&ticker=${TICKER}`));
        if (errPrice) {
            throw errPrice;
        }

        const logs = (responsePrice as any).data.logs;
        const requestId = logs[logs.length - 1].topics[3];

        await sleep(10000); // TODO: use setInterval
        const [err, price] = await to(axios.get(`${HOST}/result?client=${clientAddress}&requestId=${requestId}`));
        if (err) {
            throw err;
        }

        console.log('Expected price:', newPrice * 100);
        console.log('Received price:', price?.data);
    }

    // todo: check price
    // todo: update price and re-check
})();
