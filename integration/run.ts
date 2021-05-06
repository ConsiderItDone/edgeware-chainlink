import axios, {AxiosResponse} from 'axios';
import to from 'await-to-js';
const fs = require('fs');

(async () : Promise<any> => {
    const rawData = fs.readFileSync('./cypress.json');
    const config = JSON.parse(rawData)?.env;

    const HOST = process.env.HOST || config.HOST;
    const CHAINLINK_HOST = process.env.CHAINLINK_URL || config.CHAINLINK_URL;

    const login = await axios.post(`${CHAINLINK_HOST}/sessions`, {
        email: process.env.CHAINLINK_EMAIL || config.CHAINLINK_EMAIL,
        password: process.env.CHAINLINK_PASSWORD || config.CHAINLINK_PASSWORD,
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

    const token = (responseToken as AxiosResponse).data;
    console.log('Token:', token);

    const [errOracle, responseOracle] = await to(axios.get(`${HOST}/deploy/oracle?node=${node}`));
    if (errOracle) {
        throw new Error(errOracle?.message);
    }

    const oracle = (responseOracle as AxiosResponse).data;
    console.log('Oracle:', oracle);

    const rawJobPayload = fs.readFileSync('./cypress/fixtures/job.json');
    const jobPayload = JSON.parse(rawJobPayload);

    // patch oracle address
    jobPayload.initiators[0].params.address = oracle;

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

    const [errClient, responseClient] = await to(axios.get(`${HOST}/deploy/client?oracle=${oracle}&token=${token}&jobid=${jobId}`));
    if (errClient) {
        throw new Error(errClient?.message);
    }

    const client = (responseClient as AxiosResponse).data;
    console.log('Client:', client);

    // TODO: run job
})();
