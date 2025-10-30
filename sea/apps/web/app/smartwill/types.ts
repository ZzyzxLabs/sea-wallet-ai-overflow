export interface Cap {
  id: string;
  vault_id: string;
}

export interface CardItem {
  cap_id: string;
  willlist_id: string;
  list: string[];
  name: string;
}

export interface Willlist {
  id: string;
  name: string;
  list: string[];
}

export type Data = {
  status: string;
  blobId: string;
  endEpoch: string;
  suiRefType: string;
  suiRef: string;
  suiBaseUrl: string;
  blobUrl: string;
  suiUrl: string;
  isImage: string;
};

export type WalrusService = {
  id: string;
  name: string;
  publisherUrl: string;
  aggregatorUrl: string;
};
