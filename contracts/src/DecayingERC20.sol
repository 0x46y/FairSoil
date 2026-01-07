// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";

// Minimal ERC20 with linear time-based decay applied to balances.
contract DecayingERC20 is ERC20 {
    uint256 public constant ONE = 1e18;
    uint256 public immutable decayRatePerSecond; // 1e18 = 100% per second

    mapping(address => uint256) public lastUpdate;

    constructor(
        string memory name_,
        string memory symbol_,
        uint256 decayRatePerSecond_
    ) ERC20(name_, symbol_) {
        decayRatePerSecond = decayRatePerSecond_;
    }

    function balanceOf(address account) public view override returns (uint256) {
        uint256 raw = super.balanceOf(account);
        uint256 last = lastUpdate[account];
        if (raw == 0 || last == 0) {
            return raw;
        }

        uint256 elapsed = block.timestamp - last;
        if (elapsed == 0) {
            return raw;
        }

        uint256 decay = decayRatePerSecond * elapsed;
        if (decay >= ONE) {
            return 0;
        }

        return (raw * (ONE - decay)) / ONE;
    }

    function _update(address from, address to, uint256 amount) internal override {
        if (from != address(0)) {
            _applyDecay(from);
        }
        if (to != address(0)) {
            _applyDecay(to);
        }

        super._update(from, to, amount);
    }

    function _applyDecay(address account) internal {
        uint256 raw = super.balanceOf(account);
        uint256 last = lastUpdate[account];
        if (raw == 0) {
            lastUpdate[account] = block.timestamp;
            return;
        }
        if (last == 0) {
            lastUpdate[account] = block.timestamp;
            return;
        }

        uint256 elapsed = block.timestamp - last;
        if (elapsed == 0) {
            return;
        }

        uint256 decay = decayRatePerSecond * elapsed;
        if (decay >= ONE) {
            _burn(account, raw);
        } else {
            uint256 decayed = (raw * (ONE - decay)) / ONE;
            if (decayed < raw) {
                _burn(account, raw - decayed);
            }
        }

        lastUpdate[account] = block.timestamp;
    }
}
