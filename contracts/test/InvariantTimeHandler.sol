// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Test.sol";

contract InvariantTimeHandler is Test {
    function warp(uint256 secondsForward) external {
        // Clamp to avoid extreme jumps during fuzzing.
        if (secondsForward > 30 days) {
            secondsForward = 30 days;
        }
        vm.warp(block.timestamp + secondsForward);
    }
}
