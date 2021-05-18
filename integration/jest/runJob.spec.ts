import axios, {AxiosResponse} from 'axios';
import { expect } from '@jest/globals';
import to from 'await-to-js';
const fs = require('fs');

const TICKER = process.env.TICKER || 'ETH';
const CONTRACT_HOST = process.env.CONTRACT_HOST || 'http://127.0.0.1:8080';
const CHAINLINK_HOST = process.env.CHAINLINK_URL || 'http://52.91.75.170:6688';
const PRICE_PROVIDER_URL = process.env.PRICE_PROVIDER_URL || 'http://127.0.0.1/price';

const EINITIATOR_URL = process.env.EINITIATOR_URL || 'http://127.0.0.1:8081';
const ETH_URL = process.env.ETH_URL || 'ws://52.91.75.170:9944';
const EI_HOST = process.env.EI_HOST || '172.100.1.101';
const EI_PORT = process.env.EI_HOST || '8082';

const mem = {
    clientAddress: '',
    tokenAddress: '',
    oracleAddress: '',
    cookie: '',
    node: '',
    jobId: '',
};

async function setPrice(newPrice: number) {
    const [err] = await to(axios.post(`${PRICE_PROVIDER_URL}${TICKER}`, {
        value: newPrice / 100,
    }));
    if (err) {
        throw new Error('Can not update price');
    }
}

async function getPrice(clientAddress: string): Promise<number> {
    const [errPrice, responsePrice] = await to(axios.get(`${CONTRACT_HOST}/price?client=${clientAddress}&ticker=${TICKER}`));
    if (errPrice) {
        throw new Error('Can not call createRequest');
    }

    const logs = (responsePrice as any).data.logs;
    const requestId = logs[logs.length - 1].topics[3];

    let counter = 1;
    const price = await new Promise((resolve, reject) => {
        const intervalId = setInterval(async () => {
            counter++;

            if (counter > 15) {
                reject(new Error('No results'));
                return;
            }

            const [err, price] = await to(axios.get(`${CONTRACT_HOST}/result?client=${clientAddress}&requestId=${requestId}`));
            if (err) {
                reject(err);
                return;
            }

            if (Number(price?.data)) {
                clearInterval(intervalId);
                resolve(price?.data);
            }
        }, 2000);
    });

    return Number(price);
}

async function login(email: string, password: string): Promise<string> {
    const login = await axios.post(`${CHAINLINK_HOST}/sessions`, {
        email,
        password,
    }, {
        headers:  {
            "accept": "application/json",
            "content-type": "application/json",
        },
        withCredentials: true,
    });
    const cookies = login.headers['set-cookie'];

    return cookies.join(';');
}

describe('Preparation', () => {
    it('login', async () => {
        const email = process.env.CHAINLINK_EMAIL as string;
        const password = process.env.CHAINLINK_PASSWORD as string;

        const cookie = await login(email, password);
        if (!cookie) {
            fail('expected cookie not received');
        }

        mem.cookie = cookie;
    });

    it('get node address', async () => {
        const keys = await axios.get(`${CHAINLINK_HOST}/v2/keys/eth`, {
            headers: {
                cookie: mem.cookie,
            }
        })
        const node = keys?.data?.data[0].id;
        if (!node) {
            fail('node address is not received');
        }

        mem.node = node;
    });

    it('top up node', async () => {
        await axios.get(`${CONTRACT_HOST}/send/eth?address=${mem.node}`)
    });

    it('get token address', async () => {
        const response = await axios.get(`${CONTRACT_HOST}`);
        const tokenAddress = (response as AxiosResponse)?.data;

        if (!tokenAddress) {
            fail('token address is not received');
        }

        mem.tokenAddress = tokenAddress;
    });

    it('deploy oracle contract', async () => {
        const responseOracle= await axios.get(`${CONTRACT_HOST}/deploy/oracle?node=${mem.node}`);
        const oracleAddress = (responseOracle as AxiosResponse)?.data;

        if (!oracleAddress) {
            fail('oracle contract is not deployed');
        }

        mem.oracleAddress = oracleAddress;
    });

    it('create job', async () => {
        const rawJobPayload = fs.readFileSync('./job.json');
        const jobPayload = JSON.parse(rawJobPayload);

        // patch oracle address and price provider
        jobPayload.initiators[0].params.address = mem.oracleAddress;

        const newJob = await axios.post(`${CHAINLINK_HOST}/v2/specs`,
            jobPayload,
            {
                headers: {
                    cookie: mem.cookie,
                }
            });

        const rawJobId = newJob?.data?.data?.id;

        if (!rawJobId) {
            fail('job is not deployed');
        }

        const jobId = '0x' + Buffer.from(rawJobId, 'utf8').toString('hex');

        mem.jobId = jobId;
    });

    it('deploy client contract', async () => {
        const responseClient = await axios.get(`${CONTRACT_HOST}/deploy/client?oracle=${
            mem.oracleAddress
        }&token=${
            mem.tokenAddress
        }&jobid=${mem.jobId}&urlpart=${PRICE_PROVIDER_URL}&path=value&times=100`);

        const clientAddress = (responseClient as AxiosResponse)?.data;
        if (!clientAddress) {
            fail('client contract is not deployed');
        }

        mem.clientAddress = clientAddress;
    });

    it('top up client contract', async () => {
        const linkTokenAmount = 2; // IMPORTANT FOR TESTS
        await axios.get(`${CONTRACT_HOST}/send/token?address=${mem.clientAddress}&value=${linkTokenAmount}`)
    });

    it('create external initiator', async () => {
        const payload  = {name: "ei"+ Math.random().toString(36).substring(7),url:`http://${EI_HOST}:${EI_PORT}/jobs`}
        const eiparams = await axios.post(`${CHAINLINK_HOST}/v2/external_initiators`, payload, {
            headers: {
                cookie: mem.cookie,
            }
        });
        const data = eiparams?.data?.data?.attributes
        data["ethereum"] = ETH_URL;
        const result = await axios.post(EINITIATOR_URL, data);
        expect(result?.data).toBe('ok');
    });
});

describe('Get price', () => {
    it('first time (price: 42)', async () => {
        const newPrice = 42;
        await setPrice(newPrice);
        const price = await getPrice(mem.clientAddress);

        expect(price).toBe(newPrice);
    });

    it('second time (price: 500)', async () => {
        const newPrice = 500;
        await setPrice(newPrice);
        const price = await getPrice(mem.clientAddress);

        expect(price).toBe(newPrice);
    });

    it("expected fail (no tokens)", async () => {
        try {
            await getPrice(mem.clientAddress);

            fail('expected exception not thrown');
        } catch (e) {
            expect(e.message).toBe('Can not call createRequest');
        }
    });
})
