-- CreateTable
CREATE TABLE "Contract" (
    "address" TEXT NOT NULL PRIMARY KEY,
    "firstSeenBlock" INTEGER,
    "lastSyncedBlock" INTEGER,
    "codeHash" TEXT,
    "abiJson" TEXT,
    "abiSource" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Tx" (
    "txHash" TEXT NOT NULL PRIMARY KEY,
    "blockNumber" INTEGER,
    "fromAddr" TEXT,
    "toAddr" TEXT,
    "methodSig" TEXT,
    "decodedJson" TEXT,
    "summaryText" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "Event" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "address" TEXT NOT NULL,
    "blockNumber" INTEGER,
    "txHash" TEXT NOT NULL,
    "topic0" TEXT,
    "eventName" TEXT,
    "decodedJson" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "Alert" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "address" TEXT NOT NULL,
    "txHash" TEXT,
    "type" TEXT NOT NULL,
    "severity" TEXT NOT NULL,
    "detailsJson" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
