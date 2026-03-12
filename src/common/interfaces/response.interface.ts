export interface IMeta {
  totalCounts: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface IBaseResponse {
  message: string;
  statusCode: number;
}

export interface IBaseResponseData<T> extends IBaseResponse {
  data: T;
}

export interface IResponseWithPaginate<T> extends IBaseResponse {
  data: T;
  meta?: IMeta;
  pagination?: IMeta;
}

export interface IOption {
  value: string;
  label: string;
  extra?: string;
}
