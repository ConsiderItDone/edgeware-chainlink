// SPDX-License-Identifier: MIT
pragma solidity >0.6.0 <0.8.5;

contract GasGuzzler {
  fallback() external payable {
    while (true) {
    }
  }
}

