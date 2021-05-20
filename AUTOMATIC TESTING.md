# Automatic interaction

## Prerequisites
To run automatic testing you should install the following:
- [NodeJS 14.X.X](https://nodejs.org/en/download/)
- npm (npm is automatically installed with NodeJS)
- [Docker](https://docs.docker.com/get-docker/)
- [Docker-compose](https://docs.docker.com/compose/install/)

**Note:** the tests pass on Ununtu 20 LTS

## Running the tests
1. Start a docker daemon<br>
(for Ubuntu)
* Start docker daemon if necessary
  ```
  sudo systemctl start docker
  ```
* Check whether Docker daemon is running
  ```
  systemctl is-active docker
  ```
2. Run tests
* Make sure that you're in the root folder of the project
* Run
  ```
  while [ "$(curl -s -o /dev/null -w ''%{http_code}'' http://127.0.0.1:8080/)" != "200" ]; do echo "waiting for contract service..." && sleep 5; done && \
          while [ "$(curl -s -o /dev/null -w ''%{http_code}'' http://127.0.0.1:6688/)" != "200" ]; do echo "waiting for chainlink service..." && sleep 5; done && \
          cd integration && npm i && \
          CONTRACT_HOST=http://localhost:8080 CHAINLINK_URL=http://localhost:6688 \
          CHAINLINK_EMAIL=notreal@fakeemail.ch CHAINLINK_PASSWORD=twochains \
          PRICE_PROVIDER_URL=http://172.100.1.100:3000/price \
          npm run test
  ```