/** @type import('hardhat/config').HardhatUserConfig */
require("@nomiclabs/hardhat-waffle");
require("solidity-coverage");
require('hardhat-abi-exporter');

module.exports = {
  solidity: "0.8.20",
  abiExporter: {
    path: './abi',
    clear: true,
    flat: true,
  },
};
