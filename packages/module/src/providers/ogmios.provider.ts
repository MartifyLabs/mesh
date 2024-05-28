import { SUPPORTED_OGMIOS_LINKS } from '../common/constants.js';
import { IEvaluator, ISubmitter } from '../common/contracts/index.js';
import { Action, isNetwork, Network } from '../common/types/index.js';

export class OgmiosProvider implements IEvaluator, ISubmitter {
  private readonly _baseUrl: string;

  constructor(baseUrl: string);
  constructor(network: Network);

  constructor(...args: unknown[]) {
    this._baseUrl = isNetwork(args[0])
      ? SUPPORTED_OGMIOS_LINKS[args[0]]
      : (args[0] as string);
  }

  async evaluateTx(tx: string): Promise<Omit<Action, 'data'>[]> {
    const client = await this.open();

    this.send(client, 'EvaluateTx', {
      evaluate: tx,
    });

    return new Promise((resolve, reject) => {
      client.addEventListener(
        'message',
        (response: MessageEvent<string>) => {
          try {
            const { result } = JSON.parse(response.data);

            if (result.EvaluationResult) {
              resolve(
                Object.keys(result.EvaluationResult).map(
                  (key) =>
                    <Omit<Action, 'data'>>{
                      index: parseInt(key.split(':')[1], 10),
                      tag: key.split(':')[0].toUpperCase(),
                      budget: {
                        mem: result.EvaluationResult[key].memory,
                        steps: result.EvaluationResult[key].steps,
                      },
                    }
                )
              );
            } else {
              reject(result.EvaluationFailure);
            }

            client.close();
          } catch (error) {
            reject(error);
          }
        },
        { once: true }
      );
    });
  }

  async onNextTx(callback: (tx: unknown) => void): Promise<() => void> {
    const client = await this.open();

    this.send(client, 'AwaitAcquire', {});

    client.addEventListener('message', (response: MessageEvent<string>) => {
      const { result } = JSON.parse(response.data);

      if (result === null) {
        return this.send(client, 'AwaitAcquire', {});
      }

      if (result.AwaitAcquired === undefined) {
        callback(result);
      }

      this.send(client, 'NextTx', {});
    });

    return () => client.close();
  }

  async submitTx(tx: string): Promise<string> {
    const client = await this.open();

    this.send(client, 'SubmitTx', {
      submit: tx,
    });

    return new Promise((resolve, reject) => {
      client.addEventListener(
        'message',
        (response: MessageEvent<string>) => {
          try {
            const { result } = JSON.parse(response.data);

            if (result.SubmitSuccess) {
              resolve(result.SubmitSuccess.txId);
            } else {
              reject(result.SubmitFail);
            }

            client.close();
          } catch (error) {
            reject(error);
          }
        },
        { once: true }
      );
    });
  }

  private async open(): Promise<WebSocket> {
    const client = new WebSocket(this._baseUrl);

    await new Promise((resolve) => {
      client.addEventListener('open', () => resolve(true), { once: true });
    });

    return client;
  }

  private send(client: WebSocket, methodname: string, args: unknown) {
    client.send(
      JSON.stringify({
        version: '1.0',
        type: 'jsonwsp/request',
        servicename: 'ogmios',
        methodname,
        args,
      })
    );
  }
}
