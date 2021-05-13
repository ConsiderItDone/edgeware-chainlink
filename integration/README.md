# Dev

## Run services manually

1. Run chainlink server
2. Run edgeware-chainlink/contracts server
3. Run edgeware-chainlink/price-mock server
4. ```
   CONTRACT_HOST=http://localhost:8080 CHAINLINK_URL=http://localhost:6688 CHAINLINK_EMAIL=notreal@fakeemail.ch \
   CHAINLINK_PASSWORD=twochains npm run test
   ```

## Run services in docker-compose

```
docker-compose up -d
# wait 1 min
sleep 60
CONTRACT_HOST=http://localhost:8080 CHAINLINK_URL=http://localhost:6688 \
CHAINLINK_EMAIL=notreal@fakeemail.ch CHAINLINK_PASSWORD=twochains \
npm run test
```