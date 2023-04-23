const pg = require("pg");
require("dotenv").config();
async function seedDb(pgClient) {
    try {
        console.log("STARTED SEEDING");
        await pgClient.query(`
        CREATE TABLE IF NOT EXISTS Products (
            id serial primary key,
            name varchar(255),
            price int
        );`);

        const itemsCount = await pgClient.query(`
            SELECT COUNT(*) FROM Products;
        `);

        if (itemsCount.rows[0].count === "0") {
            await pgClient.query(`
            INSERT INTO products (name, price)
            VALUES
              ('Organic Cotton T-Shirt', 15),
              ('Bluetooth Headphones', 49),
              ('Stainless Steel Water Bottle', 20),
              ('Wireless Keyboard and Mouse', 29),
              ('Natural Soy Wax Candle', 12),
              ('Smartphone Tripod Stand', 9),
              ('Glass Meal Prep Containers', 24),
              ('Organic Herbal Tea Sampler', 8),
              ('Reusable Silicone Food Bags', 17),
              ('Premium Yoga Mat', 35),
              ('Non-Stick Ceramic Cookware Set', 89),
              ('Electric Handheld Milk Frother', 11),
              ('Memory Foam Neck Pillow', 18),
              ('Digital Kitchen Scale', 14),
              ('Portable Outdoor Camping Chair', 27);
            `);
        }
        console.log("SEEDING ENDED");
    } catch (err) {
        console.error(err);
    }
}

function createPgConnection() {
    const Client = pg.Client;
    return new Client();
}

async function setUpTriggers(pgClient) {
    try {
        await pgClient.query(`
            DROP TRIGGER IF EXISTS recalculate_cart_trigger
            ON Products;
        `);

        await pgClient.query(`
            create or replace function recalculate_cart()
            returns trigger 
            as $$
                begin 
                perform aws_lambda.invoke(aws_commons.create_lambda_function_arn('${process.env.lambda}', 'us-east-1'), '{"body": "Hello from Postgres!"}'::json );
                    return new;
                end
            $$ language plpgsql VOLATILE
        `);

        await pgClient.query(`
            create  trigger recalculate_cart_trigger
            AFTER UPDATE ON Products
            EXECUTE procedure  recalculate_cart();
        `);
    } catch (e) {
        console.error(e);
    }
}

async function installExtensions(pgClient) {
    try {
        await pgClient.query(`CREATE EXTENSION IF NOT EXISTS aws_lambda CASCADE;
        `);
    } catch (err) {
        console.log(err);
    }
}

(async function () {
    const conn = createPgConnection();
    await conn.connect();
    await setUpTriggers(conn);
    await seedDb(conn);
    await installExtensions(conn);
    console.log("END");
})();
