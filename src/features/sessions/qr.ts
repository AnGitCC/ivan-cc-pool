import QRCode from "qrcode";

export async function buildShareQrDataUrl(url: string) {
  return QRCode.toDataURL(url, {
    width: 320,
    margin: 1,
  });
}
