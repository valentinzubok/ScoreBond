/** Live ScoreBond deploy on GenLayer Studio Dev (chain 61997). Override via env. */
export const CONTRACT_ADDRESS = (process.env.NEXT_PUBLIC_SCOREBOND_ADDRESS ||
  "0xb68dC2fF071862504aC325EA9F0261db3B53Da1b") as `0x${string}`;

/** Studio Dev / Studio Next — chain ID 61997. */
export const CHAIN_ID = 61997;
export const RPC_URL =
  process.env.NEXT_PUBLIC_GENLAYER_RPC || "https://studio-dev.genlayer.com/api";
export const EXPLORER_BASE =
  process.env.NEXT_PUBLIC_GENLAYER_EXPLORER || "https://explorer-studio-dev.genlayer.com";
export const EXPLORER = `${EXPLORER_BASE}/address/${CONTRACT_ADDRESS}`;
export const txUrl = (hash: string) => `${EXPLORER_BASE}/tx/${hash}`;

export const GITHUB = "https://github.com/valentinzubok/ScoreBond";

/** Demo delivery pages: files in this repository, served by raw.githubusercontent.com. */
const RAW = "https://raw.githubusercontent.com/valentinzubok/ScoreBond/main/web/public/fixtures/deliveries";
export const DEMO_DELIVERY = RAW + "/good-guide.md";
export const DEMO_RUBRIC =
  "A short guide for new contributors with three sections: how to set up the project, how to run the tests, and how to open a pull request. Each section must give concrete steps.";
