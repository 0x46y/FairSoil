// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {ERC20Upgradeable} from "@openzeppelin/contracts-upgradeable/token/ERC20/ERC20Upgradeable.sol";
import {OwnableUpgradeable} from "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import {UUPSUpgradeable} from "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";

// Token A (Flow): decaying currency with a survival buffer for verified addresses.
contract FairSoilTokenA is ERC20Upgradeable, OwnableUpgradeable, UUPSUpgradeable {
    uint256 public constant ONE = 1e18;
    uint256 public constant SURVIVAL_BUFFER = 1000 * 1e18;

    // 1e18 = 100% per second
    uint256 public decayRatePerSecond;

    mapping(address => uint256) public lastUpdate;
    mapping(address => bool) public isPrimaryAddress;

    address public treasury;

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    function initialize(uint256 initialDecayRatePerSecond) external initializer {
        __ERC20_init("FairSoil Flow", "SOILA");
        __Ownable_init(msg.sender);
        decayRatePerSecond = initialDecayRatePerSecond;
    }

    function setDecayRatePerSecond(uint256 newRate) external onlyOwner {
        decayRatePerSecond = newRate;
    }

    function setTreasury(address newTreasury) external onlyOwner {
        treasury = newTreasury;
    }

    function setPrimaryAddress(address account, bool status) external onlyOwner {
        isPrimaryAddress[account] = status;
        if (lastUpdate[account] == 0) {
            lastUpdate[account] = block.timestamp;
        }
    }

    function mint(address to, uint256 amount) external {
        require(msg.sender == treasury, "Treasury only");
        _applyDecay(to);
        _mint(to, amount);
    }

    function balanceOf(address account) public view override returns (uint256) {
        uint256 raw = super.balanceOf(account);
        if (raw == 0) {
            return 0;
        }

        uint256 last = lastUpdate[account];
        if (last == 0) {
            return raw;
        }

        uint256 elapsed = block.timestamp - last;
        if (elapsed == 0) {
            return raw;
        }

        return _calculateDecayedBalance(account, raw, elapsed);
    }

    function _calculateDecayedBalance(
        address account,
        uint256 raw,
        uint256 elapsed
    ) internal view returns (uint256) {
        uint256 decay = decayRatePerSecond * elapsed;
        if (decay >= ONE) {
            return isPrimaryAddress[account] ? _bufferFor(raw) : 0;
        }

        uint256 decayedAmount;
        if (isPrimaryAddress[account]) {
            if (raw <= SURVIVAL_BUFFER) {
                return raw;
            }
            uint256 decayable = raw - SURVIVAL_BUFFER;
            uint256 remaining = (decayable * (ONE - decay)) / ONE;
            decayedAmount = SURVIVAL_BUFFER + remaining;
        } else {
            decayedAmount = (raw * (ONE - decay)) / ONE;
        }

        return decayedAmount;
    }

    function _bufferFor(uint256 raw) internal pure returns (uint256) {
        if (raw <= SURVIVAL_BUFFER) {
            return raw;
        }
        return SURVIVAL_BUFFER;
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
        if (raw == 0) {
            lastUpdate[account] = block.timestamp;
            return;
        }

        uint256 last = lastUpdate[account];
        if (last == 0) {
            lastUpdate[account] = block.timestamp;
            return;
        }

        uint256 elapsed = block.timestamp - last;
        if (elapsed == 0) {
            return;
        }

        uint256 decayed = _calculateDecayedBalance(account, raw, elapsed);
        if (decayed < raw) {
            _burn(account, raw - decayed);
        }

        lastUpdate[account] = block.timestamp;
    }

    function _authorizeUpgrade(address newImplementation) internal override onlyOwner {}
}
