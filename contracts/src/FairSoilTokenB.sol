// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

// Token B (Asset): non-decaying asset token minted only through authorized treasury.
contract FairSoilTokenB is ERC20, Ownable {
    address public treasury;
    mapping(address => uint256) public lockedBalance;
    uint256 public totalLocked;

    event Locked(address indexed account, uint256 amount);
    event Unlocked(address indexed account, uint256 amount);

    constructor(address treasuryAddress) ERC20("FairSoil Asset", "SOILB") Ownable(msg.sender) {
        treasury = treasuryAddress;
    }

    function setTreasury(address newTreasury) external onlyOwner {
        treasury = newTreasury;
    }

    function mint(address to, uint256 amount) external {
        require(msg.sender == treasury, "Treasury only");
        _mint(to, amount);
    }

    function lock(address account, uint256 amount) external {
        require(msg.sender == treasury, "Treasury only");
        require(amount > 0, "Amount required");
        lockedBalance[account] += amount;
        totalLocked += amount;
        emit Locked(account, amount);
    }

    function unlock(address account, uint256 amount) external {
        require(msg.sender == treasury, "Treasury only");
        require(amount > 0, "Amount required");
        uint256 locked = lockedBalance[account];
        require(locked >= amount, "Insufficient locked");
        lockedBalance[account] = locked - amount;
        totalLocked -= amount;
        emit Unlocked(account, amount);
    }

    function _update(address from, address to, uint256 amount) internal override {
        if (from != address(0)) {
            uint256 unlocked = balanceOf(from) - lockedBalance[from];
            require(unlocked >= amount, "Locked balance");
        }
        super._update(from, to, amount);
    }
}
