"use strict";

const express = require("express");
const { verifyMessage, hashMessage, SigningKey } = require("ethers");

const { addBlock, getChain } = require("../services/blockchainService");

const router = express.Router();

router.get("/status", (request, response) => {
  response.json({
    success: true,
    message: "Notebook API Working",
  });
});

router.get("/chain", (request, response) => {
  try {
    const blockchain = getChain();

    return response.json(blockchain.chain);
  } catch (error) {
    return response.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

router.post("/add-block", async (request, response) => {
  try {
    const newBlock = await addBlock({
      message: request.body?.message,
      signature: request.body?.signature,
    });

    return response.status(201).json({
      success: true,
      message: "Block added successfully.",
      index: newBlock.index,
      block: newBlock,
    });
  } catch (error) {
    const isClientError =
      error.message === "Message is required." ||
      error.message === "Signature is required." ||
      error.message === "Invalid Ethereum signature.";

    return response.status(isClientError ? 400 : 500).json({
      success: false,
      error: error.message,
    });
  }
});

router.post("/verify-signature", (request, response) => {
  try {
    const message =
      typeof request.body?.message === "string" ? request.body.message : "";

    const signature =
      typeof request.body?.signature === "string"
        ? request.body.signature.trim()
        : "";

    if (!message || !signature) {
      return response.status(400).json({
        success: false,
        valid: false,
        error: "Message and signature are required.",
      });
    }

    const recoveredAddress = verifyMessage(message, signature);

    const recoveredPublicKey = SigningKey.recoverPublicKey(
      hashMessage(message),
      signature
    );

    return response.json({
      success: true,
      valid: true,
      recovered_address: recoveredAddress,
      recovered_public_key: recoveredPublicKey,
      message,
    });
  } catch {
    return response.status(400).json({
      success: false,
      valid: false,
      error: "Signature is invalid for this message.",
    });
  }
});

module.exports = router;
