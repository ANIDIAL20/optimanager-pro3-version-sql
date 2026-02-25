require('dotenv').config({ path: '.env.local' });
const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

const execute = async () => {
  try {
    await pool.query(`select "sales"."id", "sales"."firebase_id", "sales"."user_id", "sales"."sale_number", "sales"."transaction_number", "sales"."client_id", "sales"."client_name", "sales"."client_phone", "sales"."client_mutuelle", "sales"."client_address", "sales"."total_ht", "sales"."total_tva", "sales"."total_ttc", "sales"."total_net", "sales"."total_paye", "sales"."reste_a_payer", "sales"."status", "sales"."delivery_status", "sales"."payment_method", "sales"."type", "sales"."is_declared", "sales"."is_official_invoice", "sales"."comptabilite_status", "sales"."items", "sales"."payment_history", "sales"."prescription_snapshot", "sales"."last_payment_date", "sales"."template_version_used", "sales"."template_snapshot", "sales"."document_settings_snapshot", "sales"."notes", "sales"."date", "sales"."created_at", "sales"."updated_at", "sales_client"."data" as "client" from "sales" "sales" left join lateral (select json_build_array("sales_client"."id", "sales_client"."full_name", "sales_client"."phone", "sales_client"."email", "sales_client"."mutuelle", "sales_client"."address") as "data" from (select * from "clients" "sales_client" where "sales_client"."id" = "sales"."client_id" limit $1) "sales_client") "sales_client" on true where "sales"."user_id" = $2 order by "sales"."created_at" desc`, [1, 'd7daf565-32ff-482d-b798-63120fd75e66']);
    console.log("Success!");
  } catch(e) {
    console.error("POSTGRES DB ERROR:", e.message);
  }
  process.exit(0);
}
execute();
