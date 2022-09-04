declare class QrcodeReader {
	callback(error: string, result: { result: string, points: any[]; }): void;
	decode(data: string): void;
}

declare module 'qrcode-reader' {
	export = QrcodeReader;
}