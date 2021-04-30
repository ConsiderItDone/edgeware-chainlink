# Interacting with a local Chainlink node on Edgeware Blockchain


## Install MetaMask and connect it to Edgeware testnet
1. Install a [MetaMask](https://metamask.io/download.html) and setup the extension
2. [Add a custom MetaMask network](https://metamask.zendesk.com/hc/en-us/articles/360043227612-How-to-add-custom-Network-RPC-and-or-Block-Explorer) with the following params:
   * Network Name: `Edgeware Testnet`
   * RPC URL: `http://52.91.75.170:9933`
   * Chain ID: `2021`
   * Currency Symbol: `tEDG`

## Deploy a Chainlink token to Edgeware testnet
1. Open [LINK token Gist in Remix](https://remix.ethereum.org/#version=soljson-v0.6.12+commit.27d51765.js&optimize=false&evmVersion=null&gist=712e86650cca585dd09b99bdadf54ede)
2. Deploy `LinkToken.sol` to the Edgeware network using Solidity version `0.6.12` and your MetaMask. For detailed instructions please see [How to use MetaMask to Deploy a Smart contract in Solidity (Blockchain)?](https://www.geeksforgeeks.org/how-to-use-metamask-to-deploy-a-smart-contract-in-solidity-blockchain/)
![Deploy a contract with Remix](screenshots/deploy-with-remix.png)
3. Copy the address of a newly deployed LINK token (see a screenshoot below) and store it somewhere (you'll need it later)
![Copy a contract address](screenshots/copy-contract-address.png)


## Run postgresql database 

```
docker-compose up -d db
```

## Run a local Chainlink node using docker

1. Create a `.env` file with the following content:

```
LOG_LEVEL=debug
ETH_CHAIN_ID=2021
MIN_OUTGOING_CONFIRMATIONS=2
LINK_CONTRACT_ADDRESS=<<<address that you've copied before>>>
CHAINLINK_TLS_PORT=0
SECURE_COOKIES=false
GAS_UPDATER_ENABLED=true
ALLOW_ORIGINS=*
ETH_URL=ws://http://52.91.75.170:9944
DATABASE_URL=postgresql://chainlink:to584b1b2jflqorv@localhost:5439/chainlink?sslmode=disable
DATABASE_TIMEOUT=0
MINIMUM_CONTRACT_PAYMENT=100000000000000000
CHAINLINK_DEV=true
```

2. Execute command
```
docker run -it -v `pwd`/chainlinkdata:/chainlink --env-file .env -p 6688:6688  smartcontract/chainlink:0.10.2 local n
```

3. Navigate to `http://localhost:6688/` and login to the `Chainlink Operator` node with email/password that you've provided on the first run of the node
4. Obtain Chainlink wallet address at `http://localhost:6688/` in Keys tab -> Acccount addresses -> type: regular.

## Deploy an Oracle contract
1. Open an `Oracle.sol` contract [using Gist in Remix](https://remix.ethereum.org/#version=soljson-v0.6.6+commit.6c089d02.js&optimize=false&runs=200&gist=612e50ae8eeeb79f8fc5db3d60537b21)
2. Deploy it to the Edgeware network using MetaMask. Also, to deploy, you'll need to provide a LINK token address that you've already deployed
3. Call `setFulfillmentPermission()` with our Chainlink node's wallet address and a `true` value. You can find Chainlink node's wallet address at `http://localhost:6688/` in Keys tab -> Acccount addresses -> type: regular. Params that you're passing to the function should look something like this: `"<<<your node address>>>",true`
4. Copy the address of `Oracle.sol` that you've already deployed


## Setup a new Job

1. At `http://localhost:6688/` click a "New Job" button
2. Into a `Job Spec` field insert the following:
   ```
   {
      "name": "Get > Uint256",
      "initiators": [
         {
            "type": "runlog",
            "params": {
            "address": "YOUR_ORACLE_CONTRACT_ADDRESS"
            }
         }
      ],
      "tasks": [
         {
            "type": "httpget"
         },
         {
            "type": "jsonparse"
         },
         {
            "type": "multiply"
         },
         {
            "type": "ethuint256"
         },
         {
            "type": "ethtx"
         }
      ]
   }
   ```
3. In place `YOUR_ORACLE_CONTRACT_ADDRESS` copy address of Oracle contract

For more information go to [Chainlink docs](https://docs.chain.link/docs/fulfilling-requests#add-jobs-to-the-node)

## Run price-provider-mock server

```
git clone https://github.com/ConsiderItDone/edgeware-price-mock
cd edgeware-price-mock
npm i
npm start
```

To validate it up and running open in a browser http://localhost:3000/priceETH

## Deploy an client contract (OracleInteractor)
1. Open an `OracleInteractor.sol` contract [using Gist in Remix](https://remix.ethereum.org/#version=soljson-v0.6.7+commit.b8d736ae.js&optimize=false&evmVersion=null&gist=eaf26608afc8ab8d545b62d751d487b5)
2. Deploy to the Edgeware network using MetaMask with the following params:
  * _linkToken: `"<<<address of the deployed LINK token>>>"`
  * _oracle: `"<<<address of the deployed Oracle contract>>>"`
  * _jobId: `"<<<created Job ID in the hex format>>>"` (it should start with `0x`; to convert you may use an online converter [like this one](https://www.rapidtables.com/convert/number/ascii-to-hex.html))
  * _urlPart: `"http://192.168.1.9:3000/price"`
  * _path: `"value"`
  * _times: `100`
  
  
## Top up Oracle Interactor and Chainlink node
Oracle Interactor will need some LINK to initiate Jobs at Chainlink node. In turn, a Chainlink node will need some tEDG to create a response transaction back to the blockchain. To top up the addresses follow these steps:
1. Add a recently deployed LINK token to MetaMask ([instruction here](https://metamask.zendesk.com/hc/en-us/articles/360015489031-How-to-view-see-your-tokens-custom-tokens-in-Metamask))
2. Top up an `OracleInteractor` contract with at least 0.1 LINK (0.1 LINK is needed for each request - Job run)
3. Top up your Chainlink node's wallet address (see [Deploy an Oracle contract](#Deploy-an-Oracle-contract), point 3) using MetaMask with some tEDG. Using this tEDG your Chainlink node will be able to send transactions to the Oracle

## Get data from real world
1. Call `OracleInteractor.createRequest()` with a name of a price that you want to know.
   * `ETH` 
2. The function will return a Request ID that you should use to get the result - a stock price. You can find this ID in the Remix console by pressing a `Debug` button of a `createRequest()` call transaction
1. Wait a few minutes... (until your Chailink node processes the request and sends a transaction back to the blockchain)
2. Call `OracleInteractor.results()` with the Request. It should return a requested stock price in USD cents (divide by 100 to get a USD price). Note: if a function returns 0 - try to call a function after 10 seconds or so (also you may check a call status on your Chainlink node)
