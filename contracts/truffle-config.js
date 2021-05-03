var PrivateKeyProvider = require("truffle-privatekey-provider");

module.exports = {
  networks: {
    development: {
      provider() {
        const host = process.env.NODE_HOST || '127.0.0.1';
        const port = process.env.NODE_PORT || 9933;
        const pkey = process.env.NODE_PKEY || '0x1111111111111111111111111111111111111111111111111111111111111111';
        return new PrivateKeyProvider(pkey, `http://${host}:${port}`);
      },
      network_id: "*",
    },
  },
  compilers: {
    solc: {
      version: "0.6.12",
      settings: {
        optimizer: {
          enabled: true,
          runs: 200,
        },
      },
    },
  },
};