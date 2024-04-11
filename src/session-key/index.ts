import {
  type Abi,
  type Address,
  type Chain,
  type Client,
  type Hex,
  http,
  type HttpTransport,
} from "viem";
import { signerToEcdsaValidator } from "@zerodev/ecdsa-validator";
import {
  deserializeSessionKeyAccountV2 as zeroDevDeserializeSessionKeyAccount,
  serializeSessionKeyAccount as zeroDevSerializeSessionKeyAccount,
  type SessionKeyData,
  signerToSessionKeyValidator,
} from "@zerodev/session-key";
import {
  createKernelAccountClient,
  createKernelV2Account,
  KernelAccountClient,
  KernelSmartAccount,
} from "@zerodev/sdk";
import { CyberAccount, CyberFactory } from "@cyberlab/cyber-account";
import { type SmartAccountSigner } from "permissionless/accounts";

const VALIDATOR_ADDRESS: Hex = CyberFactory.mainnetContractAddresses.validator;

export type SessionKeyAccount = KernelSmartAccount;

export const createSessionKeyAccount = async (
  { cyberAccount, validatorData, signer, sessionKeySigner }: {
    signer: SmartAccountSigner;
    cyberAccount: CyberAccount;
    validatorData: SessionKeyData<Abi>;
    sessionKeySigner: SmartAccountSigner;
  },
): Promise<SessionKeyAccount> => {
  const client = cyberAccount.publicClient as Client<
    HttpTransport,
    Chain,
    undefined
  >;

  const ecdsaValidator = await signerToEcdsaValidator(
    client,
    {
      signer: signer,
      validatorAddress: VALIDATOR_ADDRESS,
    },
  );

  const sessionKeyValidator = await signerToSessionKeyValidator(
    client,
    {
      signer: sessionKeySigner,
      validatorData,
    },
  );

  const sessionKeyAccount = await createKernelV2Account(
    client,
    {
      plugins: {
        sudo: ecdsaValidator,
        regular: sessionKeyValidator,
      },
    },
  );

  return sessionKeyAccount;
};

export type SessionKeyAccountClient = KernelAccountClient & {
  sendTransaction: (
    args: {
      to: Address;
      data?: Hex;
      value: BigInt;
    },
  ) => ReturnType<KernelAccountClient["sendTransaction"]>;
};

export const createSessionKeyAccountClient = async (
  sessionKeyAccount: SessionKeyAccount,
  cyberAccount: CyberAccount,
): Promise<SessionKeyAccountClient> => {
  const accountClient = createKernelAccountClient({
    account: sessionKeyAccount,
    chain: cyberAccount.chain as Chain,
    transport: http(
      `${cyberAccount.bundler.rpcUrl}?chainId=${cyberAccount.chain.id}&appId=${cyberAccount.bundler.appId}`,
    ),
    // sponsorUserOperation: paymasterClient?.sponsorUserOperation
    //   ? async ({ userOperation }) =>
    //       await paymasterClient.sponsorUserOperation({ userOperation })
    //   : undefined,
  });

  return accountClient as unknown as SessionKeyAccountClient;
};

export const serializeSessionKeyAccount = async (
  account: SessionKeyAccount,
  privateKey?: Hex,
) => await zeroDevSerializeSessionKeyAccount(account, privateKey);

export const deserializeSessionKeyAccount = async (
  client: CyberAccount["publicClient"],
  serialized: string,
): Promise<SessionKeyAccount> =>
  await zeroDevDeserializeSessionKeyAccount(
    //@ts-ignore
    client,
    serialized,
  );
