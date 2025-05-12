## Requirements：

First, make sure download：
- Rust
- PostgreSQL
- Cargo

## How to run the server：

```shell
cd backend/SeaWalletBE
cargo run
```

## How to add package

```shell
cargo install sqlx-cli
cargo add [package]
sqlx migrate add create_customer_messages(can skip)
sqlx migrate run
```
## How to migrate

```shell
$Env:DATABASE_URL="your_postgresql_url"
```
### DB_URL: postgresql://<username>:<password>@<host>:<port>/<database>
How to find "<database>"
Download Postgresql
setup the initilize info with SQL shell
add psql.exe path to environment variable
```shell
psql -U postgres
\l
```