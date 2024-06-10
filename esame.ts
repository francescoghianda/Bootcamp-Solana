import { createMint, getOrCreateAssociatedTokenAccount, mintTo, transfer } from "@solana/spl-token";
import { Connection, Keypair, LAMPORTS_PER_SOL, PublicKey } from "@solana/web3.js";

import mintAuthorityPK from "./mintAuthority.json";

/**
 * Genera un nuovo wallet random
 * @returns Il nuovo wallet
 */
const getNewWallet = (): Keypair => {
    return Keypair.generate();
}

/**
 * 
 * @param connection Connessione con le API di Solana
 * @param to Wallet da caricare
 * @param amount Quantità di SOL da caricare
 * @returns L'hash della transazione
 */
const airdrop = async (connection: Connection, to: PublicKey, amount: number): Promise<string> => {

    const airdropSignature = await connection.requestAirdrop(
        to,
        amount * LAMPORTS_PER_SOL
    );

    return airdropSignature;
}

/**
 * 
 * @param connection Connessione con le API di Solana
 * @param mintAuthority In questa funzione la mintAuthority deve conincidere con il payer della transazione
 * @param mint Token che si vuole mintare
 * @param to Wallet verso cui mintare i nuovi token
 * @param amount Numero di token da creare
 * @returns L'hash della transazione
 */
const emitNewTokens = async (connection: Connection, mintAuthority: Keypair, mint: PublicKey, to: PublicKey, amount: number) => {

    const tokenAccount = await getOrCreateAssociatedTokenAccount(
        connection,
        mintAuthority,
        mint,
        to,
    );

    const ata = tokenAccount.address;

    return await mintTo(
        connection,
        mintAuthority,
        mint,
        ata,
        mintAuthority.publicKey,
        amount
    );
}

/**
 * 
 * @param connection Connessione con le API di Solana
 * @param payer Payer per la transazione
 * @param mint Token da trasferire
 * @param from Wallet da cui trasferire i token
 * @param to Wallet verso cui trasferire i token
 * @param amount Numero di token da trasferire (es. 10e5 equivale ad 1 token)
 * @returns L'hash della transazione
 */
const transferTokens = async (connection: Connection, payer: Keypair, mint: PublicKey, from: Keypair, to: PublicKey, amount: number) => {

    const toTokenAccount = await getOrCreateAssociatedTokenAccount(
        connection, 
        payer,
        mint,
        to,
    );

    const toAddr = toTokenAccount.address;

    const fromTokenAccount = await getOrCreateAssociatedTokenAccount(
        connection, 
        payer,
        mint,
        from.publicKey,
    );

    const fromAddr = fromTokenAccount.address;
    
    return await transfer(
        connection,
        payer,
        fromAddr,
        toAddr,
        from,
        amount
    );
}

/**
 * Crea 3 wallet (mintAuthority, walletA, walletB)
 * Carica 1 SOL su mintAuthority usando la funzione airdrop
 * Crea un nuovo token usando mintAuthority
 * Minta 10 token su walletA
 * Trasferisce 1 token da walletA a walletB
 */
(async () => {

    const connection = new Connection("https://api.devnet.solana.com", "finalized");

    // La mintAuthority la uso anche come payer delle transazioni
    //const mintAuthority = Keypair.fromSecretKey(new Uint8Array(mintAuthorityPK));
    const mintAuthority = getNewWallet();
    const walletA = getNewWallet();
    const walletB = getNewWallet();

    console.log("Mint Authority: ", mintAuthority.publicKey);
    console.log("Wallet A: ", walletA.publicKey);
    console.log("Wallet B: ", walletB.publicKey);

    // Airdrop 1 SOL su MintAuthority
    // L'airdrop può essere usato 1 volta ogni 24 ore
    try {
        const airdropTx = await airdrop(connection, mintAuthority.publicKey, 1);
        console.log("Airdrop Tx: ", airdropTx);
    }
    catch (e) {
        console.log("Errore durante l'esecuzione dell'airdrop");
        console.log(e);
        return;
    }

    // Crea un nuovo token
    const mint = await createMint(
        connection,
        mintAuthority,
        mintAuthority.publicKey,
        null,
        6,
    );

    console.log("Mint: ", mint);

    // Minto 10 Token su WalletA
    const emitTx = await emitNewTokens(connection, mintAuthority, mint, walletA.publicKey, 10e6);
    console.log("Emit trasaction: ", emitTx);

    // Trasferisco 1 Token da WalletA --> WalletB
    const transferTx = await transferTokens(connection, mintAuthority, mint, walletA, walletB.publicKey, 10e5);
    console.log("Trasfer transaction: ", transferTx);

})()

