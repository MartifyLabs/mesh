use aiken/collection/list
use cardano/address.{Address}
use cardano/assets.{add, flatten, from_asset, from_lovelace}
use cardano/transaction.{
  InlineDatum, Input, Output, OutputReference, Transaction, find_input,
}
use cocktail.{
  get_all_value_to, inputs_at_with_policy, outputs_at_with_policy, value_geq,
}
use mocktail.{
  complete, mint, mock_policy_id, mock_pub_key_address, mock_pub_key_hash,
  mock_script_address, mock_tx_hash, mock_utxo_ref, mocktail_tx,
  required_signer_hash, tx_in, tx_in_inline_datum,
}

pub type OracleDatum {
  count: Int,
  lovelace_price: Int,
  fee_address: Address,
}

pub type OracleRedeemer {
  MintPlutusNFT
  StopOracle
}

validator oracle {
  spend(
    datum_opt: Option<OracleDatum>,
    redeemer: OracleRedeemer,
    input: OutputReference,
    tx: Transaction,
  ) {
    let Transaction { inputs, outputs, .. } = tx
    expect Some(OracleDatum { count, lovelace_price, fee_address }) = datum_opt
    expect Some(own_input) = find_input(inputs, input)
    expect [(oracle_nft_policy, _, _)] =
      list.filter(flatten(own_input.output.value), fn(x) { x.1st != "" })
    let own_address = own_input.output.address
    when
      (
        redeemer,
        inputs_at_with_policy(inputs, own_address, oracle_nft_policy),
        outputs_at_with_policy(outputs, own_address, oracle_nft_policy),
      )
    is {
      (MintPlutusNFT, [_], [only_output]) -> {
        let is_output_value_clean = list.length(flatten(only_output.value)) == 2
        let is_count_updated =
          only_output.datum == InlineDatum(
            OracleDatum { count: count + 1, lovelace_price, fee_address },
          )
        let is_fee_paid =
          get_all_value_to(outputs, fee_address)
            |> value_geq(from_lovelace(lovelace_price))
        is_output_value_clean? && is_count_updated? && is_fee_paid?
      }
      // (StopOracle, [_], _) -> {
      //   let is_oracle_nft_burnt =
      //     only_minted_token(mint, oracle_nft_policy, "", -1)
      //   let owner_key = address_payment_key(fee_address)
      //   let is_owner_signed = key_signed(extra_signatories, owner_key)
      //   is_oracle_nft_burnt? && is_owner_signed?
      // }
      _ -> False
    }
  }

  else(_) {
    fail
  }
}

type StopOracleTestCase {
  is_oracle_nft_burnt: Bool,
  is_owner_signed: Bool,
}

fn mock_stop_oracle_tx(test_case: StopOracleTestCase) -> Transaction {
  let StopOracleTestCase { is_oracle_nft_burnt, is_owner_signed } = test_case

  let input_value =
    from_asset(mock_policy_id(0), "", 1) |> add("", "", 2_000_000)

  mocktail_tx()
    |> tx_in(True, mock_tx_hash(0), 0, input_value, mock_script_address(0, None))
    |> tx_in_inline_datum(
        True,
        OracleDatum {
          count: 0,
          lovelace_price: 1_000_000,
          fee_address: mock_pub_key_address(0, None),
        },
      )
    |> mint(is_oracle_nft_burnt, -1, mock_policy_id(0), "")
    |> required_signer_hash(is_owner_signed, mock_pub_key_hash(0))
    |> complete()
}

test permanent_lock() {
  let datum =
    OracleDatum {
      count: 0,
      lovelace_price: 1_000_000,
      fee_address: mock_pub_key_address(0, None),
    }
  let redeemer = StopOracle
  let tx =
    mock_stop_oracle_tx(
      StopOracleTestCase { is_oracle_nft_burnt: True, is_owner_signed: True },
    )

  !oracle.spend(Some(datum), redeemer, mock_utxo_ref(0, 0), tx)
}
