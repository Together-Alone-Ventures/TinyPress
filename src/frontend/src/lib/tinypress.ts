import { Actor, HttpAgent, type Identity } from "@dfinity/agent";
import { idlFactory } from "../declarations/tinypress/tinypress.did.js";
import type { _SERVICE } from "../declarations/tinypress/tinypress.did";

const LOCAL_REPLICA_HOST = "http://127.0.0.1:4943";
const IC_HOST = "https://icp-api.io";

function getTinypressCanisterId(): string {
  const canisterId = import.meta.env.VITE_TINYPRESS_CANISTER_ID;

  if (!canisterId) {
    throw new Error("TinyPress is not configured for this environment.");
  }

  return canisterId;
}

export async function createTinypressActor(identity: Identity): Promise<_SERVICE> {
  const isLocalNetwork = import.meta.env.VITE_DFX_NETWORK === "local";
  const agent = new HttpAgent({
    identity,
    host: isLocalNetwork ? LOCAL_REPLICA_HOST : IC_HOST
  });

  if (isLocalNetwork) {
    await agent.fetchRootKey();
  }

  return Actor.createActor<_SERVICE>(idlFactory, {
    agent,
    canisterId: getTinypressCanisterId()
  });
}
