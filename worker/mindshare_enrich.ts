import pino from "pino";
import { prisma } from "../services/prisma";
import { getContractSource } from "../services/etherscan";

const logger = pino();
const CHAIN_ID = Number(process.env.MINDSHARE_CHAIN_ID ?? 1);
const TOP_N = Number(process.env.MINDSHARE_ENRICH_TOP ?? 200);
const RPC = process.env.ALCHEMY_ETH_RPC_URL;

async function rpc(method: string, params: any[]) {
  const body = { jsonrpc: "2.0", id: 1, method, params };
  const res = await fetch(RPC!, { method: "POST", body: JSON.stringify(body), headers: { "Content-Type": "application/json" } });
  if (!res.ok) throw new Error(`rpc ${method} failed ${res.status}`);
  const j = await res.json();
  if (j.error) throw new Error(JSON.stringify(j.error));
  return j.result;
}

async function getCode(address: string) {
  if (!RPC) return "0x";
  return await rpc("eth_getCode", [address, "latest"]);
}

async function enrich() {
  logger.info({ top: TOP_N }, "starting enrichment run");
  const rows = await prisma.mindshareAddressStats.findMany({ where: { chainId: CHAIN_ID }, orderBy: { uaw_est: "desc" }, take: TOP_N, select: { address: true } });
  for (const r of rows) {
    const address = r.address.toLowerCase();

    // skip if metadata exists
    const existing = await prisma.addressMetadata.findUnique({ where: { chainId_address: { chainId: CHAIN_ID, address } as any } as any }).catch(() => null);
    if (existing && existing.label) continue;

    // try etherscan
    try {
      const info = await getContractSource(CHAIN_ID, address);
      if (info && info.contractName) {
        await prisma.addressMetadata.upsert({
          where: { chainId_address: { chainId: CHAIN_ID, address } as any } as any,
          create: { chainId: CHAIN_ID, address, label: info.contractName, labelSource: "etherscan", confidence: 90, isVerified: info.isVerified },
          update: { label: info.contractName, labelSource: "etherscan", confidence: 90, isVerified: info.isVerified },
        });
        logger.info({ address, name: info.contractName }, "labeled via etherscan");
        continue;
      }
    } catch (e) {
      logger.warn({ err: e, address }, "etherscan lookup failed");
    }

    // fallback: check on-chain code
    try {
      const code = await getCode(address);
      const isContract = code && code !== "0x";
      if (isContract) {
        // try ERC20 name/symbol via eth_call as a best-effort enrichment
        try {
          const call = async (data: string) => await rpc("eth_call", [{ to: address, data }, "latest"]);
          const decodeString = (hex: string | null) => {
            if (!hex || hex === "0x") return null;
            const h = hex.replace(/^0x/, "");
            // If encoded as dynamic string: skip first 64 chars (offset), next 64 is length
            if (h.length >= 128) {
              const lenHex = h.slice(64, 128);
              const len = parseInt(lenHex, 16);
              const strHex = h.slice(128, 128 + len * 2);
              try {
                return Buffer.from(strHex, "hex").toString("utf8").replace(/\u0000/g, "").trim();
              } catch (e) {
                return null;
              }
            }
            // fallback: try to interpret whole payload as utf8
            try {
              return Buffer.from(h, "hex").toString("utf8").replace(/\u0000/g, "").trim();
            } catch (e) {
              return null;
            }
          };

          const nameHex = await call("0x06fdde03");
          const symbolHex = await call("0x95d89b41");
          const name = decodeString(nameHex as string | null);
          const symbol = decodeString(symbolHex as string | null);
          if (name || symbol) {
            const label = symbol ? `${name || address} (${symbol})` : name || "contract";
            await prisma.addressMetadata.upsert({
              where: { chainId_address: { chainId: CHAIN_ID, address } as any } as any,
              create: { chainId: CHAIN_ID, address, label, labelSource: "onchain-erc", confidence: 70, isVerified: false },
              update: { label, labelSource: "onchain-erc", confidence: 70, isVerified: false },
            });
            logger.info({ address, name, symbol }, "labeled via onchain ERC methods");
            continue;
          }
        } catch (e) {
          logger.warn({ err: e, address }, "erc20 onchain name/symbol failed");
        }

        // simple heuristic: label as 'contract' if no better label
        await prisma.addressMetadata.upsert({
          where: { chainId_address: { chainId: CHAIN_ID, address } as any } as any,
          create: { chainId: CHAIN_ID, address, label: "contract", labelSource: "onchain", confidence: 40, isVerified: false },
          update: { label: "contract", labelSource: "onchain", confidence: 40, isVerified: false },
        });
        logger.info({ address }, "labeled as onchain contract");
      }
    } catch (e) {
      logger.warn({ err: e, address }, "onchain code check failed");
    }
  }
  logger.info("enrichment run complete");
}

if (require.main === module) {
  enrich().catch((e) => {
    logger.error({ err: e }, "enrich failed");
    process.exit(1);
  });
}

export { enrich };
