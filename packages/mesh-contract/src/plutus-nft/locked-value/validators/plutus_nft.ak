use aiken/primitive/bytearray.{concat}
use cardano/assets.{PolicyId}
use cardano/transaction.{InlineDatum, Input, Transaction}
use cocktail.{
  check_policy_only_burn, convert_int_to_bytes, inputs_with_policy,
  only_minted_token,
}
use oracle.{OracleDatum}

pub type MintPolarity {
  RMint
  RBurn
}

validator plutus_nft(collection_name: ByteArray, oracle_nft: PolicyId) {
  mint(redeemer: MintPolarity, policy_id: PolicyId, tx: Transaction) {
    when redeemer is {
      RMint -> {
        let Transaction { inputs, mint, .. } = tx
        expect [auth_input] = inputs_with_policy(inputs, oracle_nft)
        expect InlineDatum(input_datum) = auth_input.output.datum
        expect OracleDatum { count, .. }: OracleDatum = input_datum
        let asset_name =
          collection_name
            |> concat(" (")
            |> concat(convert_int_to_bytes(count))
            |> concat(")")
        only_minted_token(mint, policy_id, asset_name, 1)
      }

      RBurn -> check_policy_only_burn(tx.mint, policy_id)
    }
  }

  else(_) {
    fail
  }
}
