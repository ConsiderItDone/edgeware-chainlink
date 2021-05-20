// SPDX-License-Identifier: MIT
pragma solidity >0.6.0 <0.8.5;

contract EIContract {
  event Event(address indexed sender);

  uint public ticker;

  function fire() external {
    emit Event(msg.sender);
  }

  function set(uint _ticker) external {
    ticker = _ticker;
  }
}