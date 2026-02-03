const ETHERSCAN_KEY = process.env.ETHERSCAN_API_KEY || "";

function etherscanBase(chainId: number) {
  // support only mainnet for now
  if (chainId === 1) return "https://api.etherscan.io/api";
  return null;
}

export async function getContractSource(chainId: number, address: string) {
  const base = etherscanBase(chainId);
  if (!base || !ETHERSCAN_KEY) return null;
  const url = `${base}?module=contract&action=getsourcecode&address=${address}&apikey=${ETHERSCAN_KEY}`;
  const res = await fetch(url);
  if (!res.ok) return null;
  const j = await res.json();
  if (!j || !Array.isArray(j.result) || j.result.length === 0) return null;
  const info = j.result[0];
  return {
    contractName: info.ContractName || null,
    sourceCode: info.SourceCode || null,
    abi: info.ABI || null,
    compilerVersion: info.CompilerVersion || null,
    optimizationUsed: info.OptimizationUsed === "1",
    isVerified: info.SourceCode && info.SourceCode !== "" && info.ABI && info.ABI !== "[]",
  };
}
