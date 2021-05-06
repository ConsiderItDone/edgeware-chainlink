// SPDX-License-Identifier: MIT
pragma solidity >0.6.0 <0.8.5;

import "./chainlink/ChainlinkClient.sol";

/**
 * @dev Contract module which provides a basic access control mechanism, where
 * there is an account (an owner) that can be granted exclusive access to
 * specific functions.
 *
 * By default, the owner account will be the one that deploys the contract. This
 * can later be changed with {transferOwnership}.
 *
 * This module is used through inheritance. It will make available the modifier
 * `onlyOwner`, which can be applied to your functions to restrict their use to
 * the owner.
 */
abstract contract Ownable {
    address private _owner;

    event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);

    /**
     * @dev Initializes the contract setting the deployer as the initial owner.
     */
    constructor () public {
        _owner = msg.sender;
        emit OwnershipTransferred(address(0), msg.sender);
    }

    /**
     * @dev Returns the address of the current owner.
     */
    function owner() public view virtual returns (address) {
        return _owner;
    }

    /**
     * @dev Throws if called by any account other than the owner.
     */
    modifier onlyOwner() {
        require(owner() == msg.sender, "Ownable: caller is not the owner");
        _;
    }

    /**
     * @dev Transfers ownership of the contract to a new account (`newOwner`).
     * Can only be called by the current owner.
     */
    function transferOwnership(address newOwner) public virtual onlyOwner {
        require(newOwner != address(0), "Ownable: new owner is the zero address");
        emit OwnershipTransferred(_owner, newOwner);
        _owner = newOwner;
    }
}

contract Client is Ownable, ChainlinkClient {
    uint256 constant public ORACLE_FEE = 0.1 * 10 ** 18; // default price for each request
    mapping (bytes32 => uint256) public results; // _requestId => obtained data
    bytes32 public jobId; // job id of the oracle
    string public urlPart; // part of API url (without the last part) to make oracle calls
    string public path; // path in API response to get the data
    int256 public times; // multiplier task

    event RequestCreated(
        address indexed requester,
        bytes32 indexed jobId,
        bytes32 indexed requestId
    );
    event RequestFulfilled(bytes32 indexed requestId, uint256 _data);
    event RequestCanceled(bytes32 indexed requestId);
    event TokenWithdrawn(address indexed recepient, uint256 amount);

    constructor(
        address _linkToken, // LINK token address // 0xa36085F69e2889c224210F603D836748e7dC0088 (Kovan)
        address _oracle, // Chainlink core adapter // 0x2f90A6D021db21e1B2A077c5a37B3C7E75D15b7e (alpha chain - Kovan)
        bytes32 _jobId,
        string memory _urlPart,
        string memory _path,
        int256 _times
    ) public {
        setChainlinkToken(_linkToken);
        setChainlinkOracle(_oracle);
        jobId = _jobId;
        urlPart = _urlPart;
        path = _path;
        times = _times;
    }
    
    function setOracle(address _oracle) public onlyOwner {
        setChainlinkOracle(_oracle);
    }

    function setJobId(bytes32 _jobId) public onlyOwner {
        jobId = _jobId;
    }

    function setUrlPart(string memory _urlPart) public onlyOwner {
        urlPart = _urlPart;
    }

    function setPath(string memory _path) public onlyOwner {
        path = _path;
    }

    function setMultiplier(int256 _times) public onlyOwner {
        times = _times;
    }

    function getChainlinkToken() public view returns (address) {
        return chainlinkTokenAddress();
    }

    function getOracle() public view returns (address) {
        return chainlinkOracleAddress();
    }

    function createRequest(string memory _stock)
        public
        onlyOwner 
        returns (bytes32 requestId)
    {
        // c7dd72ca14b44f0c9b6cfcd4b7ec0a2c - get > uint256 jobId (Kovan) (https://market.link/jobs/f870737d-7550-4ec9-a009-eb596719dff8?network=42)
        // bc8ed7c651ce4291aa4a36fe314978e2 - get > uint256 jobId local node (Kovan)
        Chainlink.Request memory req = buildChainlinkRequest(jobId, address(this), this.fulfill.selector);
        string memory url = string(abi.encodePacked(urlPart, _stock));

        req.add("url", url);
        req.add("path", path);
        req.addInt("times", times);

        requestId = sendChainlinkRequestTo(getOracle(), req, ORACLE_FEE);
        emit RequestCreated(msg.sender, jobId, requestId);
    }

    function fulfill(bytes32 _requestId, uint256 _data)
        public
        recordChainlinkFulfillment(_requestId)
    {
        results[_requestId] = _data;
        emit RequestFulfilled(_requestId, _data);
    }

    function withdrawTokens() public onlyOwner {
        LinkTokenInterface link = LinkTokenInterface(chainlinkTokenAddress());
        uint256 balance = link.balanceOf(address(this));
        require(link.transfer(msg.sender, balance), "Unable to transfer");
        emit TokenWithdrawn(msg.sender, balance);
    }

    function cancelRequest(
        bytes32 _requestId,
        uint256 _payment,
        bytes4 _callbackFunctionId,
        uint256 _expiration
    ) public onlyOwner {
        cancelChainlinkRequest(_requestId, _payment, _callbackFunctionId, _expiration);
        emit RequestCanceled(_requestId);
    }
}