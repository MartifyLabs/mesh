import { EventEmitter } from "events";

import { HYDRA_STATUS } from "./constants";
import { HydraStatus } from "./types";

export class HydraConnection extends EventEmitter {
  _websocket: WebSocket | undefined;
  _status: HydraStatus = HYDRA_STATUS.IDLE;
  _websocketUrl: string;
  private readonly _eventEmitter: EventEmitter;
  private _connected: boolean = false;

  constructor({
    url,
    eventEmitter,
    history = false,
    address,
  }: {
    url: string;
    eventEmitter: EventEmitter;
    history?: boolean;
    address?: string;
  }) {
    super();
    const wsUrl = url.replace("http", "ws");
    const _history = `history=${history ? "yes" : "no"}`;
    const _address = address ? `&address=${address}` : "";
    this._websocketUrl = `${wsUrl}/?${_history}${_address}`;
    this._eventEmitter = eventEmitter;
  }

  async connect() {
    if (this._status !== HYDRA_STATUS.IDLE) {
      return;
    }

    this._websocket = new WebSocket(this._websocketUrl);
    this._status = HYDRA_STATUS.CONNECTING;

    this._websocket.onopen = () => {
      console.log("Connected to Hydra");
      this._connected = true;
    };
    this._websocket.onerror = (error) => {
      console.error(`Hydra error: ${error}`);
    };
    this._websocket.onclose = (code) => {
      console.error("Hydra websocket closed", code);
    };
    this._websocket.onmessage = (data) => {
      const message = JSON.parse(data.data as string);
      this._eventEmitter.emit("onmessage", message);
      this.processStatus(message);
    };
  }

  async disconnect() {
    if (this._status === HYDRA_STATUS.IDLE) {
      return;
    }

    if (this._websocket && this._websocket.readyState === WebSocket.OPEN) {
      this._websocket.close(1007);
    }

    this._status = HYDRA_STATUS.IDLE;
  }

  send(data: any): void {
    if (this._connected) {
      this._websocket?.send(JSON.stringify(data));
    }
  }

  async processStatus(message: {}) {
    function getStatus(data: any): HydraStatus | null {
      switch (data.headStatus) {
        case "Open":
          return HYDRA_STATUS.OPEN;
      }

      switch (data.tag) {
        case "HeadIsInitializing":
          return HYDRA_STATUS.INITIALIZING;
        case "HeadIsOpen":
          return HYDRA_STATUS.OPEN;
        case "HeadIsClosed":
          return HYDRA_STATUS.CLOSED;
        case "ReadyToFanout":
          return HYDRA_STATUS.FANOUT_POSSIBLE;
        case "HeadIsFinalized":
          return HYDRA_STATUS.FINAL;
        default:
          return null;
      }
    }

    let status: HydraStatus | null = null;
    if ((status = getStatus(message)) && status !== null) {
      this._status = status;
      this._eventEmitter.emit("onstatuschange", status);
    }
  }
}
