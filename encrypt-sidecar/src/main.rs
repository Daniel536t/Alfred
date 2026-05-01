use encrypt_dsl::prelude::encrypt_fn;
use encrypt_solana_client::grpc::{EncryptClient, TypedInput};
use encrypt_types::encrypted::{EBool, EUint64, Uint64};
use serde::{Deserialize, Serialize};
use std::sync::Arc;
use tokio::sync::Mutex;
use warp::Filter;

const ENCRYPT_PROGRAM_ID: &str = "4ebfzWdKnrnGseuQpezXdG8yCdHqwQ1SSBHD3bWArND8";
const GRPC_ENDPOINT: &str = "https://pre-alpha-dev-1.encrypt.ika-network.net:443";

#[derive(Deserialize)]
struct EncryptRequest {
    key: String,
    value: String,
}

#[derive(Serialize)]
struct EncryptResponse {
    success: bool,
    ciphertext_id: Option<String>,
    message: String,
}

// FHE function: store an encrypted key-value pair
#[encrypt_fn]
fn store_intent(key: EUint64, value: EUint64) -> EUint64 {
    // In pre-alpha, just returns the value (placeholder for real FHE logic)
    // In Alpha 1: encrypted storage with access control
    value
}

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    let client = Arc::new(Mutex::new(
        EncryptClient::connect(GRPC_ENDPOINT).await?
    ));

    let encrypt_route = warp::path!("encrypt")
        .and(warp::post())
        .and(warp::body::json())
        .and(with_client(client))
        .and_then(handle_encrypt);

    println!("🔐 Encrypt Sidecar running on http://127.0.0.1:3030");
    warp::serve(encrypt_route).run(([127, 0, 0, 1], 3030)).await;
    Ok(())
}

fn with_client(
    client: Arc<Mutex<EncryptClient>>,
) -> impl Filter<Extract = (Arc<Mutex<EncryptClient>>,), Error = std::convert::Infallible> + Clone {
    warp::any().map(move || client.clone())
}

async fn handle_encrypt(
    body: EncryptRequest,
    client: Arc<Mutex<EncryptClient>>,
) -> Result<impl warp::Reply, warp::Rejection> {
    let client = client.lock().await;

    // Create encrypted input from the key
    let key_bytes = body.key.as_bytes();
    let key_u64 = key_bytes.iter().fold(0u64, |acc, &b| acc.wrapping_mul(256).wrapping_add(b as u64));

    let value_bytes = body.value.as_bytes();
    let value_u64 = value_bytes.iter().fold(0u64, |acc, &b| acc.wrapping_mul(256).wrapping_add(b as u64));

    // Submit to Encrypt devnet
    let key_ct = client
        .create_input::<Uint64>(key_u64, &ENCRYPT_PROGRAM_ID.parse().unwrap(), &[])
        .await;

    match key_ct {
        Ok(ct) => {
            let response = EncryptResponse {
                success: true,
                ciphertext_id: Some(hex::encode(ct.digest)),
                message: format!("Encrypted intent '{}' stored on-chain", body.key),
            };
            Ok(warp::reply::json(&response))
        }
        Err(e) => {
            let response = EncryptResponse {
                success: false,
                ciphertext_id: None,
                message: format!("Encrypt gRPC error: {}", e),
            };
            Ok(warp::reply::json(&response))
        }
    }
}
