use aiken/collection/list
use aiken/primitive/bytearray
use cardano/address.{Address}
use cardano/assets.{Value, add, from_asset, from_lovelace, merge, zero}
use cardano/transaction.{Transaction}
use cocktail.{convert_int_to_bytes}
use escrow.{ActiveEscrow, CompleteTrade, EscrowDatum, Initiation, MValue}
use mocktail.{
  complete, mocktail_tx, required_signer_hash, tx_in, tx_in_inline_datum, tx_out,
}
use mocktail/virgin_address.{mock_pub_key_address, mock_script_address}
use mocktail/virgin_key_hash.{mock_pub_key_hash}
use mocktail/virgin_output_reference.{mock_tx_hash, mock_utxo_ref}

fn test_lovelace() -> MValue {
  [Pair("", [Pair("", 2_000_000)])]
}

fn test_value() -> MValue {
  [Pair("test", [Pair("test", 1)])]
}

fn initiator_address() -> Address {
  mock_pub_key_address(0, None)
}

fn initiation_datum() -> EscrowDatum {
  let initiator_assets: MValue = test_lovelace()
  Initiation { initiator: initiator_address(), initiator_assets }
}

fn get_complete_test_tx() -> Transaction {
  let input_datum =
    ActiveEscrow {
      initiator: mock_pub_key_address(0, None),
      initiator_assets: test_lovelace(),
      recipient: mock_pub_key_address(1, None),
      recipient_assets: test_value(),
    }

  let spam_value =
    fn(spam_count: Int) -> Value {
      list.range(0, spam_count)
        |> list.foldr(
            zero,
            fn(current_count, acc) {
              from_asset(
                bytearray.concat(
                  "spam_token",
                  convert_int_to_bytes(current_count),
                ),
                "",
                1,
              )
                |> merge(acc)
            },
          )
    }

  let spam_token_value = spam_value(150)

  mocktail_tx()
    |> required_signer_hash(True, mock_pub_key_hash(0))
    |> required_signer_hash(True, mock_pub_key_hash(1))
    |> tx_in(
        True,
        mock_tx_hash(0),
        1,
        from_lovelace(2_000_000)
          |> add("test", "test", 1)
          |> merge(spam_token_value),
        mock_script_address(0, None),
      )
    |> tx_in_inline_datum(True, input_datum)
    |> tx_out(True, mock_pub_key_address(0, None), from_asset("test", "test", 1))
    |> tx_out(True, mock_pub_key_address(1, None), from_lovelace(2_000_000))
    |> complete()
}

test excessive_ex_unit_with_unbound_value() {
  let output_reference = mock_utxo_ref(0, 1)
  let unused_mock_datum = Some(initiation_datum())
  let redeemer = CompleteTrade
  let tx = get_complete_test_tx()
  escrow.escrow.spend(unused_mock_datum, redeemer, output_reference, tx)
}
