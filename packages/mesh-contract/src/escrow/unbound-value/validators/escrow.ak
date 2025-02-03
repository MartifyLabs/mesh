use cardano/address.{Address}
use cardano/assets.{AssetName, PolicyId, from_asset_list, merge}
use cardano/transaction.{InlineDatum, OutputReference, Transaction, find_input}
use cocktail.{
  address_pub_key, all_key_signed, get_all_value_to, inputs_at, key_signed,
  one_of_keys_signed, outputs_at, value_geq,
}

pub type MValue =
  Pairs<PolicyId, Pairs<AssetName, Int>>

pub type EscrowDatum {
  Initiation { initiator: Address, initiator_assets: MValue }
  ActiveEscrow {
    initiator: Address,
    initiator_assets: MValue,
    recipient: Address,
    recipient_assets: MValue,
  }
}

pub type EscrowRedeemer {
  RecipientDeposit { recipient: Address, recipient_assets: MValue }
  CancelTrade
  CompleteTrade
}

validator escrow {
  spend(
    _datum: Option<EscrowDatum>,
    redeemer: EscrowRedeemer,
    input: OutputReference,
    tx: Transaction,
  ) {
    let Transaction { inputs, outputs, extra_signatories, .. } = tx
    expect Some(own_input) = find_input(inputs, input)
    let own_address = own_input.output.address
    when redeemer is {
      RecipientDeposit { recipient, recipient_assets } -> {
        expect ([input], [output]) =
          (inputs_at(inputs, own_address), outputs_at(outputs, own_address))
        // Only 1 input & output from same address
        expect InlineDatum(raw_input_datum) = input.output.datum
        expect InlineDatum(raw_output_datum) = output.datum
        expect Initiation { initiator, initiator_assets }: EscrowDatum =
          raw_input_datum
        expect output_datum: EscrowDatum = raw_output_datum
        let is_datum_updated =
          output_datum == ActiveEscrow {
            initiator,
            recipient,
            initiator_assets,
            recipient_assets,
          }
        let is_value_deposited =
          value_geq(
            output.value,
            input.output.value
              |> merge(recipient_assets |> from_asset_list()),
          )
        is_datum_updated && is_value_deposited
      }
      CancelTrade -> {
        expect ([input], []) =
          (inputs_at(inputs, own_address), outputs_at(outputs, own_address))
        expect InlineDatum(raw_input_datum) = input.output.datum
        expect input_datum: EscrowDatum = raw_input_datum
        when input_datum is {
          Initiation { initiator, .. } -> {
            expect Some(pub_key) = address_pub_key(initiator)
            key_signed(extra_signatories, pub_key)
          }

          ActiveEscrow {
            initiator,
            recipient,
            initiator_assets,
            recipient_assets,
          } -> {
            let initiator_received = get_all_value_to(outputs, initiator)
            let recipient_received = get_all_value_to(outputs, recipient)
            let is_initiator_received_value =
              value_geq(
                initiator_received,
                initiator_assets |> from_asset_list(),
              )
            let is_recipient_received_value =
              value_geq(
                recipient_received,
                recipient_assets |> from_asset_list(),
              )
            expect Some(initiator_pub_key) = address_pub_key(initiator)
            expect Some(recipient_pub_key) = address_pub_key(recipient)
            let is_any_party_signed =
              one_of_keys_signed(
                extra_signatories,
                [initiator_pub_key, recipient_pub_key],
              )
            is_any_party_signed && is_initiator_received_value && is_recipient_received_value
          }
        }
      }
      CompleteTrade -> {
        expect ([input], []) =
          (inputs_at(inputs, own_address), outputs_at(outputs, own_address))
        expect InlineDatum(raw_input_datum) = input.output.datum
        expect ActiveEscrow {
          initiator,
          recipient,
          initiator_assets,
          recipient_assets,
        }: EscrowDatum = raw_input_datum
        let initiator_received = get_all_value_to(outputs, initiator)
        let recipient_received = get_all_value_to(outputs, recipient)
        let is_initiator_received_value =
          value_geq(initiator_received, recipient_assets |> from_asset_list())
        let is_recipient_received_value =
          value_geq(recipient_received, initiator_assets |> from_asset_list())
        expect Some(initiator_pub_key) = address_pub_key(initiator)
        expect Some(recipient_pub_key) = address_pub_key(recipient)
        let is_both_parties_signed =
          all_key_signed(
            extra_signatories,
            [initiator_pub_key, recipient_pub_key],
          )
        is_both_parties_signed && is_initiator_received_value && is_recipient_received_value
      }
    }
  }

  else(_) {
    fail
  }
}
