import pg from "pg";

export async function seedDb(pgClient) {
    try {
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

        setUpTriggers(pgClient);
    } catch (err) {
        console.error(err);
    }
}

export async function getAllProductsFromDb(pgClient) {
    let res = null;
    try {
        res = await pgClient.query(`
            SELECT * FROM Products ORDER BY id ASC;
        `);
    } catch (err) {
        console.error(err);
    }
    return res.rows;
}

export function createPgConnection() {
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
                    perform pg_notify('pubchanel', '');
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
