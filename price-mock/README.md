# edgeware-price-mock

## Run mock server

```bash
npm start
```

## API

### Default configuration
`BTC: 50000`
`ETH: 1000`
`USDT: 1`

### Get price
#### Request
```bash
GET /price{NAME}
```

#### Response example
```json
{"value":1000,"ticker":"ETH","DateTime":"4/15/2021, 11:23:09 AM"}
```

### Set price
#### Request
```bash
POST /price{NAME} { value }
```

##### cURL example 
```bash
curl --header "Content-Type: application/json"
  --request POST
  --data '{"value": 2000}'
  http://localhost:3000/priceETH
```
