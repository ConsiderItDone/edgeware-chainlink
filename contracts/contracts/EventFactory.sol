// SPDX-License-Identifier: MIT
pragma solidity >0.6.0 <0.8.5;

contract EventFactory {
  event Event(address indexed sender);

  function fire() external {
    emit Event(msg.sender);
  }
}