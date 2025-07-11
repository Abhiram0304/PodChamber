import axios from "axios";
import type { AxiosRequestConfig, AxiosResponse, Method } from "axios";

export const axiosinstance = axios.create({});

interface APIConnectorOptions {
  method: Method;
  url: string;
  bodyData?: any;
  headers?: Record<string, string>;
  params?: Record<string, any>;
}

const APIconnector = <T = any>({
  method,
  url,
  bodyData,
  headers,
  params,
}: APIConnectorOptions): Promise<AxiosResponse<T>> => {
  const config: AxiosRequestConfig = {
    method,
    url,
    data: bodyData || null,
    headers: headers || undefined,
    params: params || undefined,
  };

  return axiosinstance(config);
};

export default APIconnector;