//staking
//deposit(MyToken) // withdraw(MyToken)

//MyToken : token balancd management
// - the balance of TinyBank address
// TinyBank : deposit / withdraw vault
// - users token management
// - user -> deposit -> TinyBank -> transfer(user -> TinyBank)

//Reward
// -reward token : MyToken
// -reward resource :  1MT/block minting
// -reward strategy : staked[user] / totalStaked distrubution

// -singer0 block 0 staking
// -singer0 block 5 staking
// - 0 -- 1 -- 2 -- 3 -- 4 -- 5
//   |                        |
//   singer0 10MT             singer1 10MT


// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "./ManagedAccess.sol";

interface IMyToken {
    function transferFrom(address from, address to, uint256 amount) external;
    function transfer(uint256 amount, address to) external;
    function mint(uint256 amount, address owner) external;
}

contract TinyBank is ManagedAccess {
    event Staked(address from, uint256 amount);
    event Withdraw(uint256 amount, address to);

    IMyToken public stakingtoken; 

    mapping(address => uint256) public lastClaimedBlock; 

    uint256 public defaultRewardPerBlock = 1 * 10 ** 18;
    uint256 public rewardPerBlock;

    mapping(address => uint256) public staked; 
    uint256 public totalStaked;

    constructor(IMyToken _stakingToken) ManagedAccess(msg.sender, msg.sender) {
        stakingtoken = _stakingToken;
        rewardPerBlock = defaultRewardPerBlock;
    }   

    function setRewardPerBlock(uint256 _amount) external onlyManager { 
        rewardPerBlock = _amount;
    }   

    //who, when?
    // genesis staking
    modifier updateReward(address to) { 
        if (staked[to] > 0) {
            uint256 blocks = block.number - lastClaimedBlock[to];   
            uint256 reward = (blocks * rewardPerBlock * staked[to]) / totalStaked; 
            stakingtoken.mint(reward, to);
        }
        
        lastClaimedBlock[to] = block.number;
        _; 
    }

    function stake(uint256 _amount) external updateReward(msg.sender) {
        require(_amount >= 0, "cannot stake 0 amount");
        
        stakingtoken.transferFrom(msg.sender, address(this), _amount); 
        staked[msg.sender] += _amount;
        totalStaked += _amount;
        emit Staked(msg.sender, _amount);
    }

    function withdraw(uint256 _amount) external updateReward(msg.sender) {
        require(staked[msg.sender] >= _amount, "insufficient staked token");
        stakingtoken.transfer(_amount, msg.sender); 
        staked[msg.sender] -= _amount;
        totalStaked -= _amount;
      
        emit Withdraw(_amount, msg.sender);
    }

    function currentReward(address to) external view returns (uint256) {
        if (staked[to] > 0) {    
            uint256 blocks = block.number - lastClaimedBlock[to];   
            uint256 reward = (blocks * rewardPerBlock * staked[to]) / totalStaked; 
            return reward;
        } else {
            return 0;
        }
    }
}
    