"use client";

import { type Dispatch, type SetStateAction, useCallback, useRef, useState } from "react";
import type { IDKitErrorCodes, IDKitResult, RpContext } from "@worldcoin/idkit";

type SetStringState = Dispatch<SetStateAction<string | null>>;

export function useIdentityFlow(params: {
  accountAddress?: string;
  worldIdAppId?: string;
  worldIdActionId?: string;
  worldIdEnvironment: "staging" | "production";
  worldIdMock: boolean;
  zknfcMock: boolean;
  zknfcVerifierUrl?: string;
  handleSetPrimary: () => Promise<void>;
  showSuccess: (message: string) => void;
  setTxError: SetStringState;
  setTxSuccess: SetStringState;
  setTxStatus: Dispatch<SetStateAction<"idle" | "signing" | "confirming">>;
  setTxAction: Dispatch<SetStateAction<string | null>>;
  normalizeErrorMessage: (error: unknown) => string;
}) {
  const {
    accountAddress,
    worldIdAppId,
    worldIdActionId,
    worldIdEnvironment,
    worldIdMock,
    zknfcMock,
    zknfcVerifierUrl,
    handleSetPrimary,
    showSuccess,
    setTxError,
    setTxSuccess,
    setTxStatus,
    setTxAction,
    normalizeErrorMessage,
  } = params;

  const [worldIdOpen, setWorldIdOpen] = useState(false);
  const [worldIdRpContext, setWorldIdRpContext] = useState<RpContext | null>(null);
  const worldIdHostErrorRef = useRef<string | null>(null);

  const handleWorldIdHostVerify = useCallback(
    async (result: IDKitResult) => {
      worldIdHostErrorRef.current = null;
      try {
        if (!accountAddress || !worldIdAppId || !worldIdActionId) {
          throw new Error("World ID config missing.");
        }
        const response = await fetch("/api/worldid/verify", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            address: accountAddress,
            appId: worldIdAppId,
            actionId: worldIdActionId,
            idkitResponse: result,
            rpContext: worldIdRpContext,
          }),
        });
        if (!response.ok) {
          const result = (await response.json().catch(() => null)) as { message?: string } | null;
          throw new Error(result?.message || `Network error from verifier (${response.status})`);
        }
        const verifyResult = (await response.json()) as { verified?: boolean; message?: string };
        if (!verifyResult.verified) {
          throw new Error(verifyResult.message || "Verification failed.");
        }
      } catch (error) {
        worldIdHostErrorRef.current = normalizeErrorMessage(error);
        throw error;
      }
    },
    [accountAddress, normalizeErrorMessage, worldIdActionId, worldIdAppId, worldIdRpContext]
  );

  const handleWorldIdWidgetSuccess = useCallback(async () => {
    worldIdHostErrorRef.current = null;
    await handleSetPrimary();
    setWorldIdOpen(false);
  }, [handleSetPrimary]);

  const handleWorldIdWidgetError = useCallback(
    (errorCode: IDKitErrorCodes) => {
      if (typeof window !== "undefined") {
        console.error("[worldid/widget] error", {
          errorCode,
          environment: worldIdEnvironment,
        });
      }
      const hostError = worldIdHostErrorRef.current;
      if (errorCode === "failed_by_host_app" && hostError) {
        setTxError(`Verification failed. ${hostError}`);
      } else {
        setTxError(`World ID widget failed (${errorCode}).`);
      }
      setTxSuccess(null);
      setWorldIdOpen(false);
    },
    [setTxError, setTxSuccess, worldIdEnvironment]
  );

  const handleWorldIdVerify = useCallback(async () => {
    if (!accountAddress) return;
    if (!worldIdAppId || !worldIdActionId) {
      setTxError("World ID config missing.");
      setTxSuccess(null);
      return;
    }
    if (worldIdMock) {
      await handleSetPrimary();
      return;
    }
    try {
      worldIdHostErrorRef.current = null;
      setTxError(null);
      setTxSuccess(null);
      setTxStatus("signing");
      setTxAction("worldIdVerify");
      const response = await fetch("/api/worldid/rp-signature", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: worldIdActionId,
        }),
      });
      if (!response.ok) {
        throw new Error(`Network error from verifier (${response.status})`);
      }
      const rpContext = (await response.json()) as RpContext;
      setWorldIdRpContext(rpContext);
      setWorldIdOpen(true);
    } catch (error) {
      const message = normalizeErrorMessage(error);
      if (message.toLowerCase().includes("network error")) {
        setTxError(`Verifier unreachable. ${message}`);
      } else {
        setTxError(`Verification failed. ${message}`);
      }
    } finally {
      setTxStatus("idle");
      setTxAction(null);
    }
  }, [
    accountAddress,
    handleSetPrimary,
    normalizeErrorMessage,
    setTxAction,
    setTxError,
    setTxStatus,
    setTxSuccess,
    worldIdActionId,
    worldIdAppId,
    worldIdMock,
  ]);

  const handleZkNfcVerify = useCallback(async () => {
    if (!accountAddress) return;
    if (!zknfcVerifierUrl && !zknfcMock) {
      setTxError("ZK-NFC verifier URL missing.");
      setTxSuccess(null);
      return;
    }
    if (zknfcMock) {
      await handleSetPrimary();
      return;
    }
    setTxError(null);
    setTxSuccess(null);
    setTxStatus("signing");
    setTxAction("zknfcVerify");
    try {
      const response = await fetch("/api/zknfc/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ address: accountAddress }),
      });
      if (!response.ok) {
        throw new Error(`Network error from verifier (${response.status})`);
      }
      const result = (await response.json()) as { verified?: boolean; message?: string };
      if (!result.verified) {
        throw new Error(result.message || "Verification failed. Please re-check your NFC proof.");
      }
      await handleSetPrimary();
      showSuccess("ZK-NFC verification accepted.");
    } catch (error) {
      const message = normalizeErrorMessage(error);
      if (message.toLowerCase().includes("network error")) {
        setTxError(`Verifier unreachable. ${message}`);
      } else {
        setTxError(`Verification failed. ${message}`);
      }
    } finally {
      setTxStatus("idle");
      setTxAction(null);
    }
  }, [
    accountAddress,
    handleSetPrimary,
    normalizeErrorMessage,
    setTxAction,
    setTxError,
    setTxStatus,
    setTxSuccess,
    showSuccess,
    zknfcMock,
    zknfcVerifierUrl,
  ]);

  return {
    worldIdOpen,
    setWorldIdOpen,
    worldIdRpContext,
    handleWorldIdHostVerify,
    handleWorldIdWidgetSuccess,
    handleWorldIdWidgetError,
    handleWorldIdVerify,
    handleZkNfcVerify,
  };
}
