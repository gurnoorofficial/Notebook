import { createAppKit } from "@reown/appkit/react";
import { EthersAdapter } from "@reown/appkit-adapter-ethers";

import { mainnet, arbitrum, base, polygon } from "@reown/appkit/networks";

const projectId = import.meta.env.VITE_REOWN_PROJECT_ID;

if (!projectId) {
  throw new Error(
    "VITE_REOWN_PROJECT_ID is missing from the frontend environment variables."
  );
}

const appUrl =
  typeof window !== "undefined" ? window.location.origin : "http://localhost:8080";

const metadata = {
  name: "Notebook",

  description: "Personal signed notebook",

  url: appUrl,

  icons: [`${appUrl}/favicon.svg`],
};

export const appKit = createAppKit({
  adapters: [new EthersAdapter()],

  networks: [mainnet, arbitrum, base, polygon],

  defaultNetwork: mainnet,

  defaultAccountTypes: {
    eip155: "eoa",
  },

  metadata,

  projectId,

  enableWallets: true,

  enableReconnect: true,

  enableMobileFullScreen: true,

  allWallets: "SHOW",

  debug: true,

  features: {
    analytics: true,

    email: false,

    socials: [],

    swaps: false,

    onramp: false,

    connectMethodsOrder: ["wallet"],
  },

  themeMode: "dark",
});
