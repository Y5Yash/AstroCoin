// Checkout README.md from https://github.com/reclaimprotocol/reclaim-sdk

// Imports
import cors from 'cors';
import express from 'express';
import dotenv from 'dotenv';
import { reclaimprotocol } from "@reclaimprotocol/reclaim-sdk";
import { Collection, Document, MongoClient } from 'mongodb';

import { ethers } from 'ethers';
import contractABI from './smart-contracts/AstroCoin.json';
import { ParsedQs } from 'qs';

const app = express();
const port = 3000;

// Get instance specific variables from the '.env' file
dotenv.config();
const privateKey = process.env.PRIVATE_KEY;
const publicAddress = process.env.PUBLIC_ADDRESS;
const dbPassword = process.env.DB_PWD;
const dbUsername = process.env.DB_USER;

// Connect to MongoDB Atlas. Use other DB if needed.
const mongoUri = `mongodb+srv://${dbUsername}:${dbPassword}@cluster0.elv9kur.mongodb.net/`;
const client = new MongoClient(mongoUri, { monitorCommands: true });

// RPC for the testnet. Change to wherever the smart contract is to be hosted.
const sepoliaProvider = 'https://rpc2.sepolia.org/'
const provider = new ethers.JsonRpcProvider(sepoliaProvider);

app.use(cors());
app.use(express.json());

// This is the URL of where this code will be deployed (+ the '/callback' endpoint)
const callbackUrl = `http://192.168.0.130:${port}/callback`;
// const callbackUrl = `http://192.168.35.182:${port}/callback`;

const reclaim = new reclaimprotocol.Reclaim();

// The contract of all the AstroCoin contracts.
// Update the addresses for your implementation
const addresses = [
    "0x0a0A66969d4D5bEe75De8B2288F2e1B3cBBf58CE",
    "0x6EEd60595C2394B196956fe5b2839403279E270e",
    "0x81238B3b62b0d82ceFc73856c46ea6FE0F4919aa",
    "0x65525Bf7C393F9aFe416705F78B385400CaCaC52",
    "0xa8583AEc8b3AC47218d7B6D4501f7E74f8d2cE89",
    "0x3B5f917d3c52d1F83839B2284Ac453435B9D0e1c",
    "0x40930eC528B754165ab2e0A32CE9Eb0d314dea77",
    "0xafE8871bcBa85dd28999Bb4c06e787a27a51FF2E",
    "0x1364002AB7Fac33779eCe415A059A6d3f36b4956",
    "0xBF86098AF73415498034AC2c91c3A1C8D9374AcD",
    "0x84dAe200221430B22f6F443EaF716301c0A506FE",
    "0x15c062EF537c1c76260eca20A77e4a7bDC6cd56a"
  ];
const ownerAccount = new ethers.Wallet(privateKey, provider);
const contractAries = new ethers.Contract(addresses[0], contractABI, ownerAccount);
const contractTaurus = new ethers.Contract(addresses[1], contractABI, ownerAccount);
const contractGemini = new ethers.Contract(addresses[2], contractABI, ownerAccount);
const contractCancer = new ethers.Contract(addresses[3], contractABI, ownerAccount);
const contractLeo = new ethers.Contract(addresses[4], contractABI, ownerAccount);
const contractVirgo = new ethers.Contract(addresses[5], contractABI, ownerAccount);
const contractLibra = new ethers.Contract(addresses[6], contractABI, ownerAccount);
const contractScorpio = new ethers.Contract(addresses[7], contractABI, ownerAccount);
const contractSagittarius = new ethers.Contract(addresses[8], contractABI, ownerAccount);
const contractCapricorn = new ethers.Contract(addresses[9], contractABI, ownerAccount);
const contractAquarius = new ethers.Contract(addresses[10], contractABI, ownerAccount);
const contractPisces = new ethers.Contract(addresses[11], contractABI, ownerAccount);

const contracts = [contractAries, contractTaurus, contractGemini, contractCancer, contractLeo, contractVirgo, contractLibra, contractScorpio, contractSagittarius, contractCapricorn, contractAquarius, contractPisces]

// To log what endpoints were called. Used for debugging purposes.
app.use((req, res, next) => {
    console.log('Endpoint called : ', req.url);
    next();
});

// endpoint for generating template links and adding the callbackId to the DB.
app.get("/request-proofs", async (req, res) => {
    try {
        const db = client.db();
        const callbackCollection = db.collection('callbackIds');
        const request = reclaim.requestProofs({
            title: "Reclaim X Astrology",
            baseCallbackUrl: callbackUrl,
            requestedProofs: [
                new reclaim.CustomProvider({
                    provider: 'codeforces-rating',
                    payload: {}
                }),
            ],
        });

        const { callbackId, reclaimUrl } = request;
        console.log(callbackId)
        console.log(reclaimUrl)
        await callbackCollection.insertOne({callbackId: callbackId, verified: false, used: false, month: null});
        res.status(200).json({ reclaimUrl });
    }
    catch (error) {
        console.error("Error requesting proofs:", error);
        res.status(500).json({ error: "Failed to request proofs" });
    }
    return;
})

// function to check if a callbackId exists in the DB and is still unused.
async function checkCallbackIdValid(callbackId: string | ParsedQs | string[] | ParsedQs[], callbackCollection: Collection<Document>) {
    const entry = await callbackCollection.findOne({callbackId: callbackId});
    if (!entry) {
        console.log(callbackId, " not found in the database");
        // throw new Error(`${callbackId} not found in the database.`);
        return false;
    }
    if (entry.verified) {
        console.log(callbackId, " has already been called back/verified. Resubmission error.");
        // throw new Error(`Callback Id: ${callbackId} has already been called once.`);
        return false;
    }
    if (entry.used) {
        console.log(callbackId, " has already received an airdrop");
        return false;
    }
    return true;
}

function getMonthIdFromProof(dob: number) {
    return dob%12 + 1;
}

// endpoint to receive the proof from the Reclaim Wallet App.
app.use(express.text({ type: "*/*" }));
app.post("/callback/", async (req, res) => {
    console.log("-------here")
    try {
        const {id: callbackId} = req.query;
        console.log(callbackId);
        console.log(req.body);
        const {proofs} = JSON.parse(decodeURIComponent(req.body));
        console.log(proofs);
        console.log(proofs[0]?.parameters)

        const onChainClaimIds = reclaim.getOnChainClaimIdsFromProofs(proofs);
        console.log(onChainClaimIds, "<-onChainClaimIds")
        // verify
        const isProofsCorrect = await reclaim.verifyCorrectnessOfProofs(proofs);
        if (isProofsCorrect) {
            res.json({success: true});
        }
        else {
            res.status(400).json({success: false});
            console.log("Proof verification failed");
        }

        // ******* Correct this later ******** //
        const monthId = getMonthIdFromProof(proofs[0]?.parameters?.rating);

        const db = client.db();
        const callbackCollection = db.collection('callbackIds');

        const isValidCallbackId = await checkCallbackIdValid(callbackId, callbackCollection);
        if (!isValidCallbackId) throw new Error(`Callback ID either not found or already submitted`);

        const result = await callbackCollection.updateOne({callbackId: callbackId}, {$set: {callbackId: callbackId, verified: true, used: false, month: monthId}});
        if (result.matchedCount === 0) {
            console.log(callbackId, " not found in the database");
            throw new Error(`${callbackId} not found in the database.`);
        }
        console.log(result);
        // res.send('200 - OK')
    }
    catch (error) {
        console.log("Error processing callback:", error);
        res.send(404).json({error: 'callbackId not found. Possibly the connection closed in between.'});
    }
    return;
});

// check if the proof is verified
async function checkCallbackIdVerified(callbackId: string | ParsedQs | string[] | ParsedQs[], callbackCollection: Collection<Document>) {
    const entry = await callbackCollection.findOne({callbackId: callbackId});
    if (!entry) {
        console.log(callbackId, " not found in the database");
        // throw new Error(`${callbackId} not found in the database.`);
        return 0;
    }
    if (!entry.verified) {
        console.log(callbackId, " has not been verified yet");
        // throw new Error(`Callback Id: ${callbackId} has already been called once.`);
        return 0;
    }
    if (entry.used) {
        console.log(callbackId, " has already received an airdrop");
        return 0;
    }
    if (entry.month > 12 || entry.month < 1) {
        console.log(`Month ${entry.month} out of range (0-11)`)
        return 0;
    }
    return entry.month;
}

// endpoint to initiate the AirDrop once a proof is verified.
app.get('/sendTransaction', async (req, res) => {
    const { toAddress: airDropAddress } = req.query;
    const { id: callbackId } = req.query;
    try {
        const db = client.db();
        const callbackCollection = db.collection('callbackIds');
        const monthIdOne = await checkCallbackIdVerified(callbackId, callbackCollection);
        if (!monthIdOne) {
            res.status(404).json({msg: "Callback Id not found"});
            return;
        }
        const monthId = monthIdOne - 1;

        const tx = await contracts[monthId].airDropTo(airDropAddress);
        console.log("-- the transaction is:\n", tx);
        const receipt = await tx.wait();
        console.log("-- the receipt is:\n", receipt);
        const result = await callbackCollection.updateOne({callbackId: callbackId}, {$set: {callbackId: callbackId, verified: true, used: true, month: monthId}});
        if (result.matchedCount === 0) {
            console.log(callbackId, " not found in the database");
            throw new Error(`${callbackId} not found in the database.`);
        }
        console.log(result);
        res.status(200).json(receipt);
    }
    catch (error) {
        console.log("DB not connected/transaction error: ", error);
        res.status(500).json({msg: "DB not connnected/web3 error"});
    }
    return;
});

// Start the Express.js App
app.listen(port, async () => {
    try {
        await client.connect();
        console.log('Connected to mongoDB.');
    } catch (error) {
        console.error('Exiting. Failed to connect to mongoDB with error:', error, );
        process.exit(1);
    }
    console.log(`Express server is listening on port ${port}`)
});