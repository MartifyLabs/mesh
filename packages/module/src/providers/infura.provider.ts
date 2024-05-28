import axios, { AxiosInstance } from 'axios';
import { IUploader } from '../common/contracts/index.js';
import { parseHttpError } from '../common/utils/index.js';

export class InfuraProvider implements IUploader {
  private _axiosInstance: AxiosInstance;

  constructor(
    projectId: string,
    projectSecret: string,
    options: Partial<CreateInfuraProviderOptions>
  ) {
    const host = options.host ?? 'ipfs.infura.io';
    const port = options.port ?? 5001;
    const version = options.version ?? 0;

    this._axiosInstance = axios.create({
      baseURL: `https://${host}:${port}/api/v${version}`,
      auth: { username: projectId, password: projectSecret },
    });
  }

  async uploadContent(content: FormData, recursive = false): Promise<string> {
    try {
      const headers = { 'Content-Type': 'multipart/form-data' };
      const { data, status } = await this._axiosInstance.post(
        `add?recursive=${recursive}`,
        content,
        { headers }
      );

      if (status === 200) return data;

      throw parseHttpError(data);
    } catch (error) {
      throw parseHttpError(error);
    }
  }
}

type CreateInfuraProviderOptions = {
  host: string;
  port: number;
  version: number;
};
