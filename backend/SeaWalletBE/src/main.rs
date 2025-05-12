use actix_web::{web, App, HttpResponse, HttpServer, Responder};

use chrono::{DateTime, Utc};
use dotenv::dotenv;
use serde::{Deserialize, Serialize};
use sqlx::postgres::{PgPool, PgPoolOptions};
use sqlx::types::Uuid; // Keep this import
use std::env;

// 定義客服訊息模型
#[derive(Debug, Serialize, Deserialize, sqlx::FromRow)] // Add sqlx::FromRow for query_as!
struct CustomerMessage {
    // Note: id is Option<Uuid> because query_as might select rows
    // where id could hypothetically be null if the query changed,
    // OR more commonly, to allow constructing this struct before insertion.
    // Since the DB column is PRIMARY KEY (non-null), fetches will always have Some(uuid).
    id: Option<Uuid>,
    customer_name: String,
    email: String,
    message: String,
    // created_at is Option because the DB column is nullable (even with default)
    created_at: Option<DateTime<Utc>>,
}

// 新增客服訊息請求模型
#[derive(Debug, Deserialize)]
struct AddMessageRequest {
    customer_name: String,
    email: String,
    message: String,
}

// 處理新增客服訊息請求
async fn add_message(
    db_pool: web::Data<PgPool>,
    message: web::Json<AddMessageRequest>,
) -> impl Responder {
    // Corrected query! override: Specify the base type for created_at.
    // sqlx knows the DB column is nullable, so record.created_at will be Option<DateTime<Utc>>.
    // id is non-nullable in DB, so record.id will be Uuid.
    let result = sqlx::query!(
        r#"
        INSERT INTO customer_messages (customer_name, email, message)
        VALUES ($1, $2, $3)
        RETURNING id as "id: Uuid", created_at as "created_at: chrono::DateTime<chrono::Utc>"
        "#,
        message.customer_name,
        message.email,
        message.message
    )
    .fetch_one(db_pool.get_ref())
    .await;

    match result {
        Ok(record) => {
            // record.id is Uuid (from override)
            // record.created_at is Option<DateTime<Utc>> (inferred nullability + override base type)
            let customer_message = CustomerMessage {
                id: Some(record.id), // Wrap the Uuid in Some() to match struct field
                customer_name: message.customer_name.clone(),
                email: message.email.clone(),
                message: message.message.clone(),
                created_at: record.created_at, // This now matches Option<DateTime<Utc>>
            };
            HttpResponse::Ok().json(customer_message)
        }
        Err(e) => {
            eprintln!("Database error: {}", e);
            HttpResponse::InternalServerError().json("無法保存訊息")
        }
    }
}

// 獲取所有客服訊息
async fn get_messages(db_pool: web::Data<PgPool>) -> impl Responder {
    // Add explicit type override for 'id' matching the DB column type
    let result = sqlx::query_as!(
        CustomerMessage,
        r#"
        SELECT id as "id: Uuid", customer_name, email, message, created_at
        FROM customer_messages
        ORDER BY created_at DESC
        "#,
        // This tells sqlx the DB column is Uuid.
        // It will then correctly map it to Option<Uuid> in the struct.
    )
    .fetch_all(db_pool.get_ref())
    .await;

    match result {
        Ok(messages) => HttpResponse::Ok().json(messages),
        Err(e) => {
            eprintln!("Database error: {}", e);
            HttpResponse::InternalServerError().json("無法獲取訊息列表")
        }
    }
}

// 應用程式配置和啟動
#[actix_web::main]
async fn main() -> std::io::Result<()> {
    // 載入環境變數
    dotenv().ok();

    // 設定日誌
    env_logger::init_from_env(env_logger::Env::default().default_filter_or("info"));

    // 取得資料庫URL
    let database_url = env::var("DATABASE_URL").expect("DATABASE_URL必須設定");

    // 建立資料庫連接池
    let pool = PgPoolOptions::new()
        .max_connections(5)
        .connect(&database_url)
        .await
        .expect("無法連接到資料庫");

    // --- Execute database initialization queries separately ---

    // 1. Ensure pgcrypto extension is enabled
    sqlx::query(
        r#"CREATE EXTENSION IF NOT EXISTS "pgcrypto";"#,
    )
    .execute(&pool)
    .await
    .expect("無法啟用 pgcrypto 擴展"); // More specific error

    // 2. Create the table
    sqlx::query(
        r#"
        CREATE TABLE IF NOT EXISTS customer_messages (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            customer_name VARCHAR(255) NOT NULL,
            email VARCHAR(255) NOT NULL,
            message TEXT NOT NULL,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        );
        "#,
    )
    .execute(&pool)
    .await
    .expect("無法創建 customer_messages 資料表"); // More specific error

    // --- End of database initialization ---

    println!("啟動服務器在 http://127.0.0.1:8080");

    // 啟動HTTP服務器
    HttpServer::new(move || {
        App::new()
            .app_data(web::Data::new(pool.clone()))
            .service(
                web::scope("/api")
                    .route("/messages", web::post().to(add_message))
                    .route("/messages", web::get().to(get_messages)),
            )
    })
    .bind("127.0.0.1:8080")?
    .run()
    .await
}