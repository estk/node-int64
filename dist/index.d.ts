/// <reference types="@types/node" />
export default class Int64 {
    static MAX_INT: number;
    static MIN_INT: number;
    buffer: Buffer;
    offset: number;
    constructor(a1: Buffer, offset?: number);
    constructor(a1: string);
    constructor(a1: number);
    constructor(a1: number, a2?: number);
    private _2scomp();
    setValue(hi: string): void;
    setValue(hi: number): void;
    setValue(hi: number, lo: number): void;
    toNumber(allowImprecise?: boolean): number;
    valueOf(): number;
    toString(radix?: number): string;
    toOctetString(sep?: string): string;
    toBuffer(rawBuffer?: boolean): Buffer;
    copy(targetBuffer: Buffer, targetOffset?: number): void;
    compare(other: Int64): number;
    equals(other: Int64): boolean;
    inspect(): string;
}
