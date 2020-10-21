cargo install --git https://github.com/paritytech/cargo-contract --tag v0.6.0 cargo-contract

rustup component add rust-src --toolchain nightly-2020-06-01

cargo +nightly-2020-06-01 contract build