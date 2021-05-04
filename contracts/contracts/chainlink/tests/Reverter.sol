// SPDX-License-Identifier: MIT
pragma solidity >0.6.0 <0.8.5;

contract Reverter {

  fallback() external payable {
    require(false, "Raised by Reverter.sol");
  }

}
