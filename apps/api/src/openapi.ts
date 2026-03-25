/**
 * CedarX OpenAPI 3.0 specification.
 *
 * Served at GET /api/docs/openapi.json
 * Rendered by Swagger UI at GET /api/docs
 */

export const openApiSpec = {
    openapi: "3.0.3",
    info: {
        title:       "CedarX Marketplace API",
        version:     "1.0.0",
        description:
            "REST API for browsing, listing, and buying tokenised real-world assets on CedarX.\n\n" +
            "## Authentication\n" +
            "Agent (programmatic) clients must supply their API key in the `X-CedarX-API-Key` header on every **POST** request.\n" +
            "Browser / frontend requests that carry no such header are allowed through without authentication.\n" +
            "GET endpoints are always public — no key required.\n\n" +
            "## Rate limiting\n" +
            "Each API key is limited to **100 requests per 60-second window** by default (configurable per key).\n" +
            "When the limit is exceeded the server responds with `429 Too Many Requests` and a `Retry-After` header.",
        contact: {
            name:  "CedarX",
            url:   "https://cedarx.xyz",
        },
    },

    servers: [
        { url: "/",       description: "This server" },
        { url: "http://localhost:3001", description: "Local dev" },
    ],

    components: {
        securitySchemes: {
            ApiKeyHeader: {
                type: "apiKey",
                in:   "header",
                name: "X-CedarX-API-Key",
                description:
                    "UUID API key for agent/programmatic access. " +
                    "Required on POST endpoints only. " +
                    "Omit (or send no header) for browser traffic.",
            },
        },

        schemas: {
            // ── Asset ──────────────────────────────────────────────────────────
            Asset: {
                type: "object",
                properties: {
                    id:               { type: "string", example: "fabrica:1:0xabc…:42" },
                    protocol:         { type: "string", enum: ["fabrica", "4k", "courtyard", "arianee"] },
                    contractAddress:  { type: "string", example: "0xabc…" },
                    tokenId:          { type: "string", example: "42", nullable: true },
                    tokenStandard:    { type: "string", enum: ["ERC-721", "ERC-1155", "ERC-20"] },
                    chain:            { type: "string", enum: ["ethereum", "polygon"], example: "ethereum" },
                    name:             { type: "string", example: "Fabrica Land #42" },
                    description:      { type: "string", nullable: true },
                    category:         { type: "string", enum: ["real-estate", "luxury-goods", "art", "collectibles"] },
                    imageUrl:         { type: "string", nullable: true },
                    details:          { type: "object", additionalProperties: true },
                    lastSalePrice:    { type: "number", nullable: true, description: "USDC value" },
                    currentListingPrice: { type: "number", nullable: true, description: "USDC value" },
                    currentListingPaymentTokenSymbol: { type: "string", nullable: true },
                    hasActiveListing: { type: "boolean" },
                    totalVolume:      { type: "number" },
                    externalUrl:      { type: "string", nullable: true },
                    lastUpdated:      { type: "string", format: "date-time" },
                },
            },

            PaginatedAssets: {
                type: "object",
                properties: {
                    data:       { type: "array", items: { "$ref": "#/components/schemas/Asset" } },
                    pagination: {
                        type: "object",
                        properties: {
                            total:   { type: "integer" },
                            page:    { type: "integer" },
                            limit:   { type: "integer" },
                            hasMore: { type: "boolean" },
                        },
                    },
                },
            },

            // ── Seaport order ─────────────────────────────────────────────────
            SeaportOrder: {
                type: "object",
                properties: {
                    orderHash:            { type: "string" },
                    assetId:              { type: "string" },
                    chain:                { type: "string", enum: ["ethereum", "polygon"] },
                    sellerAddress:        { type: "string" },
                    price:                { type: "string", description: "Raw units as decimal string" },
                    paymentToken:         { type: "string", description: "ERC-20 contract address; zero address for native ETH" },
                    paymentTokenSymbol:   { type: "string" },
                    paymentTokenDecimals: { type: "integer" },
                    priceUsd:             { type: "number", nullable: true },
                    expiration:           { type: "string", format: "date-time", nullable: true },
                    orderParameters:      { type: "object" },
                    source:               { type: "string", enum: ["opensea", "cedarx"] },
                    status:               { type: "string", enum: ["active", "filled", "cancelled", "expired"] },
                },
            },

            // ── Build-order response (POST /api/seaport/list) ─────────────────
            BuildOrderResponse: {
                type: "object",
                required: ["assetId", "orderParameters", "rawPrice", "paymentTokenAddress",
                           "paymentTokenSymbol", "paymentTokenDecimals", "expiration", "domain", "types"],
                properties: {
                    assetId: {
                        type: "string",
                        description: "CedarX asset ID derived from the token identifiers",
                        example: "courtyard:1:0xabc…:42",
                    },
                    orderParameters: {
                        type: "object",
                        description: "Unsigned Seaport OrderComponents. Pass verbatim to EIP-712 signTypedData as the `message` value.",
                    },
                    rawPrice: {
                        type: "string",
                        description: "Listing price in the payment token's smallest unit (e.g. wei for ETH, µUSDC for USDC).",
                        example: "1500000000000000000",
                    },
                    paymentTokenAddress: {
                        type: "string",
                        description: "ERC-20 token contract address; zero-address (0x000…0) for native ETH.",
                        example: "0x0000000000000000000000000000000000000000",
                    },
                    paymentTokenSymbol:   { type: "string", example: "ETH" },
                    paymentTokenDecimals: { type: "integer", example: 18 },
                    expiration: {
                        type: "string",
                        format: "date-time",
                        description: "ISO-8601 timestamp when the listing expires.",
                    },
                    domain: {
                        type: "object",
                        description: "EIP-712 domain for signTypedData.",
                        properties: {
                            name:              { type: "string", example: "Seaport" },
                            version:           { type: "string", example: "1.5" },
                            chainId:           { type: "integer", example: 1 },
                            verifyingContract: { type: "string", example: "0x00000000000000ADc04C56Bf30aC9d3c0aAF14dC" },
                        },
                    },
                    types: {
                        type: "object",
                        description: "EIP-712 named types for signTypedData (OrderComponents, OfferItem, ConsiderationItem).",
                    },
                },
            },

            // ── Submit listing (POST /api/seaport/listings) ───────────────────
            CreateListingRequest: {
                type: "object",
                required: ["assetId", "chain", "sellerAddress", "price", "paymentToken",
                           "paymentTokenSymbol", "paymentTokenDecimals", "orderParameters"],
                properties: {
                    assetId:              { type: "string" },
                    chain:                { type: "string", enum: ["ethereum", "polygon"] },
                    sellerAddress:        { type: "string", pattern: "^0x[0-9a-fA-F]{40}$" },
                    price:                { type: "string", description: "Raw units as decimal string" },
                    paymentToken:         { type: "string", description: "Payment token contract address" },
                    paymentTokenSymbol:   { type: "string" },
                    paymentTokenDecimals: { type: "integer", minimum: 0, maximum: 18 },
                    expiration:           { type: "string", format: "date-time" },
                    orderParameters: {
                        type: "object",
                        required: ["parameters", "signature"],
                        properties: {
                            parameters: { type: "object" },
                            signature:  { type: "string", description: "EIP-712 signature hex" },
                        },
                    },
                },
            },

            // ── Fulfill (POST /api/seaport/fulfill) ───────────────────────────
            FulfillRequest: {
                type: "object",
                required: ["orderHash", "chain", "buyerAddress"],
                properties: {
                    orderHash:    { type: "string" },
                    chain:        { type: "string", enum: ["ethereum", "polygon"] },
                    buyerAddress: { type: "string", pattern: "^0x[0-9a-fA-F]{40}$" },
                },
            },

            FulfillResponse: {
                type: "object",
                properties: {
                    to:             { type: "string", description: "Seaport contract address to call" },
                    approvalTarget: { type: "string", description: "Conduit address for ERC-20 approve()" },
                    data:           { type: "string", description: "ABI-encoded calldata (hex)" },
                    value:          { type: "string", description: "ETH value in wei (string); '0' for ERC-20 orders" },
                    token:          { type: "string", description: "ERC-20 token to pull from buyer; zero-address for ETH" },
                    amount:         { type: "string", description: "Total ERC-20 amount needed (decimal string)" },
                },
            },

            // ── Errors ────────────────────────────────────────────────────────
            Error: {
                type: "object",
                properties: {
                    error: { type: "string" },
                },
            },

            RateLimitError: {
                type: "object",
                properties: {
                    error:      { type: "string", example: "Rate limit exceeded" },
                    retryAfter: { type: "integer", description: "Seconds until the window resets" },
                    limit:      { type: "integer", description: "Requests allowed per window" },
                    window:     { type: "string", example: "60s" },
                },
            },
        },

        responses: {
            Unauthorized: {
                description: "Missing or invalid API key",
                content: { "application/json": { schema: { "$ref": "#/components/schemas/Error" } } },
            },
            RateLimited: {
                description: "Rate limit exceeded",
                headers: {
                    "Retry-After": {
                        schema: { type: "integer" },
                        description: "Seconds until the rate-limit window resets",
                    },
                },
                content: { "application/json": { schema: { "$ref": "#/components/schemas/RateLimitError" } } },
            },
        },
    },

    // ── Paths ─────────────────────────────────────────────────────────────────

    paths: {
        "/health": {
            get: {
                summary: "Health check",
                operationId: "getHealth",
                tags: ["System"],
                responses: {
                    "200": {
                        description: "Server is running",
                        content: {
                            "application/json": {
                                schema: {
                                    type: "object",
                                    properties: {
                                        status: { type: "string", example: "ok" },
                                        ts:     { type: "integer", description: "Unix ms timestamp" },
                                    },
                                },
                            },
                        },
                    },
                },
            },
        },

        "/api/assets": {
            get: {
                summary: "List assets",
                description: "Returns a paginated list of indexed real-world assets. Defaults to showing only assets with an active Seaport listing.",
                operationId: "listAssets",
                tags: ["Assets"],
                parameters: [
                    {
                        name: "category", in: "query", schema: {
                            type: "string",
                            enum: ["real-estate", "luxury-goods", "art", "collectibles"],
                        },
                    },
                    {
                        name: "protocol", in: "query", schema: {
                            type: "string",
                            enum: ["fabrica", "4k", "courtyard", "arianee"],
                        },
                    },
                    {
                        name: "chain", in: "query",
                        description: "Filter by blockchain network",
                        schema: { type: "string", enum: ["ethereum", "polygon"] },
                    },
                    {
                        name: "listingFilter", in: "query",
                        description: "\"listed\" = has active Seaport order (default), \"unlisted\" = no active order, \"all\" = both",
                        schema: { type: "string", enum: ["listed", "unlisted", "all"], default: "listed" },
                    },
                    {
                        name: "minPrice", in: "query",
                        description: "Minimum listing price in USDC",
                        schema: { type: "number", minimum: 0 },
                    },
                    {
                        name: "maxPrice", in: "query",
                        description: "Maximum listing price in USDC",
                        schema: { type: "number", minimum: 0 },
                    },
                    {
                        name: "sort", in: "query",
                        schema: { type: "string", enum: ["price_asc", "price_desc", "newest", "volume"] },
                    },
                    {
                        name: "search", in: "query",
                        description: "Full-text search against asset name and description",
                        schema: { type: "string", maxLength: 100 },
                    },
                    {
                        name: "page", in: "query",
                        schema: { type: "integer", minimum: 1, default: 1 },
                    },
                    {
                        name: "limit", in: "query",
                        schema: { type: "integer", minimum: 1, maximum: 100, default: 20 },
                    },
                ],
                responses: {
                    "200": {
                        description: "Paginated asset list",
                        content: { "application/json": { schema: { "$ref": "#/components/schemas/PaginatedAssets" } } },
                    },
                    "400": {
                        description: "Invalid query parameters",
                        content: { "application/json": { schema: { "$ref": "#/components/schemas/Error" } } },
                    },
                },
            },
        },

        "/api/assets/{id}": {
            get: {
                summary: "Get asset by ID",
                operationId: "getAsset",
                tags: ["Assets"],
                parameters: [
                    {
                        name: "id", in: "path", required: true,
                        schema: { type: "string" },
                        description: "CedarX asset ID, e.g. fabrica:1:0xabc…:42",
                    },
                ],
                responses: {
                    "200": {
                        description: "Asset details",
                        content: { "application/json": { schema: { "$ref": "#/components/schemas/Asset" } } },
                    },
                    "404": {
                        description: "Asset not found",
                        content: { "application/json": { schema: { "$ref": "#/components/schemas/Error" } } },
                    },
                },
            },
        },

        "/api/assets/{id}/history": {
            get: {
                summary: "Get asset trade history",
                operationId: "getAssetHistory",
                tags: ["Assets"],
                parameters: [
                    {
                        name: "id", in: "path", required: true,
                        schema: { type: "string" },
                    },
                    {
                        name: "limit", in: "query",
                        schema: { type: "integer", minimum: 1, maximum: 200, default: 50 },
                    },
                ],
                responses: {
                    "200": {
                        description: "Trade history",
                        content: {
                            "application/json": {
                                schema: {
                                    type: "object",
                                    properties: {
                                        data: { type: "array", items: { type: "object" } },
                                    },
                                },
                            },
                        },
                    },
                    "404": {
                        description: "Asset not found",
                        content: { "application/json": { schema: { "$ref": "#/components/schemas/Error" } } },
                    },
                },
            },
        },

        "/api/seaport/orders/{assetId}": {
            get: {
                summary: "Get active Seaport order for an asset",
                operationId: "getSeaportOrder",
                tags: ["Seaport"],
                parameters: [
                    {
                        name: "assetId", in: "path", required: true,
                        schema: { type: "string" },
                    },
                ],
                responses: {
                    "200": {
                        description: "Active order details",
                        content: { "application/json": { schema: { "$ref": "#/components/schemas/SeaportOrder" } } },
                    },
                    "404": {
                        description: "No active order for this asset",
                        content: { "application/json": { schema: { "$ref": "#/components/schemas/Error" } } },
                    },
                },
            },
        },

        "/api/seaport/list": {
            post: {
                summary: "Build unsigned Seaport order parameters (agent listing step 1)",
                description:
                    "Accepts listing intent from an agent and returns unsigned Seaport OrderComponents " +
                    "together with the EIP-712 `domain` and `types` objects ready for `eth_signTypedData_v4`.\n\n" +
                    "**Workflow:**\n" +
                    "1. Call this endpoint to obtain `orderParameters`, `domain`, and `types`.\n" +
                    "2. Sign with `eth_signTypedData_v4` using the seller's key: `sign({ domain, types, primaryType: 'OrderComponents', message: orderParameters })`.\n" +
                    "3. Submit the signed order to `POST /api/seaport/listings` with `{ parameters: orderParameters, signature }`.",
                operationId: "buildSeaportOrder",
                tags: ["Seaport"],
                security: [{ ApiKeyHeader: [] }],
                requestBody: {
                    required: true,
                    content: {
                        "application/json": {
                            schema: {
                                type: "object",
                                required: ["tokenContract", "tokenId", "tokenStandard", "chain",
                                           "price", "paymentToken", "duration", "sellerAddress", "counter"],
                                properties: {
                                    tokenContract: {
                                        type: "string",
                                        pattern: "^0x[0-9a-fA-F]{40}$",
                                        description: "NFT contract address",
                                        example: "0xabc…",
                                    },
                                    tokenId: {
                                        type: "string",
                                        description: "NFT token ID",
                                        example: "42",
                                    },
                                    tokenStandard: {
                                        type: "string",
                                        enum: ["ERC-721", "ERC-1155"],
                                    },
                                    chain: {
                                        type: "string",
                                        enum: ["ethereum", "polygon"],
                                    },
                                    price: {
                                        type: "string",
                                        description: "Human-readable listing price (e.g. \"1.5\" for 1.5 ETH)",
                                        example: "1.5",
                                    },
                                    paymentToken: {
                                        type: "string",
                                        description: "Payment token symbol. Supported: ETH, WETH, USDC on Ethereum; USDC, WETH on Polygon.",
                                        enum: ["ETH", "WETH", "USDC"],
                                    },
                                    duration: {
                                        type: "integer",
                                        minimum: 1,
                                        maximum: 365,
                                        description: "Listing duration in days",
                                        example: 7,
                                    },
                                    sellerAddress: {
                                        type: "string",
                                        pattern: "^0x[0-9a-fA-F]{40}$",
                                        description: "Seller's wallet address (becomes the Seaport offerer)",
                                    },
                                    counter: {
                                        type: "integer",
                                        minimum: 0,
                                        description: "Seller's current Seaport counter (fetch from the Seaport contract's getCounter(offerer) view function)",
                                        example: 0,
                                    },
                                },
                            },
                        },
                    },
                },
                responses: {
                    "200": {
                        description: "Unsigned order parameters ready for EIP-712 signing",
                        content: { "application/json": { schema: { "$ref": "#/components/schemas/BuildOrderResponse" } } },
                    },
                    "400": {
                        description: "Invalid request body",
                        content: { "application/json": { schema: { "$ref": "#/components/schemas/Error" } } },
                    },
                    "401": { "$ref": "#/components/responses/Unauthorized" },
                    "429": { "$ref": "#/components/responses/RateLimited" },
                },
            },
        },

        "/api/seaport/listings": {
            post: {
                summary: "Submit a signed Seaport listing (agent listing step 2)",
                description:
                    "Accepts a signed Seaport order from the seller/agent, stores it locally, " +
                    "and posts it to OpenSea so it appears on the OpenSea marketplace.",
                operationId: "createSeaportListing",
                tags: ["Seaport"],
                security: [{ ApiKeyHeader: [] }],
                requestBody: {
                    required: true,
                    content: { "application/json": { schema: { "$ref": "#/components/schemas/CreateListingRequest" } } },
                },
                responses: {
                    "201": {
                        description: "Listing stored (and forwarded to OpenSea if configured)",
                        content: {
                            "application/json": {
                                schema: {
                                    type: "object",
                                    properties: {
                                        orderHash:   { type: "string" },
                                        openSeaError: { type: "string", nullable: true, description: "Non-null if OpenSea submission failed; local storage still succeeded" },
                                        feeWallet:   { type: "string", nullable: true },
                                    },
                                },
                            },
                        },
                    },
                    "400": {
                        description: "Invalid body",
                        content: { "application/json": { schema: { "$ref": "#/components/schemas/Error" } } },
                    },
                    "401": { "$ref": "#/components/responses/Unauthorized" },
                    "429": { "$ref": "#/components/responses/RateLimited" },
                },
            },
        },

        "/api/seaport/fulfill": {
            post: {
                summary: "Get fulfillment transaction for a Seaport order",
                description:
                    "Proxies to OpenSea's fulfillment_data API and returns ABI-encoded calldata " +
                    "ready for the buyer to submit on-chain via `eth_sendTransaction`.",
                operationId: "fulfillSeaportOrder",
                tags: ["Seaport"],
                security: [{ ApiKeyHeader: [] }],
                requestBody: {
                    required: true,
                    content: { "application/json": { schema: { "$ref": "#/components/schemas/FulfillRequest" } } },
                },
                responses: {
                    "200": {
                        description: "Fulfillment transaction data",
                        content: { "application/json": { schema: { "$ref": "#/components/schemas/FulfillResponse" } } },
                    },
                    "400": {
                        description: "Invalid body",
                        content: { "application/json": { schema: { "$ref": "#/components/schemas/Error" } } },
                    },
                    "401": { "$ref": "#/components/responses/Unauthorized" },
                    "410": {
                        description: "Listing has expired or been cancelled",
                        content: { "application/json": { schema: { "$ref": "#/components/schemas/Error" } } },
                    },
                    "429": { "$ref": "#/components/responses/RateLimited" },
                    "502": {
                        description: "OpenSea API error",
                        content: { "application/json": { schema: { "$ref": "#/components/schemas/Error" } } },
                    },
                    "503": {
                        description: "OpenSea API not configured on this server",
                        content: { "application/json": { schema: { "$ref": "#/components/schemas/Error" } } },
                    },
                },
            },
        },
    },

    tags: [
        { name: "Assets",  description: "Browse and search indexed real-world asset NFTs" },
        { name: "Seaport", description: "Seaport v1.5 listing, fulfillment, and order management" },
        { name: "System",  description: "Server health and meta endpoints" },
    ],
} as const;
