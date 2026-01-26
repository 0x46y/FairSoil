// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Covenant} from "../src/Covenant.sol";

contract InvariantResolverHandler {
    Covenant public covenant;

    constructor(address covenantAddress) {
        covenant = Covenant(covenantAddress);
    }

    function resolveDispute(
        uint256 covenantId,
        uint256 workerPayoutBps,
        uint256 integrityPoints,
        uint256 slashingPenalty
    ) external {
        covenant.resolveDispute(covenantId, workerPayoutBps, integrityPoints, slashingPenalty);
    }

    function finalizeResolution(uint256 covenantId) external {
        covenant.finalizeResolution(covenantId);
    }
}
