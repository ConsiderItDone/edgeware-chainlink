import axios, {AxiosResponse} from 'axios';
import to from 'await-to-js';

const HOST = 'http://127.0.0.1:8080';
const NODE = '0x0EC5dA4Da96C66c33D55E3bD056c2deA03929B64';

(async () : Promise<any> => {
    const [errToken, responseToken] = await to(axios.get(`${HOST}`));
    if (errToken) {
        throw new Error('edgeware-chainlink-contract not allowed');
    }

    const token = (responseToken as AxiosResponse).data;
    console.log('Token:', token);

    const [errOracle, responseOracle] = await to(axios.get(`${HOST}/deploy/oracle?node=${NODE}`));
    if (errOracle) {
        throw new Error(errOracle.message);
    }

    const oracle = (responseOracle as AxiosResponse).data;
    console.log('Oracle:', oracle);

    // TODO: Create job with new oracle address
    // docker exec -it forks_chainlink chainlink job_specs create "$ETH_LOG_JOB"
    const JOB_ID = '7c53e7173ccc4cbd84ce08704e122c99';
    const jobid = Buffer.from(JOB_ID, 'utf8').toString('hex');
    console.log('Job id:', jobid);

    const [errClient, responseClient] = await to(axios.get(`${HOST}/deploy/client?oracle=${oracle}&token=${token}&jobid=0x${jobid}`));
    if (errClient) {
        throw new Error(errClient.message);
    }

    const client = (responseClient as AxiosResponse).data;
    console.log('Client:', client);
})();


// http://localhost:8080/deploy/client
// ?oracle=0x98CF278a29EB4788E17725E9dd14150408817c42
// &token=0x3f7AC08DC07E0aa6cE45420dd980a4862286D07b
// &jobid=0x3763353365373137336363633463626438346365303837303465313232633939
