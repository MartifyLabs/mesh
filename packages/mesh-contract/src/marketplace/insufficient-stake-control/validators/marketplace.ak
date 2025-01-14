use aiken/collection/list
use aiken/crypto.{VerificationKeyHash}
use cardano/address.{Address}
use cardano/assets.{Value, add, from_lovelace, lovelace_of, merge, zero}
use cardano/transaction.{
  InlineDatum, Input, Output, OutputReference, Transaction, find_input,
}
use cocktail.{
  address_pub_key, get_all_value_to, inputs_at, key_signed, value_geq,
}
use mocktail.{
  add_input, complete, mock_policy_id, mock_pub_key_address, mock_pub_key_hash,
  mock_script_address, mock_script_output, mock_utxo_ref, mocktail_tx, tx_out,
}
use mocktail/virgin_address.{mock_pub_key_stake_cred}

pub type MarketplaceDatum {
  MarketplaceDatum {
    seller: Address,
    price: Int,
    policy: ByteArray,
    tokenName: ByteArray,
  }
}

pub type MarketplaceRedeemer {
  Buy
  Close
}

pub fn get_all_value_to_key_hash(
  outputs: List<Output>,
  recipient: VerificationKeyHash,
) -> Value {
  list.foldr(
    outputs,
    zero,
    fn(output, acc_value) {
      expect Some(pub_key) = address_pub_key(output.address)
      if pub_key == recipient {
        merge(acc_value, output.value)
      } else {
        acc_value
      }
    },
  )
}

validator marketplace(
  owner: VerificationKeyHash,
  fee_percentage_basis_point: Int,
) {
  spend(
    datum_opt: Option<MarketplaceDatum>,
    redeemer: MarketplaceRedeemer,
    input: OutputReference,
    tx: Transaction,
  ) {
    expect Some(datum) = datum_opt
    when redeemer is {
      Buy -> {
        expect Some(own_input) = find_input(tx.inputs, input)
        let own_address = own_input.output.address
        let is_only_one_input_from_script =
          when inputs_at(tx.inputs, own_address) is {
            [_] -> True
            _ -> False
          }

        let is_proceed_paid =
          get_all_value_to(tx.outputs, datum.seller)
            |> value_geq(
                from_lovelace(datum.price + lovelace_of(own_input.output.value)),
              )
        let is_fee_paid =
          get_all_value_to_key_hash(tx.outputs, owner)
            |> value_geq(
                from_lovelace(datum.price * fee_percentage_basis_point / 10000),
              )
        is_only_one_input_from_script && is_fee_paid && is_proceed_paid
      }
      Close -> {
        expect Some(pub_key) = address_pub_key(datum.seller)
        key_signed(tx.extra_signatories, pub_key)
      }
    }
  }

  else(_) {
    fail
  }
}

type BuyTestCase {
  is_proceed_paid_to_malicious_stake_key: Bool,
}

fn mock_datum() -> MarketplaceDatum {
  MarketplaceDatum {
    seller: mock_pub_key_address(1, None),
    price: 200_000_000,
    policy: mock_policy_id(0),
    tokenName: "Test Token",
  }
}

fn get_buy_test_tx(test_case: BuyTestCase) -> Transaction {
  let BuyTestCase { is_proceed_paid_to_malicious_stake_key } = test_case

  let input_value =
    from_lovelace(2_000_000) |> add(mock_policy_id(0), "Test Token", 1)

  let recipient_address =
    if is_proceed_paid_to_malicious_stake_key {
      mock_pub_key_address(1, None)
    } else {
      mock_pub_key_address(1, Some(mock_pub_key_stake_cred(99)))
    }

  mocktail_tx()
    |> tx_out(True, mock_pub_key_address(0, None), from_lovelace(2_000_000))
    |> tx_out(True, recipient_address, from_lovelace(202_000_000))
    |> complete()
    |> add_input(
        True,
        Input {
          output_reference: mock_utxo_ref(0, 1),
          output: mock_script_output(
            mock_script_address(0, None),
            input_value,
            InlineDatum(Some(mock_datum())),
          ),
        },
      )
}

test success_buy_with_insufficient_stake_control() {
  let output_reference = mock_utxo_ref(0, 1)
  let redeemer = Buy
  let test_case = BuyTestCase { is_proceed_paid_to_malicious_stake_key: True }

  let tx = get_buy_test_tx(test_case)
  marketplace.spend(
    mock_pub_key_hash(0),
    100,
    Some(mock_datum()),
    redeemer,
    output_reference,
    tx,
  )
}
