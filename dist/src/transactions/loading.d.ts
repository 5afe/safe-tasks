import { EventTx } from './types';
export interface DecodedMultisigTx {
    to: string;
    value: string;
    data: string;
    operation: number;
    safeTxGas: string;
    baseGas: string;
    gasPrice: string;
    gasToken: string;
    refundReceiver: string;
    signatures: string;
}
export declare const loadHistoryTxs: (account: string, start: number) => Promise<EventTx[]>;
