// SPDX-License-Identifier: MIT
pragma solidity >0.6.0 <0.8.5;

import "./IERC20.sol";

interface ERC677 is IERC20 {
  function transferAndCall(address to, uint value, bytes memory data) external returns (bool success);

  event Transfer(address indexed from, address indexed to, uint value, bytes data);
}
