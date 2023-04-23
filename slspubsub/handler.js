const { DynamoDBClient } = require("@aws-sdk/client-dynamodb");
const {
    DynamoDBDocumentClient,
    PutCommand,
    DeleteCommand,
    ScanCommand,
} = require("@aws-sdk/lib-dynamodb");
const {
    ApiGatewayManagementApiClient,
    PostToConnectionCommand,
} = require("@aws-sdk/client-apigatewaymanagementapi");
const pg = require("pg");
const client = new DynamoDBClient({ region: "us-east-1" });
async function websocket(event, context) {
    const {
        requestContext: { routeKey, connectionId },
    } = event;
    const docClient = DynamoDBDocumentClient.from(client);

    switch (routeKey) {
        case "$connect":
            const putCommand = new PutCommand({
                TableName: "connectionsTable",
                Item: {
                    connectionId,
                },
            });
            await docClient.send(putCommand);
            break;
        case "$disconnect":
            const deleteCommand = new DeleteCommand({
                TableName: "connectionsTable",
                Key: {
                    connectionId,
                },
            });
            await docClient.send(deleteCommand);

            break;
    }

    return {
        statusCode: 200,
    };
}

async function onTableChange(event, context) {
    const connectionUrl =
        "https://" +
        process.env.API_URL +
        ".execute-api.us-east-1.amazonaws.com/dev/";
    const gtwClient = new ApiGatewayManagementApiClient({
        region: "us-east-1",
        endpoint: connectionUrl,
    });
    const scanCommand = new ScanCommand({
        TableName: "connectionsTable",
    });
    const docClient = DynamoDBDocumentClient.from(client);
    const connectionIds = await docClient.send(scanCommand);

    if (!connectionIds) {
        return;
    }
    console.log("URL", connectionUrl);
    const connectionArr = connectionIds.Items?.map((item) => {
        return item.connectionId;
    });

    connectionArr.forEach(async (item) => {
        const input = {
            Data: "Table changed",
            ConnectionId: item,
        };
        const command = new PostToConnectionCommand(input);
        await gtwClient.send(command);
    });
    return {
        statusCode: 200,
        body: JSON.stringify(connectionArr),
    };
}

async function getProducts() {
    const Client = pg.Client;
    const pgClient = new Client({
        user: process.env.PGUSER,
        password: process.env.PGPASSWORD,
        database: process.env.PGDATABASE,
        port: 5432,
        host: process.env.PGHOST,
    });
    await pgClient.connect();
    let res = null;
    try {
        res = await pgClient.query(`
            SELECT * FROM Products ORDER BY id ASC;
        `);
    } catch (err) {
        console.error(err);
    }
    return {
        statusCode: 200,
        body: JSON.stringify(res.rows),

        headers: {
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Credentials": true,
        },
    };
}

module.exports = {
    websocket,
    onTableChange,
    getProducts,
};
